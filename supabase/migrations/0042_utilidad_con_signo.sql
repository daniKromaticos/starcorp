-- El informe de Power BI mezcla dos criterios y hay que replicar esa mezcla:
--
--   ingresos / costos / gastos → columna `SaldoFinalAjustado` (= ABS), migración 0041
--   utilidad                   → medida [UTILIDAD] = [Ingreso] − [CostoVentas] − [Gastos],
--                                que suma `Saldo Final` CON signo
--
-- Verificado con el cliente (julio 2026): el informe muestra ingresos
-- 1.624.584,70 / costos 1.352.805,92 / gastos 44.872,55 (los tres ABS) pero
-- utilidad 308.228,69, que es la medida con signo. Restando las tres tarjetas
-- daría 226.906,23.
--
-- Consecuencia: en pantalla la utilidad NO es igual a ingresos − costos −
-- gastos (en julio se separan 81.322). Es el mismo descuadre que ya tiene el
-- informe; se replica a propósito para que app e informe muestren lo mismo.
--
-- Por eso la utilidad se calcula aparte, con `saldo_final`, en vez de derivarse
-- de los tres totales. `get_dashboard_summary` se dropea porque cambia su
-- RETURNS TABLE (dos columnas nuevas).

drop function if exists public.get_dashboard_summary(text, text, boolean);

create function public.get_dashboard_summary(
  p_period text,
  p_centro_costo text default null::text,
  p_compare boolean default false
)
returns table(period_start date, period_end date, prev_start date, prev_end date,
              ingresos numeric, costos numeric, gastos numeric,
              ingresos_prev numeric, costos_prev numeric, gastos_prev numeric,
              utilidad numeric, utilidad_prev numeric)
language plpgsql
stable security definer
set search_path to 'public'
as $function$
declare
  v_today       date := current_date;
  v_month_start date := date_trunc('month', current_date)::date;
  v_start       date;
  v_end         date := v_today;
  v_prev_start  date;
  v_prev_end    date;
  v_span_days   integer;
  v_months      integer := null;
begin
  case p_period
    when 'mtd' then v_start := v_month_start;
    when '1w'  then v_start := v_today - interval '7 days';
    when '1m'  then v_start := (v_month_start - interval '1 month')::date;   v_end := v_month_start - 1;  v_months := 1;
    when '3m'  then v_start := (v_month_start - interval '3 months')::date;  v_end := v_month_start - 1;  v_months := 3;
    when '12m' then v_start := (v_month_start - interval '12 months')::date; v_end := v_month_start - 1;  v_months := 12;
    else raise exception 'invalid period: %, expected mtd|1w|1m|3m|12m', p_period;
  end case;

  if v_months is not null then
    -- Meses cerrados: el histórico son los N meses calendario anteriores.
    v_prev_start := (v_start - (v_months || ' months')::interval)::date;
    v_prev_end   := v_start - 1;
  else
    v_span_days  := (v_end - v_start);
    v_prev_end   := v_start - 1;
    v_prev_start := v_prev_end - v_span_days;
  end if;

  return query
  with cur as (
    select
      cuenta_nivel_1,
      sum(saldo_final_ajustado) as total_abs,
      sum(saldo_final)          as total_signed
    from accounting_entries
    where fecha >= v_start and fecha <= v_end
      and (p_centro_costo is null or centro_costo_nombre = p_centro_costo)
      and detalle is distinct from 'Cierre periodo fiscal'
    group by cuenta_nivel_1
  ),
  prev as (
    select
      cuenta_nivel_1,
      sum(saldo_final_ajustado) as total_abs,
      sum(saldo_final)          as total_signed
    from accounting_entries
    where p_compare
      and fecha >= v_prev_start and fecha <= v_prev_end
      and (p_centro_costo is null or centro_costo_nombre = p_centro_costo)
      and detalle is distinct from 'Cierre periodo fiscal'
    group by cuenta_nivel_1
  )
  select
    v_start, v_end, v_prev_start, v_prev_end,
    coalesce((select total_abs from cur  where cuenta_nivel_1 = 4), 0),
    coalesce((select total_abs from cur  where cuenta_nivel_1 = 6), 0),
    coalesce((select total_abs from cur  where cuenta_nivel_1 = 5), 0),
    coalesce((select total_abs from prev where cuenta_nivel_1 = 4), 0),
    coalesce((select total_abs from prev where cuenta_nivel_1 = 6), 0),
    coalesce((select total_abs from prev where cuenta_nivel_1 = 5), 0),
    -- [UTILIDAD] del modelo: ingreso (cuenta 4 × −1) − costo (6) − gasto (5),
    -- todo con `saldo_final` con signo.
    coalesce((select total_signed from cur  where cuenta_nivel_1 = 4), 0) * -1
      - coalesce((select total_signed from cur  where cuenta_nivel_1 = 6), 0)
      - coalesce((select total_signed from cur  where cuenta_nivel_1 = 5), 0),
    coalesce((select total_signed from prev where cuenta_nivel_1 = 4), 0) * -1
      - coalesce((select total_signed from prev where cuenta_nivel_1 = 6), 0)
      - coalesce((select total_signed from prev where cuenta_nivel_1 = 5), 0);
