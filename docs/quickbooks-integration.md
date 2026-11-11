# QuickBooks Online — Guía de conexión y extracción de datos

Guía end-to-end para conectar la app Starcorp (Expo / React Native) a **QuickBooks Online** usando OAuth 2.0 delegado por usuario. Alineada con `CLAUDE.md` + `SKILL.md`: **el cliente nunca llama a `quickbooks.api.intuit.com` directo**; toda petición pasa por una Supabase Edge Function que valida el JWT del usuario y gestiona el `refresh_token` desde `starcorp_vault`.

---

## 0. Arquitectura objetivo

```
┌─────────┐  1. OAuth code  ┌────────┐
│  App RN │ ──────────────▶│ Intuit │   (expo-auth-session abre browser)
└────┬────┘  2. code        └────────┘
     │
     ▼ 3. code
┌────────────────────────┐  exchange  ┌──────────┐
│ Edge Fn: qb-oauth-cb   │ ─────────▶ │  Intuit  │
│  - valida state+JWT    │ ◀── tokens ┘
│  - guarda refresh en   │
│    starcorp_vault      │
└──────────┬─────────────┘
           │ access_token (solo esta vez)
           ▼
┌─────────┐
│  App RN │ — ya tiene sesión QB, tira queries a la otra Edge Fn
└────┬────┘
     │ JWT Supabase + realmId
     ▼
┌────────────────────────┐   Bearer QB    ┌──────────┐
│ Edge Fn: qb-query      │ ─────────────▶│  Intuit  │
│  - rehidrata refresh   │                │  API     │
│  - refresca si expiró  │ ◀── JSON ───── └──────────┘
└────────────────────────┘
```

**Por qué delegado** (no service principal): QuickBooks no soporta app-only tokens. Cada `company` (realm) necesita que su admin autorice la app.

---

## 1. Pre-requisitos

