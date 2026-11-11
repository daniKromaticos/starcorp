-- 0018 · Fix bucketing de get_consolidated_timeseries (eje X del dashboard).
--
-- El cálculo de buckets generaba segmentos que se desbordaban del rango cuando
-- v_n_buckets * v_bsize > v_span_days. Ej: "1m" cubre 31 días → 12 buckets de
-- ceil(31/12)=3 días = 36 días. Los últimos buckets caían fuera del periodo y
-- el último quedaba degenerado (bucket_start > bucket_end), p. ej.
-- bucket_start = '2026-06-03' en una gráfica que debe mostrar solo mayo. En el
-- eje X aparecía una etiqueta "3 jun" fuera de rango y desordenada.
--
-- Fix: tras redondear v_bsize hacia arriba, recalcular cuántos buckets caben
-- realmente (ceil(span / bsize)). Aplica igual a "mtd", que sufría lo mismo.
-- El rango del periodo (mes cerrado) ya era correcto; esto solo corrige el
-- número de buckets.

create or replace function public.get_consolidated_timeseries(
  p_period text,
  p_centro_costo text default null::text,
  p_compare boolean default false
)
 returns table(bucket_idx integer, bucket_start date, bucket_end date, ingresos numeric, costos numeric, gastos numeric, utilidad numeric, ingresos_prev numeric, costos_prev numeric, gastos_prev numeric, utilidad_prev numeric)
 language plpgsql
 stable security definer
 set search_path to 'public'
as $function$
declare
  v_today          date := current_date;
  v_month_start    date := date_trunc('month', current_date)::date;
  v_start          date;
  v_end_excl       date;
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
    when '3m'  then v_start := (v_month_start - interval '3 months')::date;  v_end_excl := v_month_start;
    when '12m' then v_start := (v_month_start - interval '12 months')::date; v_end_excl := v_month_start;
    else raise exception 'invalid period: %, expected mtd|1w|1m|3m|12m', p_period;
  end case;

  v_span_days     := v_end_excl - v_start;
  v_n_buckets     := least(12, greatest(1, v_span_days));
  v_bsize         := ceil(v_span_days::numeric / v_n_buckets)::int;
  -- Con v_bsize ya redondeado hacia arriba, recalcular cuántos buckets caben
  -- realmente para no generar segmentos que se desborden del rango (con fechas
  -- fuera del periodo en el eje X).
  v_n_buckets     := least(v_n_buckets, ceil(v_span_days::numeric / v_bsize)::int);
  v_prev_end_excl := v_start;
  v_prev_start    := v_start - v_span_days;

  return query
  with bkts as (
    select
      gs.i as bucket_idx,
      (v_start + gs.i * v_bsize)                              as bstart,
      least(v_start + (gs.i + 1) * v_bsize, v_end_excl)       as bend,
      (v_prev_start + gs.i * v_bsize)                         as pstart,
      least(v_prev_start + (gs.i + 1) * v_bsize, v_prev_end_excl) as pend
    from generate_series(0, v_n_buckets - 1) as gs(i)
  ),
  cur_agg as (
    select
      b.bucket_idx,
      sum(case when ae.cuenta_nivel_1 = 4 then ae.saldo_final else 0 end) * -1 as ingresos,
      sum(case when ae.cuenta_nivel_1 = 6 then ae.saldo_final else 0 end)      as costos,
      sum(case when ae.cuenta_nivel_1 = 5 then ae.saldo_final else 0 end)      as gastos
    from bkts b
    left join accounting_entries ae
      on ae.fecha >= b.bstart and ae.fecha < b.bend
      and (p_centro_costo is null or ae.centro_costo_nombre = p_centro_costo)
    group by b.bucket_idx
  ),
  prev_agg as (
    select
      b.bucket_idx,
      sum(case when ae.cuenta_nivel_1 = 4 then ae.saldo_final else 0 end) * -1 as ingresos,
      sum(case when ae.cuenta_nivel_1 = 6 then ae.saldo_final else 0 end)      as costos,
      sum(case when ae.cuenta_nivel_1 = 5 then ae.saldo_final else 0 end)      as gastos
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
    coalesce(c.ingresos, 0) - coalesce(c.costos, 0) - coalesce(c.gastos, 0),
    coalesce(p.ingresos, 0),
    coalesce(p.costos, 0),
    coalesce(p.gastos, 0),
    coalesce(p.ingresos, 0) - coalesce(p.costos, 0) - coalesce(p.gastos, 0)
  from bkts b
  left join cur_agg c on c.bucket_idx = b.bucket_idx
  left join prev_agg p on p.bucket_idx = b.bucket_idx
  order by b.bucket_idx;
end;
$function$;
