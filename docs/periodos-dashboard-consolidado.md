# Periodos del Dashboard Consolidado (Empresas)

Explica **cómo el dashboard "Empresas" toma los rangos de fecha** para estimar
ingresos, costos, gastos y utilidad en cada filtro de tiempo
(`Mes cte.`, `1 sem`, `1 mes`, `3 meses`, `12 meses`), y **por qué solo el mes
corriente coincide exactamente con Power BI**.

---

## 1. La diferencia clave con Power BI (TL;DR)

| | Cómo elige el periodo |
|---|---|
| **Power BI** | El slicer **MES** selecciona **meses calendario completos** (marcas `mayo` → todo mayo, día 1 al 31). |
| **App / Dashboard** | Los filtros son **ventanas móviles que terminan HOY** (`current_date`). `3 meses` = los últimos 90 días contados hacia atrás desde hoy, **no** "marzo + abril + mayo". |

Por eso:

- **`Mes cte.` coincide** con marcar `mayo` en PBI → ambos van del **1 de mayo** a
  hoy/fin de mes, y como los datos solo llegan hasta mediados de mes, dan igual.
- **`1 mes`, `3 meses`, `12 meses` NO coinciden** con marcar meses en PBI →
  son ventanas que **parten meses por la mitad** (ej. del 21‑abr al 21‑may).
  No es un error: es una definición distinta de "periodo".

---

## 2. Cómo se calcula cada periodo

`current_date` = fecha del servidor (UTC). En los ejemplos: **hoy = 2026‑05‑21**.

Lógica en el RPC `get_dashboard_summary` (la cifra grande del encabezado):

| Filtro UI | Clave RPC | Fórmula del inicio | Rango (ejemplo hoy = 2026‑05‑21) | Días |
|---|---|---|---|---|
| Mes cte. | `mtd` | primer día del mes actual | **2026‑05‑01 → 2026‑05‑21** | 21 |
| 1 sem | `1w` | hoy − 7 días | **2026‑05‑14 → 2026‑05‑21** | 8 |
| 1 mes | `1m` | hoy − 1 mes | **2026‑04‑21 → 2026‑05‑21** | 31 |
| 3 meses | `3m` | hoy − 3 meses | **2026‑02‑21 → 2026‑05‑21** | 90 |
| 12 meses | `12m` | hoy − 12 meses | **2025‑05‑21 → 2026‑05‑21** | 366 |

- El **fin del rango siempre es hoy**.
- El rango incluye ambos extremos: `fecha >= inicio AND fecha <= hoy`.
- Sobre ese rango se suma: `ingresos = SUM(saldo_final)` de cuentas nivel 4 × −1,
  `costos` = cuentas nivel 6, `gastos` = cuentas nivel 5,
  `utilidad = ingresos − costos − gastos` (misma fórmula que las medidas de PBI).

---

## 3. El periodo de comparación ("Comparativo" / delta %)

El `%` que aparece junto a cada cifra compara contra el **periodo inmediatamente
anterior, de la misma duración**:

```
duración      = hoy − inicio
fin_anterior  = inicio − 1 día
inicio_anterior = fin_anterior − duración
```

Ejemplo `1 mes` (hoy = 2026‑05‑21):

- Periodo actual: **2026‑04‑21 → 2026‑05‑21**
- Periodo anterior: **2026‑03‑21 → 2026‑04‑20**

No es "el mes calendario anterior" — es la **ventana anterior del mismo largo**.

---

## 4. Detalle: encabezado vs. gráfico

Hay **dos RPC** y calculan el inicio con ~1 día de diferencia:

| | `get_dashboard_summary` (cifra grande) | `get_consolidated_timeseries` (área del gráfico) |
|---|---|---|
| 1 sem | hoy − 7 días | hoy − 6 días |
| 1 mes | hoy − 1 mes | (hoy − 1 mes) + 1 día |
| 3 meses | hoy − 3 meses | (hoy − 3 meses) + 1 día |
| 12 meses | hoy − 12 meses | (hoy − 12 meses) + 1 día |
| Fin | hoy (inclusive) | hoy + 1 (exclusivo) |

Es una inconsistencia menor (el total del encabezado abarca ~1 día más que el
gráfico). `Mes cte.` sí es idéntico en ambos. Conviene unificarlo.

---

## 5. Por qué "Mes cte." cuadra y los demás no

**Mes cte.** → ventana `2026‑05‑01 → hoy`. En PBI, marcar `mayo` →
`Auxiliar[Fecha]` en todo mayo. Como los datos del Auxiliar solo llegan hasta
**2026‑05‑15**, "del 1 al 21" y "todo mayo" suman exactamente las mismas filas.
→ **Coinciden al céntimo** ($104.926 / $92.048 / $17.110 / −$4.232).

**1 mes / 3 meses / 12 meses** → ventanas que empiezan a mitad de mes
(21‑abr, 21‑feb, 21‑may‑2025). En PBI no existe un checkbox equivalente; lo más
cercano es marcar varios meses completos, pero:

- App `3 meses` = **21‑feb → 21‑may** (incluye media‑febrero y media‑mayo).
- PBI marcando `mar + abr + may` = **1‑mar → 31‑may** (meses completos).

Son rangos distintos → las cifras difieren. **No es un error de datos** — los
datos base ya están alineados con PBI; lo que difiere es **qué intervalo de
fechas suma cada herramienta.**

---

## 6. Cómo reconciliar / recomendación

- **Validar contra PBI:** marca en PBI los meses calendario y compara contra una
  consulta con el **mismo rango calendario** (no contra los filtros móviles del
  dashboard).
- **Para que el dashboard cuadre con la lógica de PBI:** habría que cambiar los
  filtros de "ventana móvil" a **selección de meses calendario** (ej. `1 mes` =
  mes calendario anterior completo; `3 meses` = los 3 meses calendario previos).
  Es una decisión de producto: cambiaría el comportamiento de los RPC
  `get_dashboard_summary` y `get_consolidated_timeseries`.

> Nota: el Auxiliar es un dataset vivo. Aunque el rango llegue "hasta hoy", solo
> hay datos hasta la última sincronización (actualmente **2026‑05‑15**).
