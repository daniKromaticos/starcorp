<p align="right"><img src="assets/isologo-badge.png" alt="Kromaticos" width="44"></p>

# Reglas de negocio

Reglas no obvias que explican por qué un número sale como sale. Cada una dice dónde está implementada. Si vas a cambiar una, lee primero su "por qué".

> La verdad de un RPC está en la BD, no en el repo (hay migraciones aplicadas sin archivo). Antes de tocar un RPC, consulta `select pg_get_functiondef('public.<nombre>'::regproc);`.

## Contabilidad 5 Stars (Consolidado)

### Convención de signos

| Métrica | Cuenta (`cuenta_nivel_1`) | Fórmula | Desde |
|---|---|---|---|
| Ingresos | 4 | `−SUM(saldo_final)` (con signo) | 0057 / 0059 (2026-10-20) |
| Costos | 6 | `SUM(saldo_final_ajustado)` (= `ABS(saldo_final)`) | 0041 (2026-08-03) |
| Gastos | 5 | `SUM(saldo_final_ajustado)` | 0041 |
| Utilidad | 4+5+6 | `−SUM(saldo_final)` (con signo) | 0042 |

- **Nunca usar `monto_reporte`.** Suma movimientos brutos por línea (reclasificaciones, traspasos internos) y sobre-estima 2–9× frente a Power BI. La vista legacy `mv_monthly_summary` todavía lo usa: no la consumas.
- Costos y gastos usan ABS porque así lo hacen las tarjetas del informe Power BI que mira el cliente, y se pidió que la app se vea igual. Consecuencia aceptada: una nota crédito **suma** en vez de restar.
- La utilidad **no es** ingresos − costos − gastos de las tarjetas: el informe la saca de la medida `[UTILIDAD]` con signo, y la app replica ese descuadre a propósito. `get_dashboard_summary` devuelve `utilidad` ya calculada; **no la derives en el front**.

### Períodos (filtro temporal)

| Filtro | Ventana actual | Comparación |
|---|---|---|
| `mtd` (Mes cte.) | Mes calendario en curso completo (1 → fin de mes) | Mismo mes del año anterior |
| `1w` | Hoy − 6 días → hoy (7 días) | Los 7 días inmediatamente anteriores |
| `1m` / `3m` / `12m` | **Meses cerrados**: N meses completos, sin el mes en curso | Misma ventana 12 meses antes (espejo año contra año) |

- La lógica está **duplicada**: `computePeriod` / `computePreviousPeriod` en `src/utils/date.ts` y los 6 RPCs contables. Un cambio exige tocar los dos lados.
- En la serie de tiempo, `3m` y `12m` usan buckets mensuales; el resto, hasta 12 buckets por días.
- Migraciones: 0018, 0019, 0024, 0025, 0045, 0056 (1w = 7 días), 0060 (mtd hasta fin de mes).

### Otras reglas

- **Cierre fiscal** (`detalle = 'Cierre periodo fiscal'`): se excluyó en 0022 y se **volvió a incluir** en 0046 en los 6 RPCs del dashboard. `get_client_metadata` sí lo excluye.
- **Nombre de centro de costo**: `centro_costo_nombre` va en MAYÚSCULAS, con trim y nunca NULL (rótulos "Centro X (sin nombre)", "Sin centro de costo"). El ERP cambió mayúsculas en 2025-08 y partía la historia de 11 clientes. Implementado en `centroDisplayName()` (`pbi-sync-auxiliar`) y 0053/0055. **Todo SQL manual que escriba esa columna debe respetarlo.**
- **Filas rezagadas**: cada re-auditoría de un asiento en el ERP genera un `source_hash` nuevo. Si la poda no corre, la versión vieja sigue sumando. Se poda por `synced_at` (`prune_accounting_stale`, 0039).
- **Agrupación de costos/gastos**: plana por `nombre_cuenta` (se probó un modelo jerárquico y se revirtió en 0016/0017).
- **Top de clientes**: solo clientes con ingreso > 0 (0054).

## BBM

