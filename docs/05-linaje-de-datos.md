<p align="right"><img src="assets/isologo-badge.png" alt="Kromaticos" width="44"></p>

# Linaje de datos por informe

De dónde sale cada número que muestra la app: sistema origen → sync → tabla Supabase → RPC / edge function → hook del front.

> Verificado contra la BD en vivo el 2026-11-25. Horarios en hora Colombia (UTC−5, sin horario de verano). pg_cron agenda en UTC.

## Resumen

| Informe (ruta) | Origen | Sync | Tabla(s) Supabase | Acceso | Hook / servicio | Frescura |
|---|---|---|---|---|---|---|
| **Consolidado** (ingresos/costos/gastos/utilidad, clientes, drill-down) — `app/(tabs)/(consolidado)/*`, `egresos/*` | Power BI, dataset Auxiliar, tabla `Auxiliar` (cuentas 4/5/6) | `pbi-sync-auxiliar` | `accounting_entries` | RPCs `get_dashboard_summary`, `get_consolidated_timeseries`, `get_top_clients`, `get_consolidated_clients`, `get_client_cost_groups`, `get_group_terceros` | `use-dashboard-summary`, `use-dashboard-timeseries`, `use-top-clients`, `use-consolidado-clients`, `use-cost-groups`, `use-third-parties` | Cada 8 h (ventana 90 días) + refresco de 12 meses los domingos |
| **Ficha de cliente** (dirección, líder, vigencia, empleados) | PBI `ListadoClientes5Stars` + `empleadosHotel` + `accounting_entries` | `pbi-sync-clientes`, `pbi-sync-empleados` | `clientes_master` (JSONB), `empleados_detail` | RPC `get_client_metadata` | `use-client-metadata` (+ `pickField()` en `or-client-detail.tsx`) | Diario 6:00 |
| **Empresas → BBM** — `empresas/[empresaId]` | PBI `AuxiliarBBM` (mismo dataset que Auxiliar) | `pbi-sync-bbm` (historia completa) | `bbm_entries` | RPCs `get_bbm_empresa_summary`, `get_bbm_empresa_detail` | `empresas.service.ts` → `use-empresas`, `use-empresa-detail` | Diario 6:00 (**la fuente PBI suele venir atrasada**) |
| **Grupo Orion Holding** (ids internos `vag`) — `empresas/vag/*` | PBI `ListadoActivosVag` + `MovimientosVag` | `pbi-sync-vag` | `vag_activos`, `vag_movimientos`, `vag_activo_docs` | RPCs `get_vag_resumen`, `get_vag_activos`, `get_vag_movimientos`, `get_vag_cuentas`, `get_vag_empresa_summary` | `vag.service.ts`, `vag-docs.service.ts` → `use-vag` | Diario 6:00 |
| **Financiero** — `financiero/*` | QuickBooks Online en vivo: `ProfitAndLoss` (por empresa/realm), `GeneralLedger` para detalle | — | — | Edge `qb-query` | `use-company-metrics`, `use-company-summaries`, `use-qb-profit-and-loss`, `use-qb-pnl-trend`, `use-qb-general-ledger` (normaliza `src/services/quickbooks/normalizer.ts`) | En vivo (cache 5 min) |
| **Asociados** — `informes/asociados` | PBI `empleadosHotel` + `HistoricoEmpXCli` | `pbi-sync-empleados`, `pbi-sync-historico` ⚠️ | `empleados_detail`, `historico_emp_cli` | RPCs `get_asociados_snapshot`, `get_asociados_trend` | `asociados.service.ts` → `use-asociados`, `use-asociados-trend` | Diario 6:00 |
| **Bancos** — `informes/bancos` | PBI tabla curada `BANCOS` (**ya no QuickBooks**) | `pbi-sync-bancos` | `bancos`, `bancos_snapshots` | Lectura directa de `bancos` + RPC `get_bancos_previous` (delta vs día anterior) | `bancos.service.ts` → `use-bancos` | Cada 4 h |
| **Cartera** — `informes/cartera` | QuickBooks en vivo, reporte `AgedReceivableDetail` | — | `qb_customer_exclusions` (solo filtro) | Edge `qb-query` | `cartera.service.ts` → `use-cartera` | En vivo |
| **Pagos** — `informes/pagos` | PBI `BITACORA` | `pbi-sync-pagos` ⚠️ | `pagos_bitacora` (lectura paginada) | Lectura directa | `pagos.service.ts` → `use-pagos` | Diario 6:00 |
| **Presupuesto** — `informes/presupuesto` | PBI tabla `PROYECCION`, **DAX en vivo** | — | — | Edge `powerbi-execute-query` | `presupuesto.service.ts` → `use-presupuesto` | En vivo, pero la fuente se carga a mano y se atrasa |
| **Seguros** — `informes/seguros/*` | Notion: tablero de pólizas + tablero de LLCs | — | — | Edge `notion-query` | `seguros.service.ts`, `src/services/notion/*` → `use-seguros` | En vivo |
| **Repositorio Alejandro** — `empresas/repositorio-alejandro/*` | Archivos subidos por usuarios | — | `repo_apartados`, `repo_archivos`, bucket `repositorio` | supabase-js directo | `repositorio.service.ts` → `use-repositorio` | Manual |
| **Reportes (NexiaTask)** — `reportes/*` | API externa NexiaTask | — | — | Edge `nexiatask-proxy` | `nexiatask.service.ts` → `use-nexiatask-*` | En vivo |
| **Usuarios** — `usuarios/*` | Supabase Auth (`app_metadata.role`, `permissions`) | — | `auth.users`, bucket `avatars` | Edge `admin-users` | `usuarios.service.ts` → `use-usuarios`; catálogo en `src/config/permissions.ts` | En vivo |

