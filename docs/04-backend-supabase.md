<p align="right"><img src="assets/isologo-badge.png" alt="Kromaticos" width="44"></p>

# Backend: Supabase

Supabase cumple tres roles: **base de datos** (staging de Power BI + RPCs de agregación), **proxy seguro** hacia sistemas externos (edge functions) y **auth/storage**.

> Inventario tomado de la BD en vivo el 2026-11-25. El repo **no** es fuente fiel de la BD: ver "Drift" al final.

## Tablas (`public`)

Todas tienen RLS activo, salvo la vista materializada `mv_monthly_summary`.

| Tabla | Filas aprox. | Qué guarda | La escribe | Lectura desde la app |
|---|---|---|---|---|
| `accounting_entries` | 288k | Auxiliar contable 5 Stars (cuentas 4/5/6). Columnas clave: `cuenta_nivel_1`, `centro_costo_nombre`, `nit`, `saldo_final`, `saldo_final_ajustado`, `source_hash`, `synced_at` | `pbi-sync-auxiliar` | Vía RPCs |
| `bbm_entries` | 13k | Auxiliar de BBM (débito, crédito, cuenta4, tercero) | `pbi-sync-bbm` | Vía RPCs |
| `bancos` | 19 | Saldo actual por cuenta bancaria | `pbi-sync-bancos` | SELECT directo |
| `bancos_snapshots` | 1.8k | Foto diaria de `bancos` (para delta) | `pbi-sync-bancos` | Vía RPC |
| `clientes_master` | 86 | Maestro de clientes: `id_centro_costo` + `data` JSONB | `pbi-sync-clientes` | Vía RPC |
| `empleados_detail` | 1.1k | Empleado × área (asignación vigente) | `pbi-sync-empleados` | Vía RPCs |
| `historico_emp_cli` | 9.9k | Headcount histórico por código y fecha | `pbi-sync-historico` | Vía RPC |
| `pagos_bitacora` | 11.7k | Bitácora de pagos | `pbi-sync-pagos` | SELECT paginado |
| `vag_activos` | 11 | Activos de Grupo Orion | `pbi-sync-vag` | Vía RPCs |
| `vag_movimientos` | 152 | Movimientos de Grupo Orion (incluye CxC/CxP) | `pbi-sync-vag` | Vía RPCs |
| `vag_activo_docs` | 0 | Documentos por activo (`storage_path`) | App | CRUD |
| `repo_apartados`, `repo_archivos` | 2 / 2 | Repositorio: carpetas y archivos | App | CRUD |
| `qb_customer_exclusions` | 56 | Customers intercompañía excluidos de Cartera | Manual | SELECT |
| `qb_user_tokens` | 6 | Tokens OAuth QuickBooks por usuario y realm | `qb-oauth-callback`, `qb-query` (refresh) | Nunca |
| `qb_oauth_states` | — | Nonce del flujo OAuth QB | `qb-oauth-init` | Nunca |
| `starcorp_vault` | 20 | Secretos server-side clave/valor | Manual | Nunca (solo service_role) |
| `pbi_sync_log` | 2.4k | Log de cada sync: status, filas, duración, error | Todas las `pbi-sync-*` | SELECT |
| **Legacy** `bank_balance_snapshots`, `bank_account_exclusions` | 8.9k / 24 | Saldos bancarios QB del informe Bancos viejo | `qb-snapshot-bank-balances` | No se usa |
| **Legacy** `empleados_summary` | 46 | Resumen de empleados, abandonado desde 2026-05-15 | Nadie | No se usa |
| **Legacy** `mv_monthly_summary` (MV) | 4.8k | Mes × centro × nivel_1 sobre `monto_reporte` (prohibido) | `refresh_mv_monthly_summary()` | No se usa |

## RPCs

Todas son `SECURITY DEFINER` con `search_path = public`. Las reglas de cálculo están en [06-reglas-de-negocio.md](06-reglas-de-negocio.md).

**Consolidado (5 Stars)**: `get_dashboard_summary(p_period, p_centro_costo, p_compare)`, `get_consolidated_timeseries`, `get_top_clients(p_period, p_limit, p_compare)`, `get_consolidated_clients(p_category, p_period, p_compare)`, `get_client_cost_groups(p_centro_costo, p_category, ...)`, `get_group_terceros(p_centro_costo, p_group_code, ...)`, `get_client_metadata(p_centro_costo)`.

**Asociados**: `get_asociados_snapshot()`, `get_asociados_trend()`.

**Bancos**: `get_bancos_previous()` (vigente), `get_bank_balance_previous()` (legacy QB).

**BBM**: `get_bbm_empresa_summary()`, `get_bbm_empresa_detail(p_year, p_month)`.

**Grupo Orion (VAG)**: `get_vag_resumen()`, `get_vag_activos()`, `get_vag_cuentas(p_tipo)`, `get_vag_movimientos()`, `get_vag_empresa_summary()`.

**Infraestructura de sync** (no son para la app):

