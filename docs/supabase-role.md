# Por qué Supabase — el rol que cumple en las integraciones Power BI y QuickBooks

Este documento explica **para qué se necesita Supabase** en Starcorp y por qué es el eje que hace posible (y seguras) las conexiones con Power BI y QuickBooks desde la app Expo / React Native.

Documentos relacionados:
- [`power-bi-integration.md`](./power-bi-integration.md) — guía técnica Power BI
- [`quickbooks-integration.md`](./quickbooks-integration.md) — guía técnica QuickBooks

---

## TL;DR

Supabase no es "la base de datos" — es **el backend completo** que permite que una app móvil pública hable con APIs empresariales (Power BI, QuickBooks) sin exponer secretos, sin perder tokens entre dispositivos y sin tener que montar infraestructura propia.

En concreto, Supabase cumple **3 roles críticos**:

1. **Proxy seguro** (Edge Functions) — esconde `client_secret` del bundle del cliente.
2. **Gatekeeper de autenticación** (Supabase Auth + JWT) — valida quién llama antes de ejecutar.
3. **Almacén persistente de tokens OAuth** (Postgres + RLS) — critico para QuickBooks, que rota `refresh_token` cada 101 días.

---

## 1. Proxy seguro — esconder credenciales del cliente

### El problema

El bundle de una app React Native **es público**: cualquiera con un APK (o el output de `npx expo export`) puede extraer strings. Si pusieras un secreto en una variable `EXPO_PUBLIC_*`:

```
EXPO_PUBLIC_AZURE_CLIENT_SECRET=xxxx   ❌ queda en el bundle
EXPO_PUBLIC_QB_CLIENT_SECRET=xxxx      ❌ queda en el bundle
```

…cualquier atacante con el APK podría firmar tokens a nombre de tu tenant Azure o de tu app Intuit. Equivale a dejar las llaves debajo del felpudo.

### La solución

Las **Edge Functions de Supabase** corren en Deno en servidores Supabase — nunca en el device. Leen los secretos del `starcorp_vault` en runtime y los usan para hablar con las APIs externas. El cliente solo conoce el JWT de Supabase, que no sirve para nada fuera de este backend.

```
┌─────────┐   JWT Supabase    ┌────────────────┐   Bearer Azure/QB   ┌──────────┐
│ App RN  │ ────────────────▶│ Edge Function  │ ──────────────────▶│ Power BI │
│ público │                   │ (servidor)     │                    │ QuickBooks│
└─────────┘                   │                │                    └──────────┘
                              │ lee secretos   │
                              │ de vault       │
                              └────────┬───────┘
                                       ▼
                              starcorp_vault
                              (RLS: solo service_role)
```

### Qué vive en `starcorp_vault`

- Power BI: `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`
- QuickBooks: `QB_CLIENT_ID`, `QB_CLIENT_SECRET`, `QB_ENVIRONMENT`

La tabla tiene RLS con `for all using (false)`: ni siquiera el `anon` key puede leerla. Solo el `service_role` (que únicamente existe dentro de las Edge Functions) tiene acceso.

---

## 2. Gatekeeper de autenticación — verificar quién llama

### El problema

Si expusieras un endpoint HTTP público que llama a Power BI o QuickBooks, cualquiera en Internet podría invocarlo. Necesitas autenticar al caller antes de ejecutar.

### La solución

Toda Edge Function valida el **JWT de Supabase** del usuario antes de hacer nada:

```ts
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  global: { headers: { Authorization: authHeader } },
});
const { data: { user } } = await supabase.auth.getUser();
if (!user) return new Response('Invalid JWT', { status: 401 });
```

Esto aprovecha **Supabase Auth** (signup / login / refresh) que ya viene hecho. Sin Supabase tendrías que construir:
- tu propia tabla de usuarios,
- hashing de passwords,
- emisión / rotación / revocación de JWTs,
- rate-limiting por usuario,
- recuperación de contraseña,
- verificación de email.

Supabase Auth + JWT + Edge Functions te da todo eso resuelto en una línea: `supabase.auth.getUser()`.

---

## 3. Almacén persistente de tokens OAuth (crítico para QuickBooks)

### El problema específico de QuickBooks

QuickBooks usa **OAuth delegado por usuario** (cada admin de una company autoriza la app). Esto genera un `refresh_token` que:

- **Rota en cada uso** — cada vez que pides un nuevo `access_token`, Intuit devuelve un `refresh_token` nuevo que reemplaza al anterior.
- **Expira a los 101 días de inactividad** — si no lo usas, sesión muerta.

Si guardaras el `refresh_token` en el `SecureStore` del device:

| Escenario | Qué pasa |
|---|---|
| Usuario cambia de teléfono | Pierde conexión QB, tiene que re-autorizar |
| Usuario reinstala la app | Pierde conexión QB |
| Race condition entre dos requests que refrescan a la vez | Uno de los dos `refresh_token` queda inválido, se rompe la sesión |
| Backend se entera de que el usuario ya no está autorizado | No puede, el token vive en el device |

### La solución

Los tokens viven en la tabla `qb_user_tokens` en Postgres, atados al `user_id` de Supabase:

