-- La migracion 0057 (dashboard_ingresos_saldo_final_signed) alineo Ingresos a
-- -SUM(saldo_final) en get_dashboard_summary / get_consolidated_clients /
-- get_top_clients para calzar con la medida [Ingreso] de Power BI, pero dejo
-- afuera a get_consolidated_timeseries, que sigue sumando saldo_final_ajustado
-- (ABS) para cuenta_nivel_1 = 4. Resultado: la vista "Corriente"/"Historico"
-- del chart consolidado (que lee de este RPC) no calza con la tarjeta
-- "Totalizado" del mismo card (que lee de get_dashboard_summary). Se corrige
-- Ingresos aqui tambien, sin tocar Costos/Gastos (siguen en ABS).

CREATE OR REPLACE FUNCTION public.get_consolidated_timeseries(p_period text, p_centro_costo text DEFAULT NULL::text, p_compare boolean DEFAULT false)
 RETURNS TABLE(bucket_idx integer, bucket_start date, bucket_end date, ingresos numeric, costos numeric, gastos numeric, utilidad numeric, ingresos_prev numeric, costos_prev numeric, gastos_prev numeric, utilidad_prev numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  v_span_days     := v_end_excl - v_start;
  v_n_buckets     := least(12, greatest(1, v_span_days));
  v_bsize         := ceil(v_span_days::numeric / v_n_buckets)::int;
  v_n_buckets     := least(v_n_buckets, ceil(v_span_days::numeric / v_bsize)::int);
  v_prev_end_excl := v_start;
  v_prev_start    := v_start - v_span_days;
  -- 1m: el historico es el mismo mes del anio pasado, no el mes anterior.
  if p_period = '1m' then
    v_prev_start    := (v_start    - interval '12 months')::date;
    v_prev_end_excl := (v_end_excl - interval '12 months')::date;
  end if;

  v_n_months := (extract(year from v_end_excl)::int * 12 + extract(month from v_end_excl)::int)
              - (extract(year from v_start)::int * 12 + extract(month from v_start)::int);

  return query
  with bkts as (
    select
      gs.i as bucket_idx,
      (v_start + (gs.i || ' months')::interval)::date                as bstart,
      (v_start + ((gs.i + 1) || ' months')::interval)::date          as bend,
      (v_start + ((gs.i - 12) || ' months')::interval)::date         as pstart,
      (v_start + ((gs.i + 1 - 12) || ' months')::interval)::date     as pend
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
      sum(case when ae.cuenta_nivel_1 = 4 then -ae.saldo_final else 0 end) as ingresos,
      sum(case when ae.cuenta_nivel_1 = 6 then ae.saldo_final_ajustado else 0 end) as costos,
      sum(case when ae.cuenta_nivel_1 = 5 then ae.saldo_final_ajustado else 0 end) as gastos,
      sum(case when ae.cuenta_nivel_1 in (4, 5, 6) then -ae.saldo_final else 0 end) as utilidad
    from bkts b
    left join accounting_entries ae
      on ae.fecha >= b.bstart and ae.fecha < b.bend
      and (p_centro_costo is null or ae.centro_costo_nombre = p_centro_costo)
    group by b.bucket_idx
  ),
  prev_agg as (
    select
      b.bucket_idx,
      sum(case when ae.cuenta_nivel_1 = 4 then -ae.saldo_final else 0 end) as ingresos,
      sum(case when ae.cuenta_nivel_1 = 6 then ae.saldo_final_ajustado else 0 end) as costos,
      sum(case when ae.cuenta_nivel_1 = 5 then ae.saldo_final_ajustado else 0 end) as gastos,
      sum(case when ae.cuenta_nivel_1 in (4, 5, 6) then -ae.saldo_final else 0 end) as utilidad
    from bkts b
    left join accounting_entries ae
      on p_compare
      and ae.fecha >= b.pstart and ae.fecha < b.pend
      and (p_centro_costo is null or ae.centro_costo_nombre = p_centro_costo)
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