end;
$function$;

create or replace function public.get_consolidated_timeseries(
  p_period text,
  p_centro_costo text default null::text,
  p_compare boolean default false
)
returns table(bucket_idx integer, bucket_start date, bucket_end date,
              ingresos numeric, costos numeric, gastos numeric, utilidad numeric,
              ingresos_prev numeric, costos_prev numeric, gastos_prev numeric, utilidad_prev numeric)
language plpgsql
stable security definer
set search_path to 'public'
as $function$
declare
  v_today          date := current_date;
  v_month_start    date := date_trunc('month', current_date)::date;
  v_start          date;
  v_end_excl       date;
  v_monthly        boolean := false;
  v_n_months       int;
  v_prev_start     date;
  v_prev_end_excl  date;
  v_span_days      int;
  v_n_buckets      int;
  v_bsize          int;
begin
  case p_period
    when 'mtd' then v_start := v_month_start;                                v_end_excl := v_today + 1;
    when '1w'  then v_start := v_today - 6;                                  v_end_excl := v_today + 1;
    when '1m'  then v_start := (v_month_start - interval '1 month')::date;   v_end_excl := v_month_start;
    when '3m'  then v_start := (v_month_start - interval '3 months')::date;  v_end_excl := v_month_start;  v_monthly := true;
    when '12m' then v_start := (v_month_start - interval '12 months')::date; v_end_excl := v_month_start;  v_monthly := true;
    else raise exception 'invalid period: %, expected mtd|1w|1m|3m|12m', p_period;
  end case;

  -- Buckets diarios (mtd/1w/1m): se calculan siempre; sólo se usan si !v_monthly.
  v_span_days     := v_end_excl - v_start;
  v_n_buckets     := least(12, greatest(1, v_span_days));
  v_bsize         := ceil(v_span_days::numeric / v_n_buckets)::int;
  v_n_buckets     := least(v_n_buckets, ceil(v_span_days::numeric / v_bsize)::int);
  v_prev_end_excl := v_start;
  v_prev_start    := v_start - v_span_days;
  -- 1m: el previo es el mes calendario anterior completo (no "N días atrás",
  -- que con meses de 30/31 días desalinea la ventana, ej. 2-may → 31-may).
  if p_period = '1m' then
    v_prev_start := (v_start - interval '1 month')::date;
  end if;

  -- Cantidad de meses calendario del rango (3m → 3, 12m → 12).
  v_n_months := (extract(year from v_end_excl)::int * 12 + extract(month from v_end_excl)::int)
              - (extract(year from v_start)::int * 12 + extract(month from v_start)::int);

  return query
  with bkts as (
    select
      gs.i as bucket_idx,
      (v_start + (gs.i || ' months')::interval)::date                      as bstart,
      (v_start + ((gs.i + 1) || ' months')::interval)::date                as bend,
      (v_start + ((gs.i - v_n_months) || ' months')::interval)::date       as pstart,
      (v_start + ((gs.i + 1 - v_n_months) || ' months')::interval)::date   as pend
    from generate_series(0, v_n_months - 1) as gs(i)
    where v_monthly
    union all
    select
      gs.i as bucket_idx,
      (v_start + gs.i * v_bsize)                                 as bstart,
      least(v_start + (gs.i + 1) * v_bsize, v_end_excl)          as bend,
      (v_prev_start + gs.i * v_bsize)                            as pstart,
      case when gs.i = v_n_buckets - 1
        then v_prev_end_excl
        else least(v_prev_start + (gs.i + 1) * v_bsize, v_prev_end_excl)
      end                                                        as pend
    from generate_series(0, v_n_buckets - 1) as gs(i)
    where not v_monthly
  ),
  cur_agg as (
    select
      b.bucket_idx,
      sum(case when ae.cuenta_nivel_1 = 4 then ae.saldo_final_ajustado else 0 end) as ingresos,
      sum(case when ae.cuenta_nivel_1 = 6 then ae.saldo_final_ajustado else 0 end) as costos,
      sum(case when ae.cuenta_nivel_1 = 5 then ae.saldo_final_ajustado else 0 end) as gastos,
      -- Utilidad con signo (medida [UTILIDAD]), no derivada de los tres de arriba.
      -- −SUM(c4) − SUM(c6) − SUM(c5) se colapsa en un solo −SUM sobre 4/5/6.
      sum(case when ae.cuenta_nivel_1 in (4, 5, 6) then -ae.saldo_final else 0 end) as utilidad
    from bkts b
    left join accounting_entries ae
      on ae.fecha >= b.bstart and ae.fecha < b.bend
      and (p_centro_costo is null or ae.centro_costo_nombre = p_centro_costo)
      and ae.detalle is distinct from 'Cierre periodo fiscal'
    group by b.bucket_idx
  ),
  prev_agg as (
    select
      b.bucket_idx,
      sum(case when ae.cuenta_nivel_1 = 4 then ae.saldo_final_ajustado else 0 end) as ingresos,
      sum(case when ae.cuenta_nivel_1 = 6 then ae.saldo_final_ajustado else 0 end) as costos,
      sum(case when ae.cuenta_nivel_1 = 5 then ae.saldo_final_ajustado else 0 end) as gastos,
      sum(case when ae.cuenta_nivel_1 in (4, 5, 6) then -ae.saldo_final else 0 end) as utilidad
    from bkts b
    left join accounting_entries ae
      on p_compare
      and ae.fecha >= b.pstart and ae.fecha < b.pend
      and (p_centro_costo is null or ae.centro_costo_nombre = p_centro_costo)
      and ae.detalle is distinct from 'Cierre periodo fiscal'
    group by b.bucket_idx
  )
  select
    b.bucket_idx,
    b.bstart,
    b.bend,
    coalesce(c.ingresos, 0),
    coalesce(c.costos, 0),
    coalesce(c.gastos, 0),
    coalesce(c.utilidad, 0),
    coalesce(p.ingresos, 0),
    coalesce(p.costos, 0),
    coalesce(p.gastos, 0),
    coalesce(p.utilidad, 0)
  from bkts b
  left join cur_agg c on c.bucket_idx = b.bucket_idx
  left join prev_agg p on p.bucket_idx = b.bucket_idx
  order by b.bucket_idx;
