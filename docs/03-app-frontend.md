<p align="right"><img src="assets/isologo-badge.png" alt="Kromaticos" width="44"></p>

# App (frontend)

## Pantallas

### Autenticación — `app/(auth)/`

| Ruta | Qué hace | Hook |
|---|---|---|
| `login` | Email + contraseña | `useLogin` |
| `forgot-password` | Pide el correo y envía un código OTP | `useRequestPasswordReset` |
| `verify-code` | Ingresa el código de 6 dígitos | `useVerifyResetCode` |
| `reset-password` | Nueva contraseña con medidor de fuerza | `useUpdatePassword` |

Mientras dura la recuperación, `passwordRecovery = true` mantiene al usuario en `(auth)` aunque `verifyOtp` ya haya abierto sesión.

### Consolidado (Home) — `app/(tabs)/(consolidado)/`

| Ruta | Qué muestra | Fuente |
|---|---|---|
| `index` | Dashboard: gráfico de ingresos, 4 tarjetas (ingresos/costos/gastos/utilidad), top clientes, resumen Financiero, accesos a Informes, reportes recientes | `useDashboardSummary`, `useDashboardTimeseries`, `useTopClients`, `useCompanySummaries`, hooks de informes, NexiaTask |
| `ingresos`, `costos`, `gastos`, `utilidad` | Lista de clientes por categoría | `useConsolidadoClients` |
| `ingresos/[clientId]` | Ficha del cliente (metadata, cartera, saldo QB) | `useClientMetadata`, `useCartera`, `useQBCustomerBalance` |
| `costos\|gastos/[clientId]` | Grupos de cuentas del cliente | `useCostGroups` |
| `costos\|gastos/[clientId]/[groupId]` | Terceros del grupo | `useThirdParties` |

Cada tarjeta y sección del Home se muestra según permisos finos (`consolidado.utilidades`, etc.).

### Financiero — `app/(tabs)/financiero/` (QuickBooks en vivo)

| Ruta | Qué muestra | Fuente |
|---|---|---|
| `index` | 5 tarjetas del P&L, selector de período y de empresa | `useCompanies`, `useCompanyMetrics` |
| `ingresos` | Detalle de ingresos | `useQBProfitAndLoss` |
| `costos`, `egresos` | Secciones COGS / Expenses | `useQBProfitAndLoss` |
| `costos\|egresos/[groupId]` | Cuentas → terceros | `useQBProfitAndLoss` + `useQBGeneralLedger` |

La empresa activa se guarda en `qb.store` (`activeRealmId`).

### Informes — `app/(tabs)/informes/`

| Informe | Rutas | Hook |
|---|---|---|
| Grid | `index` (6 informes) | — |
| Cartera | `cartera/index`, `cartera/[clientId]` | `useCartera` |
| Asociados | `asociados/index`, `asociados/[clientId]` | `useAsociados`, `useAsociadosTrend` |
| Bancos | `bancos/index`, `bancos/[empresaId]` | `useBancos` |
| Presupuesto | `presupuesto/index` | `usePresupuesto` |
| Pagos | `pagos/index` (calendario por día) | `usePagos` |
| Seguros | `seguros/index`, `propiedades`, `vehiculos/*`, `companias/*` | `useSeguros` |

**Botón atrás:** el stack tiene `anchor='index'`, así que el grid siempre queda debajo. Si el informe se abrió desde Home (`setInformeOrigin('home')` en `src/utils/informe-origin.ts`), al salir vuelve a Home; los push desde otra tab deben usar `withAnchor: true`.

### Compañías — `app/(tabs)/empresas/`

| Ruta | Qué muestra | Fuente |
|---|---|---|
| `index` | Tarjetas BBM, Grupo Orion Holding, Repositorio Alejandro | `useEmpresas` |
| `[empresaId]` | Detalle BBM: categorías, donut, terceros | `useEmpresaDetail` |
| `vag/index`, `activos`, `movimientos`, `cobrar`, `pagar` | Grupo Orion Holding (ids `vag`) | `useVag*` |
| `repositorio-alejandro/*` | CRUD de apartados y archivos | `use-repositorio` |

### Otras

| Ruta | Qué muestra |
|---|---|
| `reportes/*` | Tareas de NexiaTask por departamento y detalle |
| `usuarios/*` | Lista, invitar, editar permisos, eliminar (solo super_admin) |
| `perfil/*` | Perfil, avatar, cambio de contraseña |
| `connect` | Conexión OAuth de QuickBooks |

El menú lateral (`or-drawer.tsx`) da acceso a todas las secciones. "Usuarios" y "Conexión QuickBooks" solo aparecen para super_admin.

## Estado y datos