- En `AuxiliarBBM` el `SALDO FINAL` es **acumulado**. El movimiento del período es `DEBITO − CREDITO`.
- Ingresos = `crédito − débito` en clase 4; gastos = `débito − crédito` en clases 5 y 6.
- `get_bbm_empresa_summary` compara el último mes con datos contra el anterior.

## Asociados (empleados)

- Activo = tiene `codigo_alterno`; se deduplica **por persona** (`codigo_alterno`), no por `id_employee`. `Retirement Date` llega siempre en blanco desde PBI.
- Se toma la asignación vigente (`start_date_area` más reciente).
- `empleados_summary` **no es fuente de verdad** (abandonada desde 2026-05). Ojo: el número "687" que aparece ahí no es el real.
- Tendencia: últimos 12 meses cerrados, headcount del último día registrado de cada mes (`historico_emp_cli`).

## Bancos

- Viene de la tabla curada `BANCOS` de Power BI, **no de QuickBooks**. La infraestructura QB del informe viejo (`qb-snapshot-bank-balances`, `bank_balance_snapshots`, `bank_account_exclusions`, `get_bank_balance_previous`) sigue corriendo pero ya no se usa.
- Delta = saldo actual vs último snapshot con fecha anterior a hoy, por empresa (`get_bancos_previous`).
- Fechas de la fuente en formato US (m/d/yyyy).

## Cartera (QuickBooks)

- Se excluyen los Customers **intercompañía** (las 6 empresas del grupo se facturan entre sí) y terceros, vía `qb_customer_exclusions`. Match por **nombre normalizado** (mayúsculas, solo alfanuméricos), no por `customer_id`. Si la tabla no se puede leer, el informe falla a propósito (mejor error que cifra inflada). 0050, 0058.
- Columnas del `AgedReceivableDetail` se resuelven por `ColType` (`subt_open_bal` / `subt_home_open_bal`), **nunca por índice**: Open Balance viene antes que Amount, y leer por posición sumaba el monto bruto en vez del saldo (bug de 91+ días). `cartera.service.ts`.
- Agregar una exclusión = `insert` en `qb_customer_exclusions`; no requiere release.

## Financiero (QuickBooks P&L)

- 5 tarjetas. Ingresos = Income + Other Income; Egresos = Expenses + Other Expenses; utilidad bruta y neta se derivan. `SECTION_GROUPS` en `src/services/quickbooks/normalizer.ts`.
- La **neta cuadra exacto** con el Net Income de QB; Ingresos, Egresos y bruta quedan por encima de sus renglones de QB porque absorben los bloques Other*.
- El P&L se pide sin `accounting_method` → base Accrual.
- Saldos de QB son **saldo de libro** (lo único que expone la API), no saldo del banco; los libros no siempre están conciliados.

## Presupuesto

- Único informe con DAX en vivo contra Power BI (tabla `PROYECCION`, grano semanal).
- "Mes corriente" = último mes con **≥ 4 semanas cargadas**, porque el último mes suele venir a medias.
- `PorcentajeEje` no es agregable. Montos en unidades (no millones). Ingresos solo desde abril 2026.
- La fuente se carga a mano y suele atrasarse: si el informe "no se actualiza", revisar primero la fuente.
- `presupuesto.service.ts`.

## Grupo Orion Holding (VAG)

- En la UI se llama "Grupo Orion Holding"; los ids internos siguen siendo `vag`.
- Fuente = `ListadoActivosVag` + `MovimientosVag`. **No** `AuxiliarVAG` (se probó y se revirtió en 0034).
- CxC / CxP son centros de costo "Cuentas por cobrar" / "Cuentas por pagar" dentro de los movimientos (match `ilike`); se filtran en el cliente.
- Activo ↔ movimiento se cruza por prefijo de centro de costo.
- Valor de activos = `SUM(valor_contable)`, delta siempre 0.

## Seguros (Notion)

- Tablero real de pólizas (desde 2026-08-25; antes se leía una copia CSV obsoleta de otro workspace).
- `Estado` ACTIVA/INACTIVA + `Motivo Inactividad`.
- La LLC es una relation que se resuelve contra un segundo tablero (`fetchLlcNames()`). `NOTION_ALLOWED_DBS` debe incluir los dos ids.
