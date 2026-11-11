# Power BI — Plan de escalabilidad

Plan para evolucionar el consumo de Power BI del MVP actual hacia una arquitectura que soporte ≥500 usuarios concurrentes sin tocar los límites del service principal ni del dataset.

Estado actual: MVP funcional (Edge Functions `powerbi-execute-query`, `powerbi-embed-token`, `powerbi-list-reports` + hooks TanStack Query). Escala estimada hoy: **~17 usuarios concurrentes** antes de empezar a recibir `429` de Power BI.

---

## Límites duros de Power BI que condicionan el diseño

- `executeQueries`: **120 req/min por service principal**.
- Respuesta máxima: **100k filas o 15MB**.
- Concurrencia: **15 req simultáneas por SP**.
- `embedToken`: TTL **~1h**, necesita refresh proactivo.
- Capacidad: si el workspace **no es PPU/Premium**, los límites son más agresivos (XMLA endpoint deshabilitado, throttling más temprano).

---

## Problemas identificados (ordenados por severidad)

### 1. N+1 de DAX queries — CRÍTICO

Cada `usePowerBIMeasure` / `usePowerBITimeSeries` dispara su propia llamada al Edge Function → su propia llamada a `executeQueries`.

Ejemplo: pantalla con 6 cards de métrica + 1 timeseries = **7 requests por usuario por carga**.
- 20 usuarios × 7 = 140 req/min → excede el límite del SP.
- El throttle empieza ~17 usuarios simultáneos.

### 2. Sin cache server-side

El `staleTime: 5min` de TanStack Query es **por cliente**. 50 usuarios abriendo la misma pantalla = 50 `executeQueries` idénticos contra PBI.

### 3. `TOKEN_CACHE` per-isolate

Los isolates de Deno (Edge Functions) son efímeros. Cada cold start = nuevo `POST /oauth2/v2.0/token`. En picos, 10 isolates concurrentes = 10 token requests redundantes (token stampede).

### 4. Vault leído por DB en cada request

`starcorp_vault` devuelve 3 secretos Azure que no cambian. Agrega +30–80ms por invocación. No hay justificación real de "rotar sin redeploy": rotar un secret Azure obliga a invalidar el `TOKEN_CACHE`, que está per-isolate → redeploy igual.

### 5. Otros menores

- Sin retry/backoff ante `429` → el error se propaga crudo al cliente.
- `console.error(err)` loguea el objeto completo (puede incluir DAX ruidoso en logs).
- Query keys de TanStack incluyen el DAX completo → cache key infla si el DAX se parametriza.
- `usePowerBIEmbed` no maneja refresh automático: si el usuario permanece 2h en la pantalla, el WebView rompe cuando expira el token.

---

## Roadmap por fases

### Fase 1 — Mover secretos Azure a `supabase secrets` (1h)

**Objetivo:** eliminar I/O de DB en cada request.

```bash
supabase secrets set AZURE_TENANT_ID=...
supabase secrets set AZURE_CLIENT_ID=...
supabase secrets set AZURE_CLIENT_SECRET=...
```

En el Edge Function:

```ts
const AZURE_TENANT_ID = Deno.env.get("AZURE_TENANT_ID")!;
const AZURE_CLIENT_ID = Deno.env.get("AZURE_CLIENT_ID")!;
const AZURE_CLIENT_SECRET = Deno.env.get("AZURE_CLIENT_SECRET")!;
```

Borrar el `.select` a `starcorp_vault` de las 3 Edge Functions. Mantener la tabla para otros secretos (QuickBooks refresh tokens).

**Impacto:** −50ms/request, −1 query DB por invocación.

### Fase 2 — Cache server-side de resultados DAX (4–6h) — MÁXIMO ROI

**Objetivo:** reducir llamadas a PBI un ~90%.

Tabla:

```sql
-- supabase/migrations/000X_pbi_query_cache.sql
create table pbi_query_cache (
  key         text primary key,       -- sha256(datasetId + daxQuery + groupId)
  value       jsonb not null,
  expires_at  timestamptz not null,
  created_at  timestamptz default now()
);

create index on pbi_query_cache (expires_at);

alter table pbi_query_cache enable row level security;
create policy "no client access" on pbi_query_cache for all using (false);
```

Lógica en `powerbi-execute-query`:

1. Calcular `key = sha256(datasetId + daxQuery + groupId)`.
2. `SELECT value FROM pbi_query_cache WHERE key = $1 AND expires_at > now()`.
3. Si hit → devolver `value` directo, header `X-Cache: HIT`.
4. Si miss → llamar PBI, `UPSERT` con TTL 5min, devolver, header `X-Cache: MISS`.

Limpieza: job pg_cron diario `DELETE FROM pbi_query_cache WHERE expires_at < now() - interval '1 day'`.

**Alternativa Redis/Upstash:** menos latencia, sin I/O Postgres, TTL nativo. Preferible si llegamos a 100+ usuarios concurrentes.

**Impacto:** con 50 usuarios en la misma pantalla → 1 request PBI en vez de 50.

### Fase 3 — Token Azure compartido entre isolates (2h)

**Objetivo:** evitar token stampede.

Tabla:

```sql
create table azure_token_cache (
  id          int primary key default 1,
  token       text not null,
  expires_at  timestamptz not null,
  updated_at  timestamptz default now(),
  constraint singleton check (id = 1)
);
```

