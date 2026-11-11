# Power BI — Guía de conexión y extracción de datos

Guía end-to-end para conectar la app Starcorp (Expo / React Native) a Power BI y extraer datos de un dataset. Alineada con `CLAUDE.md` + `SKILL.md`: **el cliente nunca llama la API de Power BI**; toda petición pasa por una Supabase Edge Function que valida el JWT del usuario.

> Caso de uso de esta guía: **extraer filas de datos** (DAX / executeQueries) para alimentar charts propios en la app. Para embeber reportes renderizados en `WebView` ver la sección final "Anexo: embedToken para WebView".

---

## 0. Arquitectura objetivo

```
┌─────────────┐   JWT Supabase    ┌────────────────────────┐   Bearer Azure    ┌──────────────┐
│  App RN     │ ───────────────▶  │  Edge Function         │ ───────────────▶ │  Power BI    │
│ (TanStack Q)│                   │  powerbi-execute-query │                   │  REST API    │
└─────────────┘ ◀───── JSON ───── └────────────────────────┘ ◀──── rows ────── └──────────────┘
                                          │
                                          ▼
                               starcorp_vault (Supabase)
                               - azure_client_secret
                               - azure_tenant_id
                               - azure_client_id
```

---

## 1. Pre-requisitos

- Cuenta Power BI con **licencia Pro o PPU** en el tenant donde viven los datasets.
- Acceso admin al **Azure Portal** (`portal.azure.com`) para registrar la app.
- Acceso admin al **Power BI Admin Portal** (`app.powerbi.com/admin-portal/tenantSettings`).
- Proyecto Supabase creado (URL + anon key + service role key).
- `supabase` CLI instalado localmente (`npm i -g supabase`).

---

## 2. Registrar Service Principal en Azure AD

Usamos **service principal** (no delegado por usuario) porque es más simple para MVP y solo requiere un consentimiento del admin.

### 2.1 Crear la App Registration

1. Azure Portal → **Azure Active Directory** → **App registrations** → **New registration**.
2. Name: `starcorp-powerbi-proxy`.
3. Supported account types: **Accounts in this organizational directory only (single tenant)**.
4. Redirect URI: dejar vacío (no es app interactiva).
5. Register.

Anotar de la página overview:

- `Application (client) ID` → será `AZURE_CLIENT_ID`
- `Directory (tenant) ID` → será `AZURE_TENANT_ID`

### 2.2 Crear Client Secret

1. **Certificates & secrets** → **New client secret**.
2. Description: `starcorp-edge-fn`, Expires: 24 months.
3. Copiar el **Value** (solo se ve una vez) → será `AZURE_CLIENT_SECRET`.

### 2.3 API Permissions

1. **API permissions** → **Add a permission** → **Power BI Service**.
2. **Application permissions** (no delegated).
3. Marcar:
   - `Dataset.Read.All`
   - `Report.Read.All`
   - `Workspace.Read.All`
4. **Grant admin consent for <tenant>**. Estado debe quedar en verde.

### 2.4 Habilitar Service Principal en Power BI

Por defecto, Power BI ignora las apps de Azure aunque tengan permisos.

1. Power BI Admin Portal → **Tenant settings** → buscar _"Allow service principals to use Power BI APIs"_.
2. **Enable** → aplicar a un grupo de seguridad (crea uno, ej. `starcorp-sp`) que contenga el service principal registrado en 2.1.
3. Espera ~15 min para que propague.

### 2.5 Dar acceso al Workspace

1. En `app.powerbi.com`, abrir el **workspace** con los datasets.
2. **Access** → agregar el service principal (`starcorp-powerbi-proxy`) como **Member** o **Contributor**.

---

## 3. Guardar credenciales en Supabase

Nunca poner los secretos Azure en variables `EXPO_PUBLIC_*`: quedarían en el bundle del cliente.

### 3.1 Tabla `starcorp_vault` (si no existe)

```sql
-- supabase/migrations/0001_starcorp_vault.sql
create table if not exists starcorp_vault (
  key   text primary key,
  value text not null,
  updated_at timestamptz default now()
);

alter table starcorp_vault enable row level security;

-- Solo el service_role puede leer; nunca exponer vía anon.
create policy "no client access" on starcorp_vault
  for all using (false);
```

### 3.2 Insertar secretos (una sola vez, vía SQL editor con service role)

```sql
insert into starcorp_vault (key, value) values
  ('AZURE_TENANT_ID',     '<tenant-id>'),
  ('AZURE_CLIENT_ID',     '<client-id>'),
  ('AZURE_CLIENT_SECRET', '<client-secret>')
on conflict (key) do update set value = excluded.value, updated_at = now();
```

Alternativa más limpia: usar **Supabase Vault** (`supabase.vault.secrets`) — mismo principio, API diferente. Para MVP la tabla alcanza.

---

## 4. Edge Function — `powerbi-execute-query`

### 4.1 Crear la función

```bash
supabase functions new powerbi-execute-query
```

