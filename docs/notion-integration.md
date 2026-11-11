# Notion — Guía de conexión y extracción de un tablero

Guía paso a paso para conectar la app Starcorp (Expo / React Native) a un **tablero (database) de Notion** y traer sus filas. Alineada con `CLAUDE.md` + `SKILL.md`: **el cliente nunca llama a `api.notion.com` directo**; toda petición pasa por una Supabase Edge Function que valida el JWT del usuario y rehidrata el token desde `starcorp_vault`.

> **Tablero en Notion = "database"**. Las vistas "Board", "Table", "Gallery", "Calendar" son solo formas de visualizar el mismo database. La API expone el database; el tipo de vista es irrelevante para extraer datos.

---

## 0. Arquitectura objetivo

```
┌─────────┐     JWT Supabase + database_id      ┌──────────────────────┐
│  App RN │ ──────────────────────────────────▶ │ Edge Fn: notion-query│
└─────────┘                                     │  - valida JWT        │
     ▲                                          │  - lee NOTION_TOKEN  │
     │  filas normalizadas                      │    desde vault       │
     │                                          │  - pagina si hace    │
     │                                          │    falta             │
     │                                          └──────────┬───────────┘
     │                                                     │ Bearer + Notion-Version
     │                                                     ▼
     │                                          ┌──────────────────────┐
     │                                          │   api.notion.com     │
     └─── JSON ─────────────────────────────────│   /v1/databases/...  │
                                                └──────────────────────┘
```

**Por qué proxy** (no llamar Notion directo desde el cliente):
1. El secret (`NOTION_TOKEN` / `client_secret` OAuth) no puede vivir en el bundle de la app.
2. Notion rechaza CORS para llamadas browser → en web no funcionaría sin proxy.
3. Centraliza paginación, rate-limit y normalización.

---

## 1. Decidir tipo de integración

| Tipo | Cuándo usarlo | Esfuerzo |
|------|---------------|----------|
| **Internal Integration** (recomendado para arrancar) | Un solo workspace de Notion (el de Starcorp). Todos los usuarios de la app comparten el mismo token. | Bajo — 1 token, sin OAuth. |
| **Public Integration (OAuth 2.0)** | Cada usuario de la app conecta su propio workspace de Notion. | Alto — OAuth flow, tabla de tokens por usuario, refresh manejado por Notion (no rota). |

El resto del doc cubre **Internal**. Al final hay una sección §12 con los deltas para migrar a OAuth si llega ese requerimiento.

---

## 2. Pre-requisitos

- Cuenta admin en el workspace de Notion donde vive el tablero.
- Proyecto Supabase con tabla `starcorp_vault` (ver `docs/quickbooks-integration.md` §3 o `docs/power-bi-integration.md` §3.1).
- `supabase` CLI instalada y logueada (`supabase login`, `supabase link --project-ref <ref>`).

No hace falta instalar paquetes en el cliente — el cliente solo hace `fetch` a la Edge Function.

---

## 3. Crear la Internal Integration en Notion

