-- Histórico alineado a meses calendario en periodos 1m/3m/12m.
--
-- La ventana "previa" (histórico / base del delta %) se calculaba como la
-- misma cantidad de días inmediatamente anterior al período. Para 3m
-- (abr–jun) eso daba 31-dic → 31-mar (91 días, sobra el 31-dic) y para 1m
-- (junio) daba 2-may → 31-may (falta el 1-may). La gráfica del consolidado
-- ya desplazaba por meses calendario para 3m/12m, así que header/listas y
-- gráfica mostraban históricos distintos. Ahora estos 5 RPCs usan meses
-- calendario exactos para 1m/3m/12m (3m en julio → ene–mar); mtd y 1w
-- siguen comparando por días. (El timeseries se corrige en 0025.)

-- ── 1. get_dashboard_summary ────────────────────────────────────────────
create or replace function public.get_dashboard_summary(p_period text, p_centro_costo text default null::text, p_compare boolean default false)
returns table(period_start date, period_end date, prev_start date, prev_end date, ingresos numeric, costos numeric, gastos numeric, ingresos_prev numeric, costos_prev numeric, gastos_prev numeric)
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
    select cuenta_nivel_1, sum(saldo_final) as total
    from accounting_entries
    where fecha >= v_start and fecha <= v_end
      and (p_centro_costo is null or centro_costo_nombre = p_centro_costo)
      and detalle is distinct from 'Cierre periodo fiscal'
    group by cuenta_nivel_1
  ),
  prev as (
    select cuenta_nivel_1, sum(saldo_final) as total
    from accounting_entries
    where p_compare
      and fecha >= v_prev_start and fecha <= v_prev_end
      and (p_centro_costo is null or centro_costo_nombre = p_centro_costo)
      and detalle is distinct from 'Cierre periodo fiscal'
    group by cuenta_nivel_1
  )
  select
    v_start, v_end, v_prev_start, v_prev_end,
    coalesce((select total from cur  where cuenta_nivel_1 = 4), 0) * -1,
    coalesce((select total from cur  where cuenta_nivel_1 = 6), 0),
    coalesce((select total from cur  where cuenta_nivel_1 = 5), 0),
    coalesce((select total from prev where cuenta_nivel_1 = 4), 0) * -1,
    coalesce((select total from prev where cuenta_nivel_1 = 6), 0),
    coalesce((select total from prev where cuenta_nivel_1 = 5), 0);
end;
$function$;

-- ── 2. get_top_clients ──────────────────────────────────────────────────
create or replace function public.get_top_clients(p_period text, p_limit integer default 8, p_compare boolean default true)
returns table(rank integer, centro_costo text, revenue numeric, revenue_prev numeric, delta_percent numeric)
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
    select centro_costo_nombre as cc, sum(saldo_final) * -1 as rev
    from accounting_entries
    where cuenta_nivel_1 = 4
      and fecha >= v_start and fecha <= v_end
      and centro_costo_nombre is not null
      and detalle is distinct from 'Cierre periodo fiscal'
    group by centro_costo_nombre
  ),
  prv as (
    select centro_costo_nombre as cc, sum(saldo_final) * -1 as rev_prev
    from accounting_entries
    where p_compare
      and cuenta_nivel_1 = 4
      and fecha >= v_prev_start and fecha <= v_prev_end
      and centro_costo_nombre is not null
      and detalle is distinct from 'Cierre periodo fiscal'
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
$function$;

-- ── 3. get_consolidated_clients ─────────────────────────────────────────
create or replace function public.get_consolidated_clients(p_category text, p_period text, p_compare boolean default true)
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
      sum(case when cuenta_nivel_1 = 4 then saldo_final else 0 end) * -1 as ing_sum,
      sum(case when cuenta_nivel_1 = 5 then saldo_final else 0 end)      as gas_sum,
      sum(case when cuenta_nivel_1 = 6 then saldo_final else 0 end)      as cos_sum
    from accounting_entries
    where fecha >= v_start and fecha <= v_end
      and centro_costo_nombre is not null
      and detalle is distinct from 'Cierre periodo fiscal'
    group by centro_costo_nombre
  ),
  prv as (
    select
      centro_costo_nombre as cc,
      sum(case when cuenta_nivel_1 = 4 then saldo_final else 0 end) * -1 as ing_sum,
      sum(case when cuenta_nivel_1 = 5 then saldo_final else 0 end)      as gas_sum,
      sum(case when cuenta_nivel_1 = 6 then saldo_final else 0 end)      as cos_sum
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
$function$;

-- ── 4. get_client_cost_groups ───────────────────────────────────────────
create or replace function public.get_client_cost_groups(p_centro_costo text, p_category text, p_period text, p_compare boolean default true)
returns table(group_code text, label text, amount numeric, amount_prev numeric, delta_percent numeric)
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
  v_nivel       smallint;
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
      nombre_cuenta              as gname,
      sum(saldo_final)           as amt
    from accounting_entries
    where cuenta_nivel_1 = v_nivel
      and centro_costo_nombre = p_centro_costo
      and fecha >= v_start and fecha <= v_end
      and nombre_cuenta is not null
      and detalle is distinct from 'Cierre periodo fiscal'
    group by nombre_cuenta
  ),
  prv as (
    select
      nombre_cuenta              as gname,
      sum(saldo_final)           as amt_prev
    from accounting_entries
    where p_compare
      and cuenta_nivel_1 = v_nivel
      and centro_costo_nombre = p_centro_costo
      and fecha >= v_prev_start and fecha <= v_prev_end
      and nombre_cuenta is not null
      and detalle is distinct from 'Cierre periodo fiscal'
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
$function$;

-- ── 5. get_group_terceros ───────────────────────────────────────────────
create or replace function public.get_group_terceros(p_centro_costo text, p_group_code text, p_category text, p_period text, p_compare boolean default false)
returns table(nit text, razon_social text, amount numeric, amount_prev numeric, delta_percent numeric)
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
  v_nivel       smallint;
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
    when 'mtd' then v_start := v_month_start;
    when '1w'  then v_start := v_today - 6;
    when '1m'  then v_start := (v_month_start - interval '1 month')::date;   v_end := v_month_start - 1;  v_months := 1;
    when '3m'  then v_start := (v_month_start - interval '3 months')::date;  v_end := v_month_start - 1;  v_months := 3;
    when '12m' then v_start := (v_month_start - interval '12 months')::date; v_end := v_month_start - 1;  v_months := 12;
    else raise exception 'invalid period: %', p_period;
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
      ae.nit                         as nit,
      max(ae.razon_social)           as razon,
      sum(ae.saldo_final)            as amt
    from accounting_entries ae
    where ae.cuenta_nivel_1 = v_nivel
      and ae.centro_costo_nombre = p_centro_costo
      and ae.fecha >= v_start and ae.fecha <= v_end
      and ae.nombre_cuenta = p_group_code
      and ae.nit is not null
      and ae.detalle is distinct from 'Cierre periodo fiscal'
    group by ae.nit
  ),
  prv as (
    select
      ae.nit                  as nit,
      sum(ae.saldo_final)     as amt_prev
    from accounting_entries ae
    where p_compare
      and ae.cuenta_nivel_1 = v_nivel
      and ae.centro_costo_nombre = p_centro_costo
      and ae.fecha >= v_prev_start and ae.fecha <= v_prev_end
      and ae.nombre_cuenta = p_group_code
      and ae.nit is not null
      and ae.detalle is distinct from 'Cierre periodo fiscal'
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
$function$;