### 4.2 Código

```ts
// supabase/functions/powerbi-execute-query/index.ts
import { createClient } from "jsr:@supabase/supabase-js@2";

const POWERBI_SCOPE = "https://analysis.windows.net/powerbi/api/.default";
const TOKEN_CACHE: { value?: string; expiresAt?: number } = {};

async function getAzureToken(tenant: string, clientId: string, secret: string) {
  if (TOKEN_CACHE.value && TOKEN_CACHE.expiresAt! > Date.now() + 60_000) {
    return TOKEN_CACHE.value;
  }
  const res = await fetch(
    `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: secret,
        scope: POWERBI_SCOPE,
      }),
    },
  );
  if (!res.ok)
    throw new Error(`Azure token ${res.status}: ${await res.text()}`);
  const json = await res.json();
  TOKEN_CACHE.value = json.access_token;
  TOKEN_CACHE.expiresAt = Date.now() + json.expires_in * 1000;
  return json.access_token as string;
}

Deno.serve(async (req) => {
  try {
    // 1. Verificar JWT del usuario Supabase
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response("Missing auth", { status: 401 });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return new Response("Invalid JWT", { status: 401 });

    // 2. Parsear request
    const { datasetId, daxQuery } = (await req.json()) as {
      datasetId: string;
      daxQuery: string;
    };
    if (!datasetId || !daxQuery) {
      return new Response("datasetId + daxQuery required", { status: 400 });
    }

    // 3. Leer credenciales del vault
    const { data: vault, error: vErr } = await supabase
      .from("starcorp_vault")
      .select("key,value")
      .in("key", ["AZURE_TENANT_ID", "AZURE_CLIENT_ID", "AZURE_CLIENT_SECRET"]);
    if (vErr || !vault || vault.length < 3)
      throw new Error("Vault misconfigured");
    const kv = Object.fromEntries(vault.map((r) => [r.key, r.value]));

    // 4. Token Azure (cacheado en memoria de la función)
    const azureToken = await getAzureToken(
      kv.AZURE_TENANT_ID,
      kv.AZURE_CLIENT_ID,
      kv.AZURE_CLIENT_SECRET,
    );

    // 5. Ejecutar DAX contra Power BI
    const pbiRes = await fetch(
      `https://api.powerbi.com/v1.0/myorg/datasets/${datasetId}/executeQueries`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${azureToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          queries: [{ query: daxQuery }],
          serializerSettings: { includeNulls: true },
        }),
      },
    );
    if (!pbiRes.ok) {
      const txt = await pbiRes.text();
      return new Response(`PBI ${pbiRes.status}: ${txt}`, { status: 502 });
    }

    const body = await pbiRes.json();
    return Response.json(body, {
      headers: { "Cache-Control": "private, max-age=60" },
    });
  } catch (err) {
    console.error(err); // nunca loguear secretos
    return new Response("Internal error", { status: 500 });
  }
});
```

### 4.3 Deploy

```bash
supabase functions deploy powerbi-execute-query --no-verify-jwt=false
```

`--no-verify-jwt=false` es el default, lo dejamos explícito: Supabase rechaza la request si no trae JWT válido, antes incluso de entrar al handler (doble defensa, el handler también valida).

---

## 5. Cliente — Hook TanStack Query

### 5.1 Tipos (agregar a `src/types/api.types.ts`)

Los tipos `PBIQueryResultRaw`, `PBIQueryResult`, `PBITable` ya están en el archivo. Reusarlos.

### 5.2 Hook

```ts
// src/hooks/queries/use-powerbi-query.ts
import { useQuery } from "@tanstack/react-query";
import Constants from "expo-constants";
import type { PBIQueryResultRaw } from "@/types/api.types";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

interface Args {
  datasetId: string;
  daxQuery: string;
  supabaseJwt: string | null; // del auth store
}

