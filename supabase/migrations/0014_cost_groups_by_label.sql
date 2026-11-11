-- Group cost/gasto entries by nombre_cuenta (the human-readable label) so
-- conceptually-equivalent rows under different cuenta codes consolidate
-- into a single group. Replaces the previous level-4 substring approach
-- which produced multiple "Aseo" / "Combustible" entries per client.

create or replace function get_client_cost_groups(
  p_centro_costo text,
  p_category     text,
  p_period       text,
  p_compare      boolean default true
)
returns table (
  group_code    text,
  label         text,
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
  v_nivel      smallint;
begin
  v_nivel := case p_category
    when 'costos' then 6
    when 'gastos' then 5
    else null
  end;
  if v_nivel is null then
    raise exception 'invalid category for cost groups: %, expected costos|gastos', p_category;
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
      nombre_cuenta              as gname,
      sum(monto_reporte)         as amt
    from accounting_entries
    where cuenta_nivel_1 = v_nivel
      and centro_costo_nombre = p_centro_costo
      and fecha >= v_start and fecha <= v_end
      and nombre_cuenta is not null
    group by nombre_cuenta
  ),
  prv as (
    select
      nombre_cuenta              as gname,
      sum(monto_reporte)         as amt_prev
    from accounting_entries
    where p_compare
      and cuenta_nivel_1 = v_nivel
      and centro_costo_nombre = p_centro_costo
      and fecha >= v_prev_start and fecha <= v_prev_end
      and nombre_cuenta is not null
    group by nombre_cuenta
  )
  select
    cur.gname,
    cur.gname,
    cur.amt,
    coalesce(prv.amt_prev, 0),
    case
      when not p_compare or coalesce(prv.amt_prev, 0) = 0 then 0::numeric
      else ((cur.amt - prv.amt_prev) / abs(prv.amt_prev) * 100)::numeric
    end
  from cur
  left join prv using (gname)
  where cur.amt <> 0
  order by cur.amt desc;
end;
$$;

-- Update terceros RPC to filter by nombre_cuenta instead of substring(cuenta).
create or replace function get_group_terceros(
  p_centro_costo text,
  p_group_code   text,
  p_category     text,
  p_period       text,
  p_compare      boolean default false
)
returns table (
  nit             text,
  razon_social    text,
  amount          numeric,
  amount_prev     numeric,
  delta_percent   numeric
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
  v_nivel      smallint;
begin
  v_nivel := case p_category
    when 'costos' then 6
    when 'gastos' then 5
    else null
  end;
  if v_nivel is null then
    raise exception 'invalid category: %, expected costos|gastos', p_category;
  end if;

  case p_period
    when 'mtd' then v_start := date_trunc('month', v_today)::date;
    when '1w'  then v_start := v_today - 6;
    when '1m'  then v_start := (v_today - interval '1 month')::date + 1;
    when '3m'  then v_start := (v_today - interval '3 months')::date + 1;
    when '12m' then v_start := (v_today - interval '12 months')::date + 1;
    else raise exception 'invalid period: %', p_period;
  end case;

  v_span_days  := v_end - v_start + 1;
  v_prev_end   := v_start - 1;
  v_prev_start := v_prev_end - (v_span_days - 1);

  return query
  with cur as (
    select
      ae.nit                         as nit,
      max(ae.razon_social)           as razon,
      sum(ae.monto_reporte)          as amt
    from accounting_entries ae
    where ae.cuenta_nivel_1 = v_nivel
      and ae.centro_costo_nombre = p_centro_costo
      and ae.fecha >= v_start and ae.fecha <= v_end
      and ae.nombre_cuenta = p_group_code
      and ae.nit is not null
    group by ae.nit
  ),
  prv as (
    select
      ae.nit                  as nit,
      sum(ae.monto_reporte)   as amt_prev
    from accounting_entries ae
    where p_compare
      and ae.cuenta_nivel_1 = v_nivel
      and ae.centro_costo_nombre = p_centro_costo
      and ae.fecha >= v_prev_start and ae.fecha <= v_prev_end
      and ae.nombre_cuenta = p_group_code
      and ae.nit is not null
    group by ae.nit
  )
  select
    cur.nit,
    coalesce(cur.razon, cur.nit),
    cur.amt,
    coalesce(prv.amt_prev, 0),
    case
      when not p_compare or coalesce(prv.amt_prev, 0) = 0 then 0::numeric
      else ((cur.amt - prv.amt_prev) / abs(prv.amt_prev) * 100)::numeric
    end
  from cur
  left join prv using (nit)
  where cur.amt <> 0
  order by cur.amt desc;
end;
$$;
