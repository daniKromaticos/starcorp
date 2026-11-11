-- Top N centros (clientes) by ingresos in the period, with previous-period
-- delta. Used by the dashboard's "Top 8 clientes (Mayor ingreso)" section.

create or replace function get_top_clients(
  p_period  text,
  p_limit   int default 8,
  p_compare boolean default true
)
returns table (
  rank          int,
  centro_costo  text,
  revenue       numeric,
  revenue_prev  numeric,
  delta_percent numeric
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_today      date := current_date;
  v_start      date;
  v_end        date := v_today;
  v_prev_start date;
  v_prev_end   date;
  v_span_days  int;
begin
  case p_period
    when 'mtd' then v_start := date_trunc('month', v_today)::date;
    when '1w'  then v_start := v_today - 6;
    when '1m'  then v_start := (v_today - interval '1 month')::date + 1;
    when '3m'  then v_start := (v_today - interval '3 months')::date + 1;
    when '12m' then v_start := (v_today - interval '12 months')::date + 1;
    else raise exception 'invalid period: %, expected mtd|1w|1m|3m|12m', p_period;
  end case;

  v_span_days  := v_end - v_start + 1;
  v_prev_end   := v_start - 1;
  v_prev_start := v_prev_end - (v_span_days - 1);

  return query
  with cur as (
    select centro_costo_nombre as cc, sum(monto_reporte) as rev
    from accounting_entries
    where cuenta_nivel_1 = 4
      and fecha >= v_start and fecha <= v_end
      and centro_costo_nombre is not null
    group by centro_costo_nombre
  ),
  prv as (
    select centro_costo_nombre as cc, sum(monto_reporte) as rev_prev
    from accounting_entries
    where p_compare
      and cuenta_nivel_1 = 4
      and fecha >= v_prev_start and fecha <= v_prev_end
      and centro_costo_nombre is not null
    group by centro_costo_nombre
  ),
  ranked as (
    select
      cur.cc,
      cur.rev,
      coalesce(prv.rev_prev, 0) as rev_prev
    from cur
    left join prv using (cc)
    order by cur.rev desc
    limit p_limit
  )
  select
    row_number() over (order by rev desc)::int,
    cc,
    rev,
    rev_prev,
    case
      when not p_compare or rev_prev = 0 then 0::numeric
      else ((rev - rev_prev) / abs(rev_prev) * 100)::numeric
    end
  from ranked;
end;
$$;

revoke all on function get_top_clients(text, int, boolean) from public;
revoke execute on function get_top_clients(text, int, boolean) from anon;
grant execute on function get_top_clients(text, int, boolean) to authenticated;