async function executeQuery({ datasetId, daxQuery, supabaseJwt }: Args) {
  if (!supabaseJwt) throw new Error("not authenticated");
  const res = await fetch(
    `${SUPABASE_URL}/functions/v1/powerbi-execute-query`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${supabaseJwt}`,
        apikey: SUPABASE_ANON,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ datasetId, daxQuery }),
    },
  );
  if (!res.ok) throw new Error(`PBI query failed: ${res.status}`);
  return res.json() as Promise<PBIQueryResultRaw>;
}

export function usePowerBIQuery(args: Args) {
  return useQuery({
    queryKey: ["powerbi", args.datasetId, args.daxQuery],
    queryFn: () => executeQuery(args),
    enabled: !!args.supabaseJwt && !!args.datasetId && !!args.daxQuery,
    staleTime: 5 * 60 * 1000, // SKILL.md §2: datos financieros 5 min
  });
}
```

### 5.3 Uso + normalización

El hook devuelve el shape raw. No lo pases directo a componentes — mapealo a `NormalizedRevenue` / `NormalizedClient` etc. de `src/types/domain.types.ts` en un normalizer.

```ts
// src/services/powerbi/normalize.ts
import type { PBIQueryResultRaw } from "@/types/api.types";
import type { NormalizedRevenue } from "@/types/domain.types";

export function normalizeRevenueFromPBI(
  raw: PBIQueryResultRaw,
): NormalizedRevenue {
  const rows = raw.results?.[0]?.tables?.[0]?.rows ?? [];
  // rows shape depende del DAX — mapear columnas por índice definido en la query.
  // Ejemplo simplificado:
  const series = rows.map(([date, value]) => ({
    date: String(date),
    value: Number(value),
  }));
  const total = series.reduce((s, p) => s + p.value, 0);
  // ... calcular delta, currency, period
  return {
    total,
    currency: "USD",
    deltaPercent: 0,
    deltaAbsolute: 0,
    trend: "flat",
    series,
    period: { start: "", end: "" },
  };
}
```

---

## 6. Consultas DAX de referencia

### 6.1 Ingresos por día (últimos 30)

```dax
EVALUATE
SUMMARIZECOLUMNS(
    'Calendar'[Date],
    "Revenue", [Total Revenue]
)
ORDER BY 'Calendar'[Date] ASC
```

### 6.2 Top 10 clientes por revenue

```dax
EVALUATE
TOPN(
    10,
    SUMMARIZECOLUMNS(
        'Customer'[Name],
        "Revenue", [Total Revenue]
    ),
    [Revenue], DESC
)
```

Guarda cada DAX en una constante: `src/services/powerbi/queries.ts`. No armes DAX dinámico con string concatenation en el cliente: todo lo parametrizable pásalo como filtro DAX (`CALCULATETABLE` + `TREATAS`) o en JSON al Edge Function.

---

## 7. Variables de entorno

### Cliente (`.env` en la raíz, leído vía `EXPO_PUBLIC_*`)

```
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

### Edge Function (auto-inyectadas por Supabase)

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`

Los secretos Azure **no** van como env vars: se leen del `starcorp_vault` en runtime para poder rotarlos sin redeploy.

---

## 8. Checklist de validación

- [ ] Service principal tiene consent admin en las 3 permissions.
- [ ] Service principal agregado al workspace con acceso ≥ Viewer.
- [ ] Tenant setting "Allow service principals" habilitado.
- [ ] Llamando `executeQueries` desde Postman con el bearer Azure devuelve 200.
- [ ] Edge Function con JWT inválido devuelve 401.
- [ ] Edge Function con JWT válido devuelve 200 y datos.
- [ ] `usePowerBIQuery` respeta `staleTime: 5min` (verificar con React Query Devtools).
- [ ] Ningún secreto Azure aparece en el bundle (`npx expo export` → grep `AZURE_CLIENT_SECRET`).
- [ ] Errores no imprimen el secret (revisar `console.error`).

---

## 9. Troubleshooting

| Síntoma                                   | Causa probable                                                                                                      |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `401 invalid_client` al pedir token Azure | Client secret expirado o tenant id incorrecto                                                                       |
| `403 PowerBINotAuthorizedException`       | SP no agregado al workspace, o tenant setting deshabilitado                                                         |
| `400 DatasetExecuteQueriesUserError`      | DAX inválido, o dataset no soporta XMLA (necesita Premium/PPU para datasets grandes)                                |
| `429 Too Many Requests`                   | Pasaste del límite PBI (120 req/min/user). Implementar backoff o cache server-side                                  |
| Token se renueva en cada request          | `TOKEN_CACHE` es por isolate; en frío se pierde. Aceptable. Para reducir, mover a tabla `starcorp_vault` con expiry |

---

## Anexo — embedToken para WebView (reportes visuales)

Si en lugar de extraer data quieres **embeber un reporte Power BI** en la app (visual completo de Power BI dentro de un WebView):

1. Crear una segunda Edge Function `powerbi-embed-token`.
2. Llama a `POST /v1.0/myorg/groups/{groupId}/reports/{reportId}/GenerateToken` con body `{ accessLevel: 'View' }`.
3. Devuelve al cliente `{ embedUrl, embedToken, reportId }` (tipo `PBIReportDataRaw` en `api.types.ts`).
4. En RN: instalar `react-native-webview` (`npx expo install react-native-webview`) y renderizar:
   ```tsx
   <WebView
     source={{
       html: `<html><body><div id="r" style="height:100vh"></div>
         <script src="https://cdn.jsdelivr.net/npm/powerbi-client/dist/powerbi.min.js"></script>
         <script>
           powerbi.embed(document.getElementById('r'), {
             type: 'report', tokenType: 1,
             accessToken: '${embedToken}', embedUrl: '${embedUrl}',
             id: '${reportId}', settings: { panes: { filters: { visible: false } } }
           });
         </script></body></html>`,
     }}
   />
   ```

Los `embedToken` expiran en ~1h: la query key debe incluir `refreshAt` para invalidar antes.