end;
$function$;

create or replace function public.get_consolidated_clients(
  p_category text,
  p_period text,
  p_compare boolean default true
)
returns table(client_id text, name text, amount numeric, amount_prev numeric, delta_percent numeric)
language plpgsql
stable security definer
set search_path to 'public'
as $function$
declare
  v_today       date := current_date;
  v_month_start date := date_trunc('month', current_date)::date;
  v_start       date;
  v_end         date := v_today;
  v_prev_start  date;
  v_prev_end    date;
  v_span_days   int;
  v_months      int := null;
begin
  if p_category not in ('ingresos','costos','gastos','utilidad') then
    raise exception 'invalid category: %, expected ingresos|costos|gastos|utilidad', p_category;
  end if;

  case p_period
    when 'mtd' then v_start := v_month_start;
    when '1w'  then v_start := v_today - 6;
    when '1m'  then v_start := (v_month_start - interval '1 month')::date;   v_end := v_month_start - 1;  v_months := 1;
    when '3m'  then v_start := (v_month_start - interval '3 months')::date;  v_end := v_month_start - 1;  v_months := 3;
    when '12m' then v_start := (v_month_start - interval '12 months')::date; v_end := v_month_start - 1;  v_months := 12;
    else raise exception 'invalid period: %, expected mtd|1w|1m|3m|12m', p_period;
  end case;

  if v_months is not null then
    v_prev_start := (v_start - (v_months || ' months')::interval)::date;
    v_prev_end   := v_start - 1;
  else
    v_span_days  := v_end - v_start + 1;
    v_prev_end   := v_start - 1;
    v_prev_start := v_prev_end - (v_span_days - 1);
  end if;

  return query
  with cur as (
    select
      centro_costo_nombre as cc,
      sum(case when cuenta_nivel_1 = 4 then saldo_final_ajustado else 0 end) as ing_sum,
      sum(case when cuenta_nivel_1 = 5 then saldo_final_ajustado else 0 end) as gas_sum,
      sum(case when cuenta_nivel_1 = 6 then saldo_final_ajustado else 0 end) as cos_sum,
      sum(case when cuenta_nivel_1 in (4, 5, 6) then -saldo_final else 0 end) as uti_sum
    from accounting_entries
    where fecha >= v_start and fecha <= v_end
      and centro_costo_nombre is not null
      and detalle is distinct from 'Cierre periodo fiscal'
    group by centro_costo_nombre
  ),
  prv as (
    select
      centro_costo_nombre as cc,
      sum(case when cuenta_nivel_1 = 4 then saldo_final_ajustado else 0 end) as ing_sum,
      sum(case when cuenta_nivel_1 = 5 then saldo_final_ajustado else 0 end) as gas_sum,
      sum(case when cuenta_nivel_1 = 6 then saldo_final_ajustado else 0 end) as cos_sum,
      sum(case when cuenta_nivel_1 in (4, 5, 6) then -saldo_final else 0 end) as uti_sum
    from accounting_entries
    where p_compare
      and fecha >= v_prev_start and fecha <= v_prev_end
      and centro_costo_nombre is not null
      and detalle is distinct from 'Cierre periodo fiscal'
    group by centro_costo_nombre
  ),
  joined as (
    select
      cur.cc                                        as j_cc,
      case p_category
        when 'ingresos' then cur.ing_sum
        when 'costos'   then cur.cos_sum
        when 'gastos'   then cur.gas_sum
        when 'utilidad' then cur.uti_sum
      end                                           as j_amount,
      case p_category
        when 'ingresos' then coalesce(prv.ing_sum, 0)
        when 'costos'   then coalesce(prv.cos_sum, 0)
        when 'gastos'   then coalesce(prv.gas_sum, 0)
        when 'utilidad' then coalesce(prv.uti_sum, 0)
      end                                           as j_amount_prev
    from cur
    left join prv using (cc)
  )
  select
    j.j_cc,
    j.j_cc,
    j.j_amount,
    j.j_amount_prev,
    case
      when not p_compare or j.j_amount_prev = 0 then 0::numeric
      else ((j.j_amount - j.j_amount_prev) / abs(j.j_amount_prev) * 100)::numeric
    end
  from joined j
  where j.j_amount <> 0
  order by j.j_amount desc;
end;
$function$;