⚠️ `pbi-sync-pagos` y `pbi-sync-historico` corren en producción **pero su código no está en el repo** (ver [04-backend-supabase.md](04-backend-supabase.md)).

## Diagrama general

```
            ┌──────────── Power BI (datasets Auxiliar, Clientes, Empleados) ─────────────┐
            │  Auxiliar · AuxiliarBBM · BANCOS · BITACORA · ListadoClientes5Stars ·       │
            │  empleadosHotel · HistoricoEmpXCli · ListadoActivosVag · MovimientosVag ·   │
            │  PROYECCION (solo en vivo)                                                  │
            └───────────────┬────────────────────────────────────────────┬────────────────┘
                            │ DAX executeQueries (service principal Azure)│
              pg_cron ──▶ edge pbi-sync-*                         edge powerbi-execute-query
                            │ upsert + prune                              │ (Presupuesto)
                            ▼                                             │
                   Supabase Postgres (tablas + RPCs SECURITY DEFINER)     │
                            │                                             │
   QuickBooks Online ──▶ edge qb-query (Financiero, Cartera) ─────────────┤
   Notion ─────────────▶ edge notion-query (Seguros) ─────────────────────┤
   NexiaTask ──────────▶ edge nexiatask-proxy (Reportes) ─────────────────┤
                            ▼                                             ▼
                     App Expo (TanStack Query, staleTime 5 min) ◀─────────┘
```

La app **nunca** llama directo a Power BI, QuickBooks, Notion ni NexiaTask: todo pasa por edge functions que validan el JWT de Supabase (o el `x-cron-secret` en el caso de los syncs).

## Datos de cada sync

| Sync | Tabla PBI | Estrategia | Particularidades |
|---|---|---|---|
| `pbi-sync-auxiliar` | `Auxiliar`, filtro `Fecha ∈ [from,to)` y `LEFT(Cuenta8,1) ∈ {4,5,6}` | Upsert por `source_hash` en lotes de 2000 → poda por `synced_at` (`prune_accounting_stale`) | Por defecto `to = max(mañana, fin de mes en curso)`, `from = to − 90 días`, porque hay asientos fechados a futuro. No poda si PBI responde vacío. Normaliza `centro_costo_nombre` con `centroDisplayName()`. |
| `pbi-sync-bbm` | `AuxiliarBBM` | Historia completa cada corrida (~13k filas), upsert + poda | `SALDO FINAL` es **acumulado**; el movimiento es `DEBITO − CREDITO`. |
| `pbi-sync-bancos` | `BANCOS` | Upsert en `bancos` (PK empresa+numero_cuenta), poda, y foto diaria en `bancos_snapshots` | Fechas **m/d/yyyy (formato US)**. `ESTADO` ∈ CONTROL / SOLO QUICKBOOKS. |
| `pbi-sync-clientes` | `ListadoClientes5Stars` | `SELECT *` → `clientes_master(id_centro_costo, data jsonb)`, solo upsert (no poda) | Quita el prefijo `Tabla[...]` de las columnas. El front lee campos con `pickField()`. |
| `pbi-sync-empleados` | `empleadosHotel` | Colapsa a 1 fila por empleado (asignación vigente) → `empleados_detail`, poda | `""` → NULL. Activos = tienen `codigo_alterno`, deduplicados por persona. |
| `pbi-sync-historico` | `HistoricoEmpXCli` | → `historico_emp_cli` | Headcount histórico para la tendencia de Asociados. |
| `pbi-sync-pagos` | `BITACORA` | → `pagos_bitacora` | — |
| `pbi-sync-vag` | `ListadoActivosVag`, `MovimientosVag` | Activos: upsert por código. Movimientos: insert + poda (el código no es único) | `fixMojibake` (cp1252→utf8); montos en texto colombiano ("170.000.000"); fechas m/d/yyyy. **No usar `AuxiliarVAG`**. |