```sql
create table qb_user_tokens (
  user_id           uuid primary key references auth.users on delete cascade,
  realm_id          text not null,
  refresh_token     text not null,
  access_token      text not null,
  access_expires_at timestamptz not null,
  refresh_expires_at timestamptz not null,
  updated_at        timestamptz default now()
);

alter table qb_user_tokens enable row level security;
create policy "no client access" on qb_user_tokens for all using (false);
```

La Edge Function `qb-query` lee / rota / escribe esta tabla. El cliente nunca ve los tokens QB — solo un flag `qbConnected` en el store local.

### Power BI no tiene este problema (pero igual necesita Supabase)

Power BI usa **service principal** (app-only token, no delegado). El token Azure lo genera la Edge Function cada vez (con caché en memoria del isolate). No hay que persistir tokens por usuario.

Pero igual se necesita Supabase para los **roles 1 y 2**: esconder el `AZURE_CLIENT_SECRET` y validar el JWT del usuario antes de ejecutar queries DAX.

---

## 4. Callback HTTPS aterrizable (exclusivo de QuickBooks)

Intuit **no redirecciona a `starcorp://`** (deep links custom) durante el OAuth callback — exige una URL HTTPS registrada. Con Supabase, la redirect URI es:

```
https://<project-ref>.supabase.co/functions/v1/qb-oauth-callback
```

La Edge Function recibe el `code`, intercambia por tokens, los guarda en `qb_user_tokens`, y luego hace un `302` a `starcorp://oauth/quickbooks?status=ok` para volver a la app.

Sin Supabase tendrías que hostear tú mismo un endpoint HTTPS con TLS válido, dominio registrado, etc.

---

## 5. Resumen por integración

| Necesidad | Power BI | QuickBooks |
|---|:---:|:---:|
| Ocultar `client_secret` del bundle cliente | ✅ `starcorp_vault` | ✅ `starcorp_vault` |
| Validar JWT del usuario antes de ejecutar | ✅ | ✅ |
| Token OAuth persistente per-usuario | ❌ (service principal app-only) | ✅ `qb_user_tokens` |
| Redirect URI HTTPS aterrizable | ❌ (no hay OAuth delegado) | ✅ `qb-oauth-callback` |
| Cachear token Azure / refresh transparente | ✅ (in-memory) | ✅ (en DB) |

---

## 6. La alternativa: qué tendrías que construir sin Supabase

Para replicar esto sin Supabase necesitarías:

1. **Backend propio** (Node/Express + TypeScript) hosteado en algún VPS (Railway, Fly.io, AWS).
2. **Sistema de auth propio**:
   - Tabla `users` con passwords hasheadas (bcrypt/argon2).
   - Emisión / verificación / rotación de JWTs (`jsonwebtoken` o similar).
   - Endpoints `signup` / `login` / `refresh` / `logout` / `password-reset`.
   - Envío de emails (SendGrid/Postmark) para verificación y reset.
3. **Base de datos**: Postgres hosteado aparte (RDS, Neon, Supabase… 😉).
4. **Almacén de secretos**: Vault (HashiCorp), AWS Secrets Manager, o tabla propia con cifrado simétrico.
5. **Dominio HTTPS** con certificado TLS válido para el callback de Intuit.
6. **CI/CD** para deploy del backend.
7. **Monitoring / logging** (Sentry, Datadog).

Supabase te da los **7 componentes** en una sola plataforma con tier gratuito suficiente para MVP:

| Componente | Parte de Supabase |
|---|---|
| Backend ejecutable | Edge Functions (Deno) |
| Auth | Supabase Auth |
| Base de datos | Postgres gestionado |
| Almacén de secretos | Tabla `starcorp_vault` con RLS (o Supabase Vault) |
| Dominio HTTPS | `<project>.supabase.co` con TLS auto |
| CI/CD | `supabase functions deploy` |
| Logging | Dashboard → Edge Function Logs |

---

## 7. Estado actual del proyecto (2026-04-17)

Consultado vía MCP `supabase list_edge_functions`:

- ✅ **`powerbi-execute-query`** — activa, v1, `verify_jwt: true`.
- ❌ **QuickBooks: ninguna Edge Function desplegada.** `qb-oauth-callback` y `qb-query` están documentadas en [`quickbooks-integration.md`](./quickbooks-integration.md) pero no existen aún en el proyecto remoto.
- ❌ El directorio local `supabase/functions/` no existe — el código fuente de `powerbi-execute-query` no está versionado en este repo.

### Próximos pasos sugeridos

1. Versionar `powerbi-execute-query/index.ts` en `supabase/functions/` para que viva en git.
2. Crear + deployar `qb-oauth-callback` (con `--no-verify-jwt`).
3. Crear + deployar `qb-query` (con JWT verify por default).
4. Aplicar migración `qb_user_tokens` + verificar que `starcorp_vault` tenga las 3 keys de QB.

---

## 8. Principios clave (para no romper la seguridad después)

- **Ningún secreto de API externa jamás toca el cliente.** Ni en `.env` público, ni en `SecureStore`, ni como respuesta de una Edge Function.
- **Toda Edge Function valida JWT** excepto los callbacks de OAuth (que validan manualmente vía `state`).
- **Las tablas sensibles** (`starcorp_vault`, `qb_user_tokens`) tienen RLS `using (false)` — solo `service_role`.
- **Logs nunca imprimen tokens.** Solo status codes y mensajes de error genéricos.
- **Rotar secretos = update en `starcorp_vault`.** No requiere redeploy de la Edge Function.
