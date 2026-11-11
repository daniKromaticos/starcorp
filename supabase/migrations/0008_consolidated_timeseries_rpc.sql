-- Time-series RPC for the dashboard's "Empresas Consolidado" chart card.
-- Returns up to 12 buckets covering the period, plus matching previous-period
-- buckets when p_compare is true. Buckets divide the period evenly; for short
-- periods (< 12 days) the bucket count drops to one-per-day.

create or replace function get_consolidated_timeseries(
  p_period       text,
  p_centro_costo text default null,
  p_compare      boolean default false
)
returns table (
  bucket_idx     int,
  bucket_start   date,
  bucket_end     date,
  ingresos       numeric,
  costos         numeric,
  gastos         numeric,
  utilidad       numeric,
  ingresos_prev  numeric,
  costos_prev    numeric,
  gastos_prev    numeric,
  utilidad_prev  numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_today          date := current_date;
  v_start          date;
  v_end_excl       date;
  v_prev_start     date;
  v_prev_end_excl  date;
  v_span_days      int;
  v_n_buckets      int;
  v_bsize          int;
begin
  case p_period
    when 'mtd' then v_start := date_trunc('month', v_today)::date;
    when '1w'  then v_start := v_today - 6;
    when '1m'  then v_start := (v_today - interval '1 month')::date + 1;
    when '3m'  then v_start := (v_today - interval '3 months')::date + 1;
    when '12m' then v_start := (v_today - interval '12 months')::date + 1;
    else raise exception 'invalid period: %, expected mtd|1w|1m|3m|12m', p_period;
  end case;

  v_end_excl      := v_today + 1;
  v_span_days     := v_end_excl - v_start;
  v_n_buckets     := least(12, greatest(1, v_span_days));
  v_bsize         := ceil(v_span_days::numeric / v_n_buckets)::int;
  v_prev_end_excl := v_start;
  v_prev_start    := v_start - v_span_days;

  return query
  with bkts as (
    select
      gs.i as bucket_idx,
      (v_start + gs.i * v_bsize)                                  as bstart,
      least(v_start + (gs.i + 1) * v_bsize, v_end_excl)           as bend,
      (v_prev_start + gs.i * v_bsize)                             as pstart,
      least(v_prev_start + (gs.i + 1) * v_bsize, v_prev_end_excl) as pend
    from generate_series(0, v_n_buckets - 1) as gs(i)
  ),
  cur_agg as (
    select
      b.bucket_idx,
      sum(case when ae.cuenta_nivel_1 = 4 then ae.monto_reporte else 0 end) as ingresos,
      sum(case when ae.cuenta_nivel_1 = 6 then ae.monto_reporte else 0 end) as costos,
      sum(case when ae.cuenta_nivel_1 = 5 then ae.monto_reporte else 0 end) as gastos
    from bkts b
    left join accounting_entries ae
      on ae.fecha >= b.bstart and ae.fecha < b.bend
      and (p_centro_costo is null or ae.centro_costo_nombre = p_centro_costo)
    group by b.bucket_idx
  ),
  prev_agg as (
    select
      b.bucket_idx,
      sum(case when ae.cuenta_nivel_1 = 4 then ae.monto_reporte else 0 end) as ingresos,
      sum(case when ae.cuenta_nivel_1 = 6 then ae.monto_reporte else 0 end) as costos,
      sum(case when ae.cuenta_nivel_1 = 5 then ae.monto_reporte else 0 end) as gastos
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
$$;

revoke all on function get_consolidated_timeseries(text, text, boolean) from public;
revoke execute on function get_consolidated_timeseries(text, text, boolean) from anon;
grant execute on function get_consolidated_timeseries(text, text, boolean) to authenticated;
