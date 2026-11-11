-- Excluir asientos de cierre fiscal de las agregaciones del dashboard.
--
-- El Auxiliar de PBI incluye los asientos de cierre de fin de año
-- (detalle = 'Cierre periodo fiscal': 11.750 filas en dic-2023 y dic-2024,
-- sólo cuentas de resultado 4/5/6) que cancelan el P&L del ejercicio.
-- Sin filtrarlos, diciembre muestra ingresos de −$21M/−$23M y distorsiona
-- las series (visible en el "Histórico" 12m del consolidado). Se excluyen
-- con `detalle is distinct from 'Cierre periodo fiscal'` en los 7 RPCs que
-- leen accounting_entries. Los demás asientos cuyo detalle menciona
-- "cierre" son transacciones reales y no se tocan.

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
begin
  case p_period
    when 'mtd' then v_start := v_month_start;
    when '1w'  then v_start := v_today - interval '7 days';
    when '1m'  then v_start := (v_month_start - interval '1 month')::date;   v_end := v_month_start - 1;
    when '3m'  then v_start := (v_month_start - interval '3 months')::date;  v_end := v_month_start - 1;
    when '12m' then v_start := (v_month_start - interval '12 months')::date; v_end := v_month_start - 1;
    else raise exception 'invalid period: %, expected mtd|1w|1m|3m|12m', p_period;
  end case;

  v_span_days  := (v_end - v_start);
  v_prev_end   := v_start - 1;
  v_prev_start := v_prev_end - v_span_days;

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

-- ── 2. get_consolidated_timeseries ──────────────────────────────────────
create or replace function public.get_consolidated_timeseries(p_period text, p_centro_costo text default null::text, p_compare boolean default false)
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

  -- Cantidad de meses calendario del rango (3m → 3, 12m → 12).
  v_n_months := (extract(year from v_end_excl)::int * 12 + extract(month from v_end_excl)::int)
              - (extract(year from v_start)::int * 12 + extract(month from v_start)::int);

  return query
  with bkts as (
    -- Mensual (3m, 12m): un bucket por mes; el "previo" es el mismo mes
    -- desplazado v_n_months meses hacia atrás.
    select
      gs.i as bucket_idx,
      (v_start + (gs.i || ' months')::interval)::date                      as bstart,
      (v_start + ((gs.i + 1) || ' months')::interval)::date                as bend,
      (v_start + ((gs.i - v_n_months) || ' months')::interval)::date       as pstart,
      (v_start + ((gs.i + 1 - v_n_months) || ' months')::interval)::date   as pend
    from generate_series(0, v_n_months - 1) as gs(i)
    where v_monthly
    union all
    -- Diario (mtd, 1w, 1m): buckets de igual ancho en días.
    select
      gs.i as bucket_idx,
      (v_start + gs.i * v_bsize)                                 as bstart,
      least(v_start + (gs.i + 1) * v_bsize, v_end_excl)          as bend,
      (v_prev_start + gs.i * v_bsize)                            as pstart,
      least(v_prev_start + (gs.i + 1) * v_bsize, v_prev_end_excl) as pend
    from generate_series(0, v_n_buckets - 1) as gs(i)
    where not v_monthly
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
      and ae.detalle is distinct from 'Cierre periodo fiscal'
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

-- ── 3. get_top_clients ──────────────────────────────────────────────────
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
begin
  case p_period
    when 'mtd' then v_start := v_month_start;
    when '1w'  then v_start := v_today - 6;
    when '1m'  then v_start := (v_month_start - interval '1 month')::date;   v_end := v_month_start - 1;
    when '3m'  then v_start := (v_month_start - interval '3 months')::date;  v_end := v_month_start - 1;
    when '12m' then v_start := (v_month_start - interval '12 months')::date; v_end := v_month_start - 1;
    else raise exception 'invalid period: %, expected mtd|1w|1m|3m|12m', p_period;
  end case;

  v_span_days  := v_end - v_start + 1;
  v_prev_end   := v_start - 1;
  v_prev_start := v_prev_end - (v_span_days - 1);

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

-- ── 4. get_consolidated_clients ─────────────────────────────────────────
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
begin
  if p_category not in ('ingresos','costos','gastos','utilidad') then
    raise exception 'invalid category: %, expected ingresos|costos|gastos|utilidad', p_category;
  end if;

  case p_period
    when 'mtd' then v_start := v_month_start;
    when '1w'  then v_start := v_today - 6;
    when '1m'  then v_start := (v_month_start - interval '1 month')::date;   v_end := v_month_start - 1;
    when '3m'  then v_start := (v_month_start - interval '3 months')::date;  v_end := v_month_start - 1;
    when '12m' then v_start := (v_month_start - interval '12 months')::date; v_end := v_month_start - 1;
    else raise exception 'invalid period: %, expected mtd|1w|1m|3m|12m', p_period;
  end case;

  v_span_days  := v_end - v_start + 1;
  v_prev_end   := v_start - 1;
  v_prev_start := v_prev_end - (v_span_days - 1);

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

-- ── 5. get_client_cost_groups ───────────────────────────────────────────
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
    when '1m'  then v_start := (v_month_start - interval '1 month')::date;   v_end := v_month_start - 1;
    when '3m'  then v_start := (v_month_start - interval '3 months')::date;  v_end := v_month_start - 1;
    when '12m' then v_start := (v_month_start - interval '12 months')::date; v_end := v_month_start - 1;
    else raise exception 'invalid period: %, expected mtd|1w|1m|3m|12m', p_period;
  end case;

  v_span_days  := v_end - v_start + 1;
  v_prev_end   := v_start - 1;
  v_prev_start := v_prev_end - (v_span_days - 1);

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

-- ── 6. get_group_terceros ───────────────────────────────────────────────
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
    when '1m'  then v_start := (v_month_start - interval '1 month')::date;   v_end := v_month_start - 1;
    when '3m'  then v_start := (v_month_start - interval '3 months')::date;  v_end := v_month_start - 1;
    when '12m' then v_start := (v_month_start - interval '12 months')::date; v_end := v_month_start - 1;
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

-- ── 7. get_client_metadata ──────────────────────────────────────────────
create or replace function public.get_client_metadata(p_centro_costo text)
returns table(n_terceros integer, n_cuentas integer, n_entries integer, first_fecha date, last_fecha date, id_centro_costo text, cliente_data jsonb, empleados_activos integer, empleados_total integer)
language sql
stable security definer
set search_path to 'public'
as $function$
  with agg as (
    select
      count(distinct nit) filter (where nit is not null)::int as n_terceros,
      count(distinct cuenta)::int                              as n_cuentas,
      count(*)::int                                            as n_entries,
      min(fecha)                                               as first_fecha,
      max(fecha)                                               as last_fecha,
      (array_agg(centro_costo_codigo) filter
        (where centro_costo_codigo is not null))[1]            as codigo
    from accounting_entries
    where centro_costo_nombre = p_centro_costo
      and detalle is distinct from 'Cierre periodo fiscal'
  )
  select
    agg.n_terceros,
    agg.n_cuentas,
    agg.n_entries,
    agg.first_fecha,
    agg.last_fecha,
    agg.codigo,
    cm.data,
    es.empleados_activos,
    es.empleados_total
  from agg
  left join clientes_master    cm on cm.id_centro_costo = agg.codigo
  left join empleados_summary  es on es.id_centro_costo = agg.codigo;
$function$;