- **TanStack Query** (`src/config/query-client.ts`): `staleTime` 5 min, `gcTime` 30 min, retry 2, refetch al volver a primer plano (`query-focus.ts` conecta AppState con `focusManager`). Las keys se centralizan en `query-keys.ts`; casi todas las queries usan `placeholderData` con el valor anterior para no parpadear al cambiar de filtro.
- **Zustand** (`src/stores/`):

  | Store | Para qué |
  |---|---|
  | `auth` | Sesión, usuario, `passwordRecovery` |
  | `filters` | Período activo (`today`, `1w`, `1m`, `3m`, `12m`) |
  | `qb` | Empresa QuickBooks activa |
  | `global-search` | Modal de búsqueda global |
  | `toast` | Mensajes de confirmación |

- **Servicios** (`src/services/<dominio>/`): llaman a Supabase (RPC, tabla o edge function) y normalizan la respuesta a los tipos de `src/types/`. Varios pasan por `withMock()` (`src/services/mock/mock-adapter.ts`), que devuelve mocks salvo que `EXPO_PUBLIC_USE_MOCKS === 'false'`.

## Componentes y estilo

- Diseño atómico con prefijos: `At*` (atoms), `Ml*` (molecules), `Or*` (organisms), `Tm*` (templates). Archivos `at-*.tsx`, `ml-*.tsx`, `or-*.tsx`, `tm-*.tsx`.
- Los componentes **sin prefijo** (`chip.tsx`, `delta-indicator.tsx`, `drawer.tsx`, `dashboard-template`…) son legacy y casi todos están sin uso. Excepción: `atoms/skeleton.tsx` sigue en uso, en paralelo con `AtSkeleton`. Para código nuevo, usa siempre la versión con prefijo.
- Las pantallas son delgadas: montan un template `Tm*` que compone organisms.
- Todo componente de datos tiene estado de carga con skeleton.
- Los gráficos (`src/components/charts/`: área, barras, donut, gauge) son SVG propios, sin librería externa.

### Estilo

- NativeWind 5 con Tailwind v4. **`className` solo funciona en los wrappers de `@/src/tw`** (`View`, `Text`, `Pressable`, `ScrollView`…). En componentes core de React Native (`SafeAreaView`, `KeyboardAvoidingView`) se ignora sin error: ahí usa `style`.
- Se mezclan `className` y `style={{...}}` para valores que Tailwind no expresa (colores de marca, sombras, valores dinámicos). Respeta el mecanismo del archivo que edites.
- Usa los tokens de `src/theme/tokens.ts` y los gradientes y sombras de `src/theme/` en vez de números sueltos.
- **Tamaño de letra:** `Text`/`TextInput` de `@/src/tw` aplican `ALLOW_SYSTEM_FONT_SCALING` y `MAX_FONT_SCALE` (`tokens.ts`). Hoy la app ignora el tamaño de letra del sistema (`ALLOW_SYSTEM_FONT_SCALING = false`). Nunca uses `Text` directo de `react-native`.
- **Verificación de layout:** prueba todo cambio de UI a ~320dp de ancho (zoom de pantalla del sistema). `allowFontScaling` no frena el zoom de pantalla.

## Formato

- Moneda y números: `src/utils/currency.ts` y `number.ts` (locale `es-AR`, moneda por defecto USD con "$" manual; formato compacto `$1.4M` / `$38k`).
- Períodos: `computePeriod` / `computePreviousPeriod` en `src/utils/date.ts`. **Esta lógica está duplicada en los RPCs**; ver [06-reglas-de-negocio.md](06-reglas-de-negocio.md#períodos-filtro-temporal).

## Agregar un informe nuevo (receta)

1. **Datos.** Si viene de Power BI, crea una edge function `pbi-sync-<x>` que copie el patrón de `pbi-sync-bancos` (auth, token Azure, DAX, upsert, poda, `pbi_sync_log`), más la tabla, la función `trigger_pbi_sync_<x>()` y el job de cron en una migración versionada.
2. **Lectura.** Escribe un RPC si hay agregación, o lee la tabla directo. Revoca `EXECUTE` a `anon` en los RPCs nuevos.
3. **Tipos.** `src/types/<x>.types.ts`.
4. **Servicio.** `src/services/<x>/<x>.service.ts`.
5. **Hook.** `src/hooks/queries/use-<x>.ts` con key en `query-keys.ts` y `staleTime` de 5 min.
6. **UI.** Template `Tm*` + ruta en `app/(tabs)/informes/<x>/`, entrada en el grid, permiso en `src/config/permissions.ts` y skeleton de carga.
7. **Documentación.** Agrega una fila en [05-linaje-de-datos.md](05-linaje-de-datos.md) y sus reglas en [06-reglas-de-negocio.md](06-reglas-de-negocio.md).