1. Ir a [notion.so/my-integrations](https://www.notion.so/my-integrations) → **New integration**.
2. Configuración:
   - **Name**: `starcorp`
   - **Associated workspace**: el workspace donde vive el tablero.
   - **Type**: `Internal`
3. **Capabilities** — marcar solo lo que necesitas. Para leer un tablero:
   - `Read content` ✓
   - `Read user information without email` ✓ (necesario si vas a leer la propiedad `People` o `Created by`)
   - `Update content` / `Insert content` → solo si la app va a escribir; por defecto, **no**.
4. **Save** → copiar el **Internal Integration Secret** (`secret_xxx...`). Este es el `NOTION_TOKEN`.

> El token **no expira** y no rota. Si se filtra, regenerarlo desde la misma página invalida el viejo.

---

## 4. Compartir el tablero con la integración

> **Paso fácil de olvidar**. Sin esto, la API devuelve `404 object_not_found` aunque el token sea válido.

1. Abrir el tablero (database) en Notion.
2. Click en `...` arriba a la derecha → **Connections** → **Add connections**.
3. Buscar `starcorp` y autorizar.

Repetir para cada tablero/página que la integración deba ver. Notion no tiene "compartir todo el workspace" — es explícito por recurso.

---

## 5. Obtener el `database_id` del tablero

Abrir el tablero como página full → copiar URL:

```
https://www.notion.so/<workspace>/abc123def456...?v=xyz
                                  └─────┬──────┘
                                   database_id
```

Son los 32 caracteres antes del `?`. La API acepta ambos formatos (con o sin guiones).

---

## 6. Guardar credenciales en Supabase

```sql
insert into starcorp_vault (key, value) values
  ('NOTION_TOKEN',     'secret_xxx...'),
  ('NOTION_TABLERO_ID', 'abc123def456...')
on conflict (key) do update set value = excluded.value, updated_at = now();
```

> Si vas a leer **varios** tableros, usa una sola key con JSON, ej. `NOTION_DATABASES = {"ventas": "...", "leads": "..."}`. Mantiene el vault limpio.

---

## 7. Edge Function — `notion-query`

```ts
// supabase/functions/notion-query/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2';

const NOTION_VERSION = '2022-06-28';   // anclar versión: Notion versiona breaking changes
const NOTION_BASE = 'https://api.notion.com/v1';

Deno.serve(async (req) => {
  try {
    // 1. Validar JWT del usuario
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response('Missing auth', { status: 401 });

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await admin.auth.getUser();
    if (!user) return new Response('Invalid JWT', { status: 401 });

    // 2. Parsear request del cliente
    const body = await req.json() as {
      database_id?: string;                         // override opcional
      filter?: Record<string, unknown>;             // Notion filter object
      sorts?: Array<Record<string, unknown>>;
      page_size?: number;                           // 1..100
      start_cursor?: string;                        // para paginar desde el cliente
      fetch_all?: boolean;                          // true → la fn pagina todo (cuidado con CPU)
    };

    // 3. Leer token + database por defecto
    const { data: vault } = await admin.from('starcorp_vault')
      .select('key,value')
      .in('key', ['NOTION_TOKEN', 'NOTION_TABLERO_ID']);
    const kv = Object.fromEntries((vault ?? []).map((r) => [r.key, r.value]));
    if (!kv.NOTION_TOKEN) return new Response('Token no configurado', { status: 500 });

    const databaseId = body.database_id ?? kv.NOTION_TABLERO_ID;
    if (!databaseId) return new Response('database_id requerido', { status: 400 });

    // 4. Helper para una página de resultados
    const queryPage = async (cursor?: string) => {
      const res = await fetch(`${NOTION_BASE}/databases/${databaseId}/query`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${kv.NOTION_TOKEN}`,
          'Notion-Version': NOTION_VERSION,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filter: body.filter,
          sorts: body.sorts,
          page_size: Math.min(body.page_size ?? 100, 100),
          start_cursor: cursor,
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        throw new Response(`Notion ${res.status}: ${txt}`, { status: 502 });
      }
      return res.json() as Promise<{
        results: unknown[];
        has_more: boolean;
        next_cursor: string | null;
      }>;
    };

    // 5. Una página vs. todas
    if (!body.fetch_all) {
      const data = await queryPage(body.start_cursor);
      return Response.json(data);
    }

    // CUIDADO: agregar todo en una sola invocación choca con el CPU cap (~25-30s).
    // Para tableros chicos (<1k filas) está bien; para más, paginar desde el cliente.
    const all: unknown[] = [];
    let cursor: string | undefined = body.start_cursor;
    let pages = 0;
    do {
      const page = await queryPage(cursor);
      all.push(...page.results);
      cursor = page.next_cursor ?? undefined;
      pages++;
      if (pages > 20) break; // hard stop ~2k filas
    } while (cursor);

    return Response.json({ results: all, has_more: !!cursor, next_cursor: cursor ?? null });
  } catch (err) {
    if (err instanceof Response) return err;
    console.error(err);
    return new Response('Internal error', { status: 500 });
  }
});
```

Deploy (validando JWT — el endpoint solo lo usan usuarios autenticados):

```bash
supabase functions deploy notion-query
```

> El CPU cap de Edge Functions de Supabase mata silenciosamente a los ~25–30s (status 546). Para tableros >2k filas, paginar desde el cliente con `start_cursor` en lugar de `fetch_all: true`.

---

## 8. Cliente — Service + Hook TanStack Query

### 8.1 Tipos del tablero

Cada tablero tiene su propio shape. Definir los tipos en `src/types/api.types.ts`:

```ts
// src/types/api.types.ts (agregar)

/** Wrapper estándar de un row de Notion database query. */
export interface NotionPage {
  id: string;
  created_time: string;
  last_edited_time: string;
  url: string;
  properties: Record<string, NotionProperty>;
}

/** Unión discriminada por `type`. Agregar variantes según las props del tablero. */
export type NotionProperty =
  | { id: string; type: 'title';        title:        Array<{ plain_text: string }> }
  | { id: string; type: 'rich_text';    rich_text:    Array<{ plain_text: string }> }
  | { id: string; type: 'number';       number:       number | null }
  | { id: string; type: 'select';       select:       { id: string; name: string; color: string } | null }
  | { id: string; type: 'multi_select'; multi_select: Array<{ id: string; name: string; color: string }> }
  | { id: string; type: 'status';       status:       { id: string; name: string; color: string } | null }
  | { id: string; type: 'date';         date:         { start: string; end: string | null } | null }
  | { id: string; type: 'checkbox';     checkbox:     boolean }
  | { id: string; type: 'url';          url:          string | null }
  | { id: string; type: 'email';        email:        string | null }
  | { id: string; type: 'people';       people:       Array<{ id: string; name?: string }> }
  | { id: string; type: 'relation';     relation:     Array<{ id: string }> };