Lógica con lock optimista:

1. Leer fila → si `expires_at > now() + 1min` usar el token.
2. Si expirado o ausente → `SELECT ... FOR UPDATE SKIP LOCKED` (solo un isolate gana el lock).
3. El ganador pide token a Azure, hace `UPSERT`, libera.
4. Los perdedores esperan 100ms y reintentan la lectura.

**Impacto:** 1 token request cada ~55min a través de todos los isolates.

### Fase 4 — Batch DAX: una query por pantalla (6–8h)

**Objetivo:** reducir requests PBI un ~85%.

Dos opciones:

**(A) DAX consolidado** — un solo DAX que devuelve todas las métricas de la pantalla:

```dax
EVALUATE
UNION(
  ROW("metric", "revenue_total", "value", [Total Revenue]),
  ROW("metric", "expense_total", "value", [Total Expense]),
  ROW("metric", "profit_margin", "value", [Profit Margin])
)
```

Hook nuevo `usePowerBIDashboard({ datasetId, groupId, screen: 'dashboard' })` que recibe todo y hace fan-out en cliente a cada card.

**(B) Batch endpoint** — `powerbi-batch-query` que acepta `{ queries: [{ id, dax }, ...] }` y devuelve `{ [id]: result }`. Internamente manda N llamadas paralelas pero con lock de concurrencia (máx 10) + cache de fase 2.

Recomendación: (A) para pantallas fijas (dashboard), (B) para pantallas dinámicas donde el set de queries cambia.

**Impacto:** 6 cards → 1 request. Combinado con fase 2, el sistema aguanta 500+ usuarios concurrentes.

### Fase 5 — Retry con backoff ante `429` (2h)

**Objetivo:** resiliencia cuando PBI tira throttle.

En el Edge Function:

```ts
async function fetchWithRetry(url: string, opts: RequestInit, maxRetries = 3) {
  for (let i = 0; i <= maxRetries; i++) {
    const res = await fetch(url, opts);
    if (res.status !== 429 || i === maxRetries) return res;
    const retryAfter = Number(res.headers.get("Retry-After") ?? 2 ** i);
    await new Promise(r => setTimeout(r, retryAfter * 1000));
  }
  throw new Error("unreachable");
}
```

Cliente: surfacear estado `isFetching` + toast "Reintentando…" si el retry pasa de 2s.

### Fase 6 — Refresh automático de `embedToken` (3h)

**Objetivo:** no romper el WebView en sesiones largas.

Cambios:
- `usePowerBIEmbed`: bajar `staleTime` a 50min (antes de los 55), activar `refetchInterval: 50 * 60 * 1000`.
- Cuando TanStack Query devuelve un `embedToken` nuevo, enviar un evento al WebView vía `postMessage` para que el script `powerbi-client` haga `report.setAccessToken(newToken)` sin recargar.

---

## Tabla de impacto por fase

| Fase | Esfuerzo | Impacto                          | Capacidad tras aplicar |
|------|----------|----------------------------------|------------------------|
| 1    | 1h       | −50ms/req, −1 DB query           | ~20 usuarios          |
| 2    | 4–6h     | −90% requests a PBI              | ~200 usuarios         |
| 3    | 2h       | Elimina token stampede           | ~250 usuarios         |
| 4    | 6–8h     | −85% requests/usuario            | **~500+ usuarios**    |
| 5    | 2h       | Resiliencia ante 429             | estabilidad           |
| 6    | 3h       | Fix sesiones >1h                 | UX                    |

**Prioridad sugerida:** 1 → 2 → 4 → 5 → 3 → 6. Fases 1+2+4 son el 80% del ROI.

---

## Métricas a instrumentar antes de empezar

Para medir impacto real, agregar logging estructurado en el Edge Function:

- `duration_ms` total.
- `azure_token_cached` (bool).
- `pbi_cache_hit` (bool, una vez fase 2 esté en pie).
- `pbi_status` (código HTTP de PBI).
- `dataset_id`, `group_id`.
- `user_id` (del JWT, hash).

Queryable desde `supabase/functions/_logs` o exportado a Supabase Logs. Sin esto, no sabemos si una fase realmente movió la aguja.

---

## Checklist de validación por fase

- [ ] Fase 1: `supabase secrets list` muestra los 3 `AZURE_*`; Edge Function ya no lee `starcorp_vault`.
- [ ] Fase 2: segunda invocación del mismo DAX en <5min devuelve `X-Cache: HIT`; tabla tiene fila con `expires_at` correcto.
- [ ] Fase 3: `SELECT * FROM azure_token_cache` muestra 1 fila; ataque de carga con 10 cold starts simultáneos hace 1 solo request a Azure.
- [ ] Fase 4: monitor de Network muestra 1 request por pantalla (no 6+).
- [ ] Fase 5: forzar 429 (k6 o similar) → cliente recibe datos en ≤3s, no error.
- [ ] Fase 6: dejar la app abierta 70min → reporte no rompe; devtools confirma refetch a los 50min.

---

## Referencias

- Guía actual: `docs/power-bi-integration.md`.
- Edge Functions: `supabase/functions/powerbi-*`.
- Hooks: `src/hooks/queries/use-powerbi-*.ts`.
- Límites oficiales PBI: https://learn.microsoft.com/power-bi/developer/embedded/embedded-capacity-limits.