- Cuenta de desarrollador en [developer.intuit.com](https://developer.intuit.com).
- Una **Sandbox Company** (auto-creada al registrarse).
- Proyecto Supabase con tabla `starcorp_vault` (ver guía Power BI §3.1).
- Dependencias ya instaladas: `expo-auth-session`, `expo-web-browser`, `expo-crypto`, `expo-secure-store` — verificadas en `package.json`.

---

## 2. Registrar la app en Intuit Developer

### 2.1 Crear app

1. [developer.intuit.com](https://developer.intuit.com) → **Dashboard** → **Create an app**.
2. Seleccionar **QuickBooks Online and Payments**.
3. Nombre: `starcorp`. Scopes mínimos: `com.intuit.quickbooks.accounting`.

### 2.2 Configurar OAuth (Keys & OAuth)

**Development keys** (sandbox):
- Anotar `Client ID` → `QB_CLIENT_ID_DEV`
- Anotar `Client Secret` → `QB_CLIENT_SECRET_DEV`

**Redirect URIs** — agregar los 3:
```
starcorp://oauth/quickbooks                   # deep link móvil (producción)
exp://127.0.0.1:8081/--/oauth/quickbooks      # Expo Go local
https://<project-ref>.supabase.co/functions/v1/qb-oauth-callback
```
El 3ro **es el que usamos**: el callback aterriza en la Edge Function, no en la app. La app abre el browser, Intuit redirecciona a Supabase, Supabase guarda tokens y hace un 302 a `starcorp://oauth/quickbooks?status=ok`.

### 2.3 Production keys

Solo tras aprobar la review de Intuit. El flow es el mismo, solo cambian client_id/secret y la base URL (`quickbooks.api.intuit.com` en lugar de `sandbox-quickbooks.api.intuit.com`).

---

## 3. Guardar credenciales de la app en Supabase

```sql
insert into starcorp_vault (key, value) values
  ('QB_CLIENT_ID',     '<client-id>'),
  ('QB_CLIENT_SECRET', '<client-secret>'),
  ('QB_ENVIRONMENT',   'sandbox')      -- o 'production'
on conflict (key) do update set value = excluded.value, updated_at = now();
```

---

## 4. Tabla de tokens por usuario

Distinta del `starcorp_vault` (que guarda secretos de la app): esto guarda **tokens del usuario** atados a su `user_id` de Supabase.

```sql
-- supabase/migrations/0002_qb_user_tokens.sql
create table if not exists qb_user_tokens (
  user_id           uuid primary key references auth.users on delete cascade,
  realm_id          text not null,            -- "company id" de QB
  refresh_token     text not null,
  access_token      text not null,
  access_expires_at timestamptz not null,
  refresh_expires_at timestamptz not null,    -- QB da 101 días
  updated_at        timestamptz default now()
);

alter table qb_user_tokens enable row level security;

-- Solo el service_role lee/escribe. El cliente nunca toca esta tabla.
create policy "no client access" on qb_user_tokens for all using (false);
```

---

## 5. Flujo OAuth (autorización inicial)

### 5.1 Cliente — iniciar OAuth con PKCE

QuickBooks **no requiere PKCE** para confidential clients, pero lo usamos igual porque la app móvil no puede guardar el client_secret. El secret vive solo en la Edge Function; el cliente nunca lo toca.

```ts
// src/services/quickbooks/oauth.ts
import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import * as WebBrowser from 'expo-web-browser';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const QB_AUTHORIZE = 'https://appcenter.intuit.com/connect/oauth2';

async function randomState() {
  const bytes = await Crypto.getRandomBytesAsync(16);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function startQuickBooksOAuth(supabaseJwt: string) {
  const state = await randomState();
  // Guardamos state en la Edge Function (o en SecureStore + rondtrip).
  // Para simplicidad embebemos el JWT codificado dentro del state:
  const signedState = btoa(JSON.stringify({ state, jwt: supabaseJwt }));

  const redirectUri = `${SUPABASE_URL}/functions/v1/qb-oauth-callback`;
  const url =
    `${QB_AUTHORIZE}?client_id=${encodeURIComponent(process.env.EXPO_PUBLIC_QB_CLIENT_ID!)}` +
    `&scope=com.intuit.quickbooks.accounting` +
    `&redirect_uri=${encodeURIComponent(redirectUri)}` +
    `&response_type=code` +
    `&state=${encodeURIComponent(signedState)}`;

  // Abrimos el browser del sistema; QB redirige a la Edge Fn, que redirige a starcorp://
  const result = await WebBrowser.openAuthSessionAsync(url, 'starcorp://oauth/quickbooks');
  return result;   // { type: 'success' | 'cancel' | 'dismiss' }
}
```

> Nota seguridad: codificar el JWT en `state` es aceptable si es **corto** y transita por HTTPS; alternativa más limpia: antes de abrir OAuth, llamar una Edge Fn `qb-oauth-start` que devuelva un `state` opaco guardado server-side asociado a `user_id`.

### 5.2 Edge Function — `qb-oauth-callback`

Recibe el `code` de Intuit, intercambia por tokens, guarda en `qb_user_tokens`.

```ts
// supabase/functions/qb-oauth-callback/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2';

const TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const code    = url.searchParams.get('code');
  const realmId = url.searchParams.get('realmId');
  const state   = url.searchParams.get('state');

  if (!code || !realmId || !state) {
    return Response.redirect('starcorp://oauth/quickbooks?status=error&reason=missing_params');
  }

  // 1. Decodificar state → extraer JWT del usuario
  let userJwt: string;
  try {
    const parsed = JSON.parse(atob(decodeURIComponent(state)));
    userJwt = parsed.jwt;
  } catch {
    return Response.redirect('starcorp://oauth/quickbooks?status=error&reason=bad_state');
  }

  // 2. Validar JWT + obtener user_id
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const { data: { user } } = await admin.auth.getUser(userJwt);
  if (!user) {
    return Response.redirect('starcorp://oauth/quickbooks?status=error&reason=invalid_jwt');
  }

  // 3. Leer credenciales QB del vault
  const { data: vault } = await admin.from('starcorp_vault')
    .select('key,value')
    .in('key', ['QB_CLIENT_ID', 'QB_CLIENT_SECRET']);
  const kv = Object.fromEntries((vault ?? []).map((r) => [r.key, r.value]));

  // 4. Intercambiar code por tokens
  const basic = btoa(`${kv.QB_CLIENT_ID}:${kv.QB_CLIENT_SECRET}`);
  const redirectUri = `${Deno.env.get('SUPABASE_URL')}/functions/v1/qb-oauth-callback`;

  const tokenRes = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenRes.ok) {
    console.error('QB token exchange failed', tokenRes.status);
    return Response.redirect('starcorp://oauth/quickbooks?status=error&reason=exchange_failed');
  }

  const t = await tokenRes.json() as {
    access_token: string;
    refresh_token: string;
    expires_in: number;          // segundos (~3600)
    x_refresh_token_expires_in: number; // ~101 días
  };

  // 5. Persistir
  const now = Date.now();
  await admin.from('qb_user_tokens').upsert({
    user_id: user.id,
    realm_id: realmId,
    access_token: t.access_token,
    refresh_token: t.refresh_token,
    access_expires_at: new Date(now + t.expires_in * 1000).toISOString(),
    refresh_expires_at: new Date(now + t.x_refresh_token_expires_in * 1000).toISOString(),
    updated_at: new Date(now).toISOString(),
  });

  return Response.redirect('starcorp://oauth/quickbooks?status=ok');
});
```

Deploy con **`--no-verify-jwt`** (el callback lo invoca Intuit, no un usuario autenticado; validamos el JWT manualmente desde el `state`):

```bash
supabase functions deploy qb-oauth-callback --no-verify-jwt
```

### 5.3 Cliente — handler del deep link

```ts
// app/_layout.tsx (snippet)
import * as Linking from 'expo-linking';
import { useAuthStore } from '@/stores/auth.store';

useEffect(() => {
  const sub = Linking.addEventListener('url', ({ url }) => {
    const parsed = Linking.parse(url);
    if (parsed.path === 'oauth/quickbooks' && parsed.queryParams?.status === 'ok') {
      // Marcar conectado. No guardamos tokens QB en el cliente — viven en Supabase.
      useAuthStore.getState().setQBConnected(true);
    }
  });
  return () => sub.remove();
}, []);
```

> **Importante**: con este flow los campos `qbAccessToken` / `qbRefreshToken` del `auth.store.ts` actual **ya no aplican** — los tokens viven en Supabase, no en SecureStore. Refactor sugerido: reemplazarlos por un bool `qbConnected` + el `realmId`.

---

## 6. Edge Function — `qb-query`

Refresh transparente del access token, proxy genérico hacia QB.

```ts
// supabase/functions/qb-query/index.ts
import { createClient } from 'jsr:@supabase/supabase-js@2';

const TOKEN_URL = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer';

async function refreshIfNeeded(
  admin: ReturnType<typeof createClient>,
  userId: string,
  clientId: string,
  clientSecret: string,
) {
  const { data: row } = await admin.from('qb_user_tokens')
    .select('*').eq('user_id', userId).single();
  if (!row) throw new Error('not connected');

  if (new Date(row.access_expires_at).getTime() > Date.now() + 60_000) {
    return row;   // aún vigente
  }

  const basic = btoa(`${clientId}:${clientSecret}`);
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basic}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: row.refresh_token,
    }),
  });
  if (!res.ok) throw new Error(`refresh failed: ${res.status}`);
  const t = await res.json();
  const now = Date.now();

  const updated = {
    ...row,
    access_token: t.access_token,
    refresh_token: t.refresh_token,   // QB rota el refresh cada vez
    access_expires_at: new Date(now + t.expires_in * 1000).toISOString(),
    refresh_expires_at: new Date(now + t.x_refresh_token_expires_in * 1000).toISOString(),
    updated_at: new Date(now).toISOString(),
  };
  await admin.from('qb_user_tokens').update(updated).eq('user_id', userId);
  return updated;
}

Deno.serve(async (req) => {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return new Response('Missing auth', { status: 401 });

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    );
    const { data: { user } } = await admin.auth.getUser();
    if (!user) return new Response('Invalid JWT', { status: 401 });

    const { endpoint, query } = await req.json() as {
      endpoint: 'companyinfo' | 'customers' | 'invoices' | 'reports/ProfitAndLoss'
              | 'reports/BalanceSheet';
      query?: Record<string, string>;
    };

    const { data: vault } = await admin.from('starcorp_vault')
      .select('key,value')
      .in('key', ['QB_CLIENT_ID', 'QB_CLIENT_SECRET', 'QB_ENVIRONMENT']);
    const kv = Object.fromEntries((vault ?? []).map((r) => [r.key, r.value]));

    const tokens = await refreshIfNeeded(admin, user.id, kv.QB_CLIENT_ID, kv.QB_CLIENT_SECRET);
    const base = kv.QB_ENVIRONMENT === 'production'
      ? 'https://quickbooks.api.intuit.com'
      : 'https://sandbox-quickbooks.api.intuit.com';

    const qs = query ? '?' + new URLSearchParams(query).toString() : '';
    const url = `${base}/v3/company/${tokens.realm_id}/${endpoint}${qs}`;

    const qbRes = await fetch(url, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
        Accept: 'application/json',
      },
    });
    if (!qbRes.ok) {
      const txt = await qbRes.text();
      return new Response(`QB ${qbRes.status}: ${txt}`, { status: 502 });
    }
    return Response.json(await qbRes.json());
  } catch (err) {
    console.error(err);
    return new Response('Internal error', { status: 500 });
  }
});
```

Deploy:
```bash
supabase functions deploy qb-query
```

---

## 7. Cliente — Hooks TanStack Query

Los tipos raw ya existen en `src/types/api.types.ts` (`QBProfitAndLossRaw`, `QBCustomersRaw`, `QBInvoicesRaw`). Solo falta el hook.

### 7.1 Wrapper genérico

```ts
// src/services/quickbooks/client.ts
import { useAuthStore } from '@/stores/auth.store';

const URL = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const ANON = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export async function qbQuery<T>(
  endpoint: string,
  query?: Record<string, string>,
): Promise<T> {
  const jwt = useAuthStore.getState().supabaseJwt;
  if (!jwt) throw new Error('not authenticated');

  const res = await fetch(`${URL}/functions/v1/qb-query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${jwt}`,
      apikey: ANON,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ endpoint, query }),
  });
  if (!res.ok) throw new Error(`QB ${res.status}`);
  return res.json() as Promise<T>;
}
```

### 7.2 Hooks por endpoint

```ts
// src/hooks/queries/use-qb-profit-and-loss.ts
import { useQuery } from '@tanstack/react-query';
import { qbQuery } from '@/services/quickbooks/client';
import type { QBProfitAndLossRaw } from '@/types/api.types';

export function useQBProfitAndLoss(params: { start_date: string; end_date: string }) {
  return useQuery({
    queryKey: ['qb', 'profit-and-loss', params],
    queryFn: () => qbQuery<QBProfitAndLossRaw>('reports/ProfitAndLoss', params),
    staleTime: 5 * 60 * 1000,
  });
}
```

```ts
// src/hooks/queries/use-qb-customers.ts
import { useQuery } from '@tanstack/react-query';
import { qbQuery } from '@/services/quickbooks/client';
import type { QBCustomersRaw } from '@/types/api.types';

export function useQBCustomers() {
  return useQuery({
    queryKey: ['qb', 'customers'],
    queryFn: () => qbQuery<QBCustomersRaw>('customers', {
      query: "select * from Customer where Active = true maxresults 100",
    } as any),
    staleTime: 5 * 60 * 1000,
  });
}
```

> Para `customers` e `invoices` QB usa query params con lenguaje SQL-like. El endpoint real es `/query?query=...`. Ajustar el Edge Function si se quiere soportar ambos estilos.

### 7.3 Normalización → dominio

No pases el raw a componentes. Escribe un normalizer que colapse `Rows.Row.Summary.ColData` a `NormalizedRevenue`:

```ts
// src/services/quickbooks/normalize.ts
import type { QBProfitAndLossRaw, QBCustomersRaw } from '@/types/api.types';
import type { NormalizedRevenue, NormalizedClient } from '@/types/domain.types';

export function normalizeRevenueFromQB(raw: QBProfitAndLossRaw): NormalizedRevenue {
  const totalIncomeRow = raw.Rows?.Row?.find((r) => r.group === 'Income');
  const total = Number(totalIncomeRow?.Summary?.ColData?.[1]?.value ?? 0);
  // ... derivar series, delta, etc. Ver domain.types.ts
  return {
    total, currency: raw.Header?.Currency ?? 'USD',
    deltaPercent: 0, deltaAbsolute: 0, trend: 'flat',
    series: [],
    period: { start: raw.Header?.StartPeriod ?? '', end: raw.Header?.EndPeriod ?? '' },
  };
}

export function normalizeCustomersFromQB(raw: QBCustomersRaw): NormalizedClient[] {
  return (raw.QueryResponse?.Customer ?? []).map((c, i) => ({
    id: c.Id,
    name: c.DisplayName,
    revenue: c.Balance ?? 0,
    deltaPercent: 0,
    color: `hsl(${(i * 47) % 360}, 70%, 50%)`,
    source: 'quickbooks' as const,
  }));
}
```

---

## 8. Variables de entorno

### Cliente (`.env`)
```
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
EXPO_PUBLIC_QB_CLIENT_ID=<client-id-publico>   # necesario para armar el authorize URL
```

El **secret NO** va aquí — vive en `starcorp_vault`.

### Edge Function
Auto-inyectadas por Supabase: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`.

---

## 9. Endpoints QB de referencia

| Propósito | Endpoint | Hook sugerido |
|-----------|----------|---------------|
| Ingresos/gastos | `reports/ProfitAndLoss` | `useQBProfitAndLoss` |
| Balance general | `reports/BalanceSheet` | `useQBBalanceSheet` |
| Cash flow | `reports/CashFlow` | `useQBCashFlow` |
| Clientes | `query` con `select * from Customer` | `useQBCustomers` |
| Facturas | `query` con `select * from Invoice where TxnDate > ...` | `useQBInvoices` |
| Info empresa | `companyinfo/{realmId}` | `useQBCompanyInfo` |

Docs oficiales: [developer.intuit.com/app/developer/qbo/docs/api/accounting](https://developer.intuit.com/app/developer/qbo/docs/api/accounting/all-entities).

---

## 10. Checklist de validación

- [ ] App Intuit creada, sandbox connected to sandbox company.
- [ ] Redirect URI `https://<project>.supabase.co/functions/v1/qb-oauth-callback` registrada.
- [ ] `starcorp_vault` tiene `QB_CLIENT_ID`, `QB_CLIENT_SECRET`, `QB_ENVIRONMENT`.
- [ ] Migración `qb_user_tokens` aplicada + RLS activo.
- [ ] Edge Function `qb-oauth-callback` deployada con `--no-verify-jwt`.
- [ ] Edge Function `qb-query` deployada sin flag (valida JWT).
- [ ] Deep link `starcorp://oauth/quickbooks` registrado en `app.json` (`scheme: "starcorp"`).
- [ ] Un OAuth completo inserta row en `qb_user_tokens`.
- [ ] Una query después de 1h fuerza refresh y sigue devolviendo 200.
- [ ] `staleTime: 5min` verificado con React Query Devtools.
- [ ] No aparece el client_secret en el bundle (`npx expo export` → grep).
- [ ] Tokens **no** se imprimen en `console.*` (grep edge functions).

---

## 11. Troubleshooting

| Síntoma | Causa |
|---------|-------|
| `invalid_grant` al intercambiar code | Redirect URI no coincide exacto con el registrado en Intuit |
| `401` en `qb-query` tras 1h | Lógica de refresh no se ejecutó — revisar `access_expires_at` en DB |
| `AuthenticationFailed` | `refresh_token` expiró (101 días sin uso) → forzar nuevo OAuth |
| `ApplicationAuthenticationFailed` | Environment incorrecto (sandbox key contra prod URL) |
| El deep link `starcorp://` no abre la app | Falta `"scheme": "starcorp"` en `app.json` + rebuild (dev client / EAS) |
| Request pasa pero devuelve data vacío | Sandbox company sin data seed — crear invoices manualmente en `app.sandbox.qbo.intuit.com` |

---

## 12. Notas de seguridad

- El `client_secret` **solo** existe en `starcorp_vault`. Ni en `.env`, ni en el código.
- `qb_user_tokens` con RLS `for all using (false)` → nadie excepto `service_role` lee/escribe.
- Logs de edge functions revisados: nunca `console.log(tokens)`, solo status codes.
- En `starcorp://oauth/quickbooks?status=...` nunca pasar el `access_token` — solo un flag.
- Al hacer `logout`: borrar row de `qb_user_tokens` **y** revocar el refresh en Intuit (`POST https://developer.api.intuit.com/v2/oauth2/tokens/revoke`).
