<p align="right"><img src="assets/isologo-badge.png" alt="Kromaticos" width="44"></p>

# Arquitectura

**5core** (slug `starcorp`) es una app móvil (iOS / Android, también web) de reportería ejecutiva para el grupo 5 Stars: consolida contabilidad, bancos, cartera, nómina, presupuesto, seguros y tareas de varias empresas del grupo en un solo lugar.

## Stack

| Capa | Tecnología |
|---|---|
| App | Expo SDK 54 (dev client, no Expo Go), React Native 0.81, React 19.1, expo-router 6 (typed routes, React Compiler) |
| UI | NativeWind 5 (preview) + Tailwind v4, SVG propio para gráficos (`react-native-svg`), Reanimated 4, FlashList 2 |
| Datos en cliente | TanStack Query 5 (async), Zustand (estado local) |
| Backend | Supabase: Postgres + RPCs, Edge Functions (Deno), Auth, Storage, pg_cron + pg_net |
| Fuentes externas | Power BI (datasets del ERP), QuickBooks Online, Notion, NexiaTask, Resend (correo) |
| Deploy | EAS Build + EAS Update (OTA) vía GitHub Actions |

## Vista de alto nivel

```
 ┌──────────────┐     JWT      ┌──────────────────────── Supabase ────────────────────────┐
 │  App Expo    │ ───────────▶ │  RPCs (SECURITY DEFINER) ◀── tablas staging ◀── pbi-sync-* │◀── pg_cron
 │  (5core)     │              │                                                 │          │
 │  TanStack Q  │ ───────────▶ │  Edge functions proxy: qb-query, notion-query,  │          │
 └──────────────┘              │  powerbi-execute-query, nexiatask-proxy,        │          │
                               │  admin-users                                    │          │
                               └───────┬──────────┬───────────┬──────────────────┼──────────┘
                                       ▼          ▼           ▼                  ▼
                                  QuickBooks    Notion     NexiaTask         Power BI
```

Dos patrones de acceso a datos:

1. **Staging (la mayoría de informes).** pg_cron dispara edge functions `pbi-sync-*` que leen Power BI con DAX y escriben tablas en Supabase. La app consulta esas tablas vía RPCs. Ventaja: rápido, sin límites de Power BI por usuario, reglas de negocio en SQL.
2. **En vivo.** Financiero y Cartera (QuickBooks), Presupuesto (DAX directo), Seguros (Notion) y Reportes (NexiaTask) se consultan en el momento a través de una edge function.

**Regla de seguridad del proyecto:** la app nunca llama directo a QuickBooks, Power BI, Notion ni NexiaTask. Todo pasa por una edge function que valida el JWT de Supabase; los secretos viven del lado del servidor (`starcorp_vault` y env secrets).

## Estructura del repo

```
app/                 Rutas expo-router (pantallas delgadas que montan templates)
  (auth)/            login, forgot-password, verify-code, reset-password
  (tabs)/            Consolidado (Home), Financiero, Informes, Reportes, Compañías + ocultas
src/
  components/        Diseño atómico: atoms (At*), molecules (Ml*), organisms (Or*), templates (Tm*), charts
  config/            supabase, query-client, query-focus, permissions, ota-updates
  hooks/queries/     Un hook TanStack Query por recurso; mutations/ aparte
  services/          Llamadas a Supabase / edge functions + normalizadores, por dominio
  stores/            Zustand: auth, filters, qb, global-search, toast
  theme/             tokens, gradients, shadows, chart-palette
  tw/                Wrappers NativeWind (View, Text, Pressable…) — usar siempre estos
  types/             Tipos de respuesta de cada API
  utils/             Formato de moneda/número/fecha, períodos, helpers
supabase/
  functions/         Edge functions (Deno)
  migrations/        Migraciones SQL (ojo: incompletas, ver 04-backend-supabase.md)
docs/                Esta documentación
components/, hooks/, constants/ (raíz)   Starter de Expo — código muerto, no usar
```

## Navegación

- `app/_layout.tsx` monta providers (SafeArea, QueryClient, Theme, fuentes Roboto), inicializa auth, el puente de foco y los updates OTA. Con `Stack.Protected` muestra `(tabs)` a usuarios logueados y `(auth)` al resto.
- **Tab bar** (`app/(tabs)/_layout.tsx`): 5 tabs visibles — Consolidado, Financiero, Informes, Reportes, Compañías — cada una protegida por permiso. Ocultas: perfil, clientes, usuarios (solo super_admin), egresos.
- Antes de renderizar las tabs se consulta el estado de QuickBooks; **si no hay empresa QB conectada, la app redirige a `/connect`**.
- El grid de Informes siempre queda debajo del stack (`anchor='index'`); si el informe se abrió desde Home, "atrás" vuelve a Home (`src/utils/informe-origin.ts`).

Detalle por pantalla en [03-app-frontend.md](03-app-frontend.md).

## Auth y permisos

- Login email + contraseña (Supabase Auth). Recuperación con código OTP de 6 dígitos por correo.
- Roles en `app_metadata.role`: `super_admin` (ve todo, administra usuarios y la conexión QB) y `usuario` (solo lo que tenga en `app_metadata.permissions`).
- Catálogo de permisos en `src/config/permissions.ts`: por sección (`consolidado.ver`, `informes.ver`…) y finos (`informes.cartera`, `empresas.vag`, `consolidado.utilidades`…).
- Los usuarios se crean desde la app (pantalla Usuarios → edge `admin-users`), con invitación por correo vía Resend.

## Documentos relacionados

- [04-backend-supabase.md](04-backend-supabase.md) — tablas, RPCs, cron, edge functions
- [05-linaje-de-datos.md](05-linaje-de-datos.md) — de dónde sale cada informe
- [06-reglas-de-negocio.md](06-reglas-de-negocio.md) — por qué los números salen como salen
