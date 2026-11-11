-- Lists all centros (clientes) ordered by the category amount in the period,
-- with previous-period delta. Used by the consolidated detail screens
-- (/ingresos, /costos, /gastos, /utilidad).
--
-- p_category: 'ingresos' | 'costos' | 'gastos' | 'utilidad'
-- For 'utilidad', amount = ingresos − gastos − costos at the centro level.

create or replace function get_consolidated_clients(
  p_category text,
  p_period   text,
  p_compare  boolean default true
)
returns table (
  client_id     text,
  name          text,
  amount        numeric,
  amount_prev   numeric,
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
  if p_category not in ('ingresos','costos','gastos','utilidad') then
    raise exception 'invalid category: %, expected ingresos|costos|gastos|utilidad', p_category;
  end if;

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
    select
      centro_costo_nombre as cc,
      sum(case when cuenta_nivel_1 = 4 then monto_reporte else 0 end) as ing_sum,
      sum(case when cuenta_nivel_1 = 5 then monto_reporte else 0 end) as gas_sum,
      sum(case when cuenta_nivel_1 = 6 then monto_reporte else 0 end) as cos_sum
    from accounting_entries
    where fecha >= v_start and fecha <= v_end
      and centro_costo_nombre is not null
    group by centro_costo_nombre
  ),
  prv as (
    select
      centro_costo_nombre as cc,
      sum(case when cuenta_nivel_1 = 4 then monto_reporte else 0 end) as ing_sum,
      sum(case when cuenta_nivel_1 = 5 then monto_reporte else 0 end) as gas_sum,
      sum(case when cuenta_nivel_1 = 6 then monto_reporte else 0 end) as cos_sum
    from accounting_entries
    where p_compare
      and fecha >= v_prev_start and fecha <= v_prev_end
      and centro_costo_nombre is not null
    group by centro_costo_nombre
  ),
  joined as (
    select
      cur.cc                                        as j_cc,
      case p_category
        when 'ingresos' then cur.ing_sum
        when 'costos'   then cur.cos_sum
        when 'gastos'   then cur.gas_sum
        when 'utilidad' then cur.ing_sum - cur.gas_sum - cur.cos_sum
      end                                           as j_amount,
      case p_category
        when 'ingresos' then coalesce(prv.ing_sum, 0)
        when 'costos'   then coalesce(prv.cos_sum, 0)
        when 'gastos'   then coalesce(prv.gas_sum, 0)
        when 'utilidad' then
          coalesce(prv.ing_sum, 0)
          - coalesce(prv.gas_sum, 0)
          - coalesce(prv.cos_sum, 0)
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
$$;

revoke all on function get_consolidated_clients(text, text, boolean) from public;
revoke execute on function get_consolidated_clients(text, text, boolean) from anon;
grant execute on function get_consolidated_clients(text, text, boolean) to authenticated;