export interface NotionQueryResponse {
  results: NotionPage[];
  has_more: boolean;
  next_cursor: string | null;
}
```

### 8.2 Service

```ts
// src/services/notion/client.ts
import { useAuthStore } from '@/stores/auth.store';
import type { NotionQueryResponse } from '@/types/api.types';

const URL  = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export interface NotionQueryParams {
  database_id?: string;
  filter?: Record<string, unknown>;
  sorts?: Array<Record<string, unknown>>;
  page_size?: number;
  start_cursor?: string;
  fetch_all?: boolean;
}

export async function notionQuery(params: NotionQueryParams = {}): Promise<NotionQueryResponse> {
  const jwt = useAuthStore.getState().supabaseJwt;
  if (!jwt) throw new Error('not authenticated');

  const res = await fetch(`${URL}/functions/v1/notion-query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
      apikey: ANON,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  });
  if (!res.ok) throw new Error(`Notion ${res.status}: ${await res.text()}`);
  return res.json();
}
```

### 8.3 Normalizer (raw → domain)

No pases `NotionPage[]` a los componentes. Aplana las propiedades:

```ts
// src/services/notion/normalize.ts
import type { NotionPage, NotionProperty } from '@/types/api.types';

/** Devuelve el valor "limpio" de una propiedad de Notion. */
function pickValue(p: NotionProperty | undefined): unknown {
  if (!p) return null;
  switch (p.type) {
    case 'title':        return p.title.map((t) => t.plain_text).join('');
    case 'rich_text':    return p.rich_text.map((t) => t.plain_text).join('');
    case 'number':       return p.number;
    case 'select':       return p.select?.name ?? null;
    case 'multi_select': return p.multi_select.map((s) => s.name);
    case 'status':       return p.status?.name ?? null;
    case 'date':         return p.date?.start ?? null;
    case 'checkbox':     return p.checkbox;
    case 'url':          return p.url;
    case 'email':        return p.email;
    case 'people':       return p.people.map((u) => u.name).filter(Boolean);
    case 'relation':     return p.relation.map((r) => r.id);
    default:             return null;
  }
}

export interface TableroRow {
  id: string;
  url: string;
  createdAt: string;
  updatedAt: string;
  [propName: string]: unknown;
}

export function normalizeTablero(pages: NotionPage[]): TableroRow[] {
  return pages.map((page) => {
    const flat: TableroRow = {
      id: page.id,
      url: page.url,
      createdAt: page.created_time,
      updatedAt: page.last_edited_time,
    };
    for (const [name, prop] of Object.entries(page.properties)) {
      flat[name] = pickValue(prop);
    }
    return flat;
  });
}
```

### 8.4 Hook TanStack Query

```ts
// src/hooks/queries/use-notion-tablero.ts
import { useQuery } from '@tanstack/react-query';
import { notionQuery, type NotionQueryParams } from '@/services/notion/client';
import { normalizeTablero, type TableroRow } from '@/services/notion/normalize';

export function useNotionTablero(params: NotionQueryParams = {}) {
  return useQuery({
    queryKey: ['notion', 'tablero', params],
    queryFn: async (): Promise<TableroRow[]> => {
      const raw = await notionQuery({ ...params, fetch_all: true });
      return normalizeTablero(raw.results);
    },
    staleTime: 5 * 60 * 1000,  // 5 min — convención del proyecto para datos financieros
  });
}
```

Registrar la key en `src/hooks/queries/query-keys.ts` para mantenerlas centralizadas.

### 8.5 Uso en un componente

```tsx
import { useNotionTablero } from '@/hooks/queries/use-notion-tablero';

export function TableroScreen() {
  const { data, isLoading, error } = useNotionTablero({
    sorts: [{ property: 'Fecha', direction: 'descending' }],
    filter: { property: 'Estado', status: { equals: 'Activo' } },
  });

  if (isLoading) return <Skeleton />;
  if (error) return <Text>Error: {error.message}</Text>;
  return <FlatList data={data} renderItem={({ item }) => <RowCard row={item} />} />;
}
```

---

## 9. Variables de entorno

### Cliente (`.env`)
```
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

No hay nada de Notion aquí — el token vive en `starcorp_vault`, accesible solo desde la Edge Function.

### Edge Function
Auto-inyectadas por Supabase: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

---

## 10. Filtros y sorts útiles

Sintaxis oficial: [developers.notion.com/reference/post-database-query-filter](https://developers.notion.com/reference/post-database-query-filter).

```ts
// Status = "En progreso" Y Fecha en los últimos 30 días
filter: {
  and: [
    { property: 'Estado', status: { equals: 'En progreso' } },
    { property: 'Fecha',  date:   { past_month: {} } },
  ],
}

// Multi-select contiene "Urgente"
filter: { property: 'Tags', multi_select: { contains: 'Urgente' } }

// Ordenar por número desc
sorts: [{ property: 'Monto', direction: 'descending' }]

// Ordenar por última edición
sorts: [{ timestamp: 'last_edited_time', direction: 'descending' }]
```

---

## 11. Checklist de validación

- [ ] Integration `starcorp` creada en notion.so/my-integrations.
- [ ] Tablero compartido con la integration (Connections → Add).
- [ ] `starcorp_vault` tiene `NOTION_TOKEN` y `NOTION_TABLERO_ID`.
- [ ] Edge Function `notion-query` deployada (sin `--no-verify-jwt`).
- [ ] `curl` directo a la Edge Function con un JWT válido devuelve 200 + `results`.
- [ ] El hook `useNotionTablero()` puebla la UI en dev.
- [ ] `staleTime: 5min` aplicado en el hook.
- [ ] No aparece `secret_` en el bundle: `npx expo export && grep -r "secret_" dist/`.
- [ ] No se loguean tokens en la Edge Function (`grep -r "console.*NOTION" supabase/functions/notion-query`).
- [ ] Tablero con >100 filas devuelve todas (paginación funciona).

---

## 12. Troubleshooting

| Síntoma | Causa |
|---------|-------|
| `404 object_not_found` con token válido | Tablero no compartido con la integration. Ir al tablero → Connections → Add. |
| `401 unauthorized` | `NOTION_TOKEN` mal copiado o regenerado. Releer de notion.so/my-integrations. |
| `400 validation_error` con `path.database_id` | El `database_id` no es UUID — copiar exactamente los 32 chars antes del `?` en la URL. |
| `429 rate_limited` | Notion limita ~3 req/s por integration. Throttlar en cliente o cachear en Supabase. |
| Edge Function timeout (status 546) | `fetch_all: true` en tablero grande. Paginar desde el cliente. |
| Propiedad aparece como `null` aunque tenga valor en Notion | Nombre case-sensitive y debe ser **exacto** al de Notion (incluye tildes y espacios). |
| Filter falla con `Could not find property` | Mismo motivo: usar el nombre exacto, no el `id` interno. |
| Body devuelto vacío en web pero ok en mobile | Probablemente CORS — confirma que el cliente pega contra la Edge Function, no contra `api.notion.com`. |

---

## 13. Migrar a OAuth público (cuando lo necesites)

Si en algún momento cada usuario debe conectar **su propio** workspace de Notion:

1. En notion.so/my-integrations → cambiar el tipo de la integration de `Internal` a `Public`. Notion entrega `OAuth client ID` + `OAuth client secret` + obliga a registrar `Redirect URI`.
2. Redirect URI: `https://<project-ref>.supabase.co/functions/v1/notion-oauth-callback`.
3. Crear tabla `notion_user_tokens` análoga a `qb_user_tokens` (ver `docs/quickbooks-integration.md` §4) — Notion **no rota refresh tokens** y el `access_token` no expira hasta que el usuario revoque, así que el schema es más simple:
   ```sql
   create table notion_user_tokens (
     user_id      uuid primary key references auth.users on delete cascade,
     workspace_id text not null,
     access_token text not null,
     bot_id       text not null,
     updated_at   timestamptz default now()
   );
   ```
4. Edge Function `notion-oauth-callback`: intercambia `code` por token en `POST https://api.notion.com/v1/oauth/token` con `Authorization: Basic base64(client_id:client_secret)`.
5. `notion-query` cambia el origen del token: en lugar de leer `NOTION_TOKEN` del vault, lee `access_token` de `notion_user_tokens` para el `user.id` autenticado.

El resto del cliente (hook, normalizer) no cambia.

---

## 14. Notas de seguridad

- El `NOTION_TOKEN` **solo** existe en `starcorp_vault`. Ni en `.env`, ni en el código, ni en logs.
- Capabilities de la integration: marcar **solo** lo que la app necesita. Si solo lees, no marques `Update content`.
- Si el token se filtra: regenerarlo desde notion.so/my-integrations (invalida el viejo de inmediato).
- La Edge Function valida JWT por defecto — no deployarla con `--no-verify-jwt`.
- En el Edge Function `console.log` puede aparecer en el dashboard de Supabase: nunca loguear `NOTION_TOKEN` ni headers crudos.
