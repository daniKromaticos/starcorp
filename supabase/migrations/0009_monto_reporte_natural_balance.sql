-- Replace monto_reporte with the accounting-correct formula:
--   ingresos (cuenta empieza en 4, naturaleza crédito) → creditos - debitos
--   gastos   (cuenta empieza en 5, naturaleza débito)  → debitos - creditos
--   costos   (cuenta empieza en 6, naturaleza débito)  → debitos - creditos
--
-- The previous formula (coalesce(saldo_final_ajustado, saldo_final * -1))
-- summed running balances row-by-row, which double-counted activity within a
-- period and produced negative utilidad despite a healthy margin. `Saldo Final`
-- in the source represents the end-of-day cumulative balance, not the movement
-- amount of the journal entry.

drop materialized view if exists mv_monthly_summary;

alter table accounting_entries drop column monto_reporte;

alter table accounting_entries
  add column monto_reporte numeric(18,2) generated always as (
    case substring(cuenta from 1 for 1)
      when '4' then (creditos - debitos)
      when '5' then (debitos - creditos)
      when '6' then (debitos - creditos)
      else 0
    end
  ) stored;

create materialized view mv_monthly_summary as
select
  date_trunc('month', fecha)::date as year_month,
  centro_costo_nombre,
  cuenta_nivel_1,
  sum(monto_reporte)               as total,
  count(*)                         as n_entries
from accounting_entries
group by 1, 2, 3;

create unique index mv_monthly_summary_uq
  on mv_monthly_summary (year_month, centro_costo_nombre, cuenta_nivel_1);

create index mv_monthly_summary_centro_idx
  on mv_monthly_summary (centro_costo_nombre);

revoke all on mv_monthly_summary from public, anon, authenticated;