| Función | Qué hace |
|---|---|
| `trigger_pbi_sync_{auxiliar,bancos,bbm,clientes,empleados,historico,pagos,vag}()`, `trigger_qb_snapshot_bank_balances()` | `net.http_post` a la edge function con header `x-cron-secret` (URL y secreto desde `starcorp_vault`) |
| `pbi_sync_range(from, to)` | Sync del Auxiliar para un rango |
| `pbi_sync_backfill_quarters(start, end)` | Un sync por trimestre, en paralelo |
| `pbi_sync_refresh_months(from_off, to_off)` | Un POST por mes relativo; rechaza tandas > 6 meses |
| `prune_accounting_stale(from, to, before, limit)` | Borra filas del rango con `synced_at` anterior al corte |

## Agenda (pg_cron)

| Job | Cron (UTC) | Hora Colombia |
|---|---|---|
| `pbi-sync-auxiliar-8h` | `0 3,11,19 * * *` | 22:00, 6:00, 14:00 |
| `pbi-sync-bancos-4h` | `0 3,7,11,15,19,23 * * *` | cada 4 h desde 22:00 |
| `pbi-sync-{clientes,empleados,pagos,historico,bbm,vag}-daily`, `qb-snapshot-bank-balances-daily` | `0 11 * * *` | 6:00 |
| `pbi-sync-refresh-12m-1..4` | `0/3/6/9 7 * * 0` | domingos 2:00–2:09 (12 meses en 4 tandas) |

> El estado `succeeded` en `cron.job_run_details` solo significa que el `http_post` se encoló. El resultado real del sync está en `pbi_sync_log`.

## Edge functions

Hay 29 desplegadas; 18 tienen código en `supabase/functions/`. No hay código compartido (`_shared/`): auth, CORS y token de Azure están copiados en cada función.

| Función | Llamada por | Auth | Sistema externo |
|---|---|---|---|
| `pbi-sync-auxiliar`, `-bbm`, `-bancos`, `-clientes`, `-empleados`, `-vag` | pg_cron (o app) | `x-cron-secret` o JWT de usuario | Power BI DAX |
| `pbi-sync-pagos`, `pbi-sync-historico` | pg_cron | ídem | Power BI DAX — **sin código en el repo** |
| `powerbi-execute-query` | App (Presupuesto) | JWT | Power BI DAX |
| `powerbi-embed-token`, `powerbi-list-reports` | Sin uso actual | JWT | Power BI REST |
| `qb-oauth-init` | App (super_admin) | JWT super_admin | Intuit OAuth |
| `qb-oauth-callback` | Redirect de Intuit | Nonce de un solo uso | Intuit OAuth |
| `qb-query` | App (Financiero, Cartera) | JWT | QuickBooks API |
| `qb-companies`, `qb-disconnect` | App | JWT super_admin | QuickBooks |
| `qb-snapshot-bank-balances` | pg_cron | `x-cron-secret` | QuickBooks (legacy) |
| `notion-query` | App (Seguros) | JWT + lista blanca de DBs | Notion |
| `nexiatask-proxy` | App (Reportes) | JWT + lista blanca de endpoints | NexiaTask |
| `admin-users` | App (Usuarios) | JWT super_admin | Supabase Auth Admin + Resend |
| `*-diag*`, `pbi-dax-probe`, `debug-resend` (9) | Diagnóstico manual | Varía | — **sin código en el repo; candidatas a borrar** |

## Secretos

- **`starcorp_vault`** (tabla, solo service_role): `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, `AZURE_CLIENT_SECRET`, `PROJECT_URL`, `PBI_SYNC_CRON_SECRET`, `PBI_{AUXILIAR,CLIENTES,EMPLEADOS}_{DATASET,GROUP}_ID`, `QB_CLIENT_ID`, `QB_CLIENT_SECRET`, `QB_ENVIRONMENT`, `NEXIATASK_API_KEY`, `NOTION_TOKEN`, `NOTION_DB_SEGUROS`, `NOTION_ALLOWED_DBS`, `ADMIN_USER_ID`, `RESEND_API_KEY`.
- **Env secrets de edge functions** (Dashboard → Edge Functions → Secrets): `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `INVITE_FROM_EMAIL`, `NEXIATASK_API_KEY`.
- **Tokens QuickBooks**: en `qb_user_tokens` (no en `starcorp_vault`), bajo el usuario `ADMIN_USER_ID`.

## Storage

| Bucket | Público | Uso | Policies |
|---|---|---|---|
| `avatars` | Sí | Fotos de perfil | Lectura pública; cada usuario escribe solo en `auth.uid()/` |
| `repositorio` | No | Repositorio Alejandro y documentos de activos VAG (`vag/{id}/`) | CRUD para cualquier usuario autenticado |

## Drift entre repo y BD

- La BD registra 79 migraciones; el repo tiene 60 archivos (`0002`–`0060`, con dos `0004`).
- ~21 migraciones de la BD no tienen archivo (entre ellas las que crean `starcorp_vault`, `empleados_detail`, `historico_emp_cli`, `pagos_bitacora` y sus triggers).
- `0059` y `0060` están en el repo y aplicadas, pero no registradas en el historial (se aplicaron con SQL directo).
- **Regla práctica**: para conocer un RPC, `pg_get_functiondef`; para una tabla, `list_tables` del MCP o el Dashboard. Toda migración nueva debe aplicarse con `apply_migration` **y** guardarse como archivo en `supabase/migrations/`.
