-- El dashboard (get_dashboard_summary / get_consolidated_clients / get_top_clients)
-- calculaba Ingresos con SUM(saldo_final_ajustado) (= ABS del saldo). La medida
-- real "Ingreso" del modelo de Power BI (tabla Medidas) usa en cambio
-- -SUM('Auxiliar'[Saldo Final]) (el signo, no el absoluto), filtrado por la
-- cuenta de ingreso (nivel 1 = 4). Para la mayoria de las filas ambos dan lo
-- mismo (el ingreso siempre se guarda en negativo y ajustado solo le quita el
-- signo), pero hay filas de ajuste/reversion donde el signo real no es el
-- esperado y ahi diverge (~$300 de diferencia en oct-2026 mes corriente,
-- 254219.43 app vs 253887.34 PBI). Se alinea Ingresos a la formula con signo
-- en los 3 RPCs para que Total (dashboard) y Suma por cuenta (consolidated
-- clients / top clients) sigan calzando entre si. Costos y Gastos NO se
-- tocan, siguen en saldo_final_ajustado.

CREATE OR REPLACE FUNCTION public.get_dashboard_summary(p_period text, p_centro_costo text DEFAULT NULL::text, p_compare boolean DEFAULT false)
 RETURNS TABLE(period_start date, period_end date, prev_start date, prev_end date, ingresos numeric, costos numeric, gastos numeric, ingresos_prev numeric, costos_prev numeric, gastos_prev numeric, utilidad numeric, utilidad_prev numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    when '1w'  then v_start := v_today - 6;
    when '1m'  then v_start := (v_month_start - interval '1 month')::date;   v_end := v_month_start - 1;  v_months := 1;
    when '3m'  then v_start := (v_month_start - interval '3 months')::date;  v_end := v_month_start - 1;  v_months := 3;
    when '12m' then v_start := (v_month_start - interval '12 months')::date; v_end := v_month_start - 1;  v_months := 12;
    else raise exception 'invalid period: %, expected mtd|1w|1m|3m|12m', p_period;
  end case;

  if v_months is not null then
    -- Meses cerrados: el historico es la misma ventana un anio atras.
    v_prev_start := (v_start - interval '12 months')::date;
    v_prev_end   := (v_end   - interval '12 months')::date;
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
    group by cuenta_nivel_1
  )
  select
    v_start, v_end, v_prev_start, v_prev_end,
    coalesce((select total_signed from cur  where cuenta_nivel_1 = 4), 0) * -1,
    coalesce((select total_abs from cur  where cuenta_nivel_1 = 6), 0),
    coalesce((select total_abs from cur  where cuenta_nivel_1 = 5), 0),
    coalesce((select total_signed from prev where cuenta_nivel_1 = 4), 0) * -1,
    coalesce((select total_abs from prev where cuenta_nivel_1 = 6), 0),
    coalesce((select total_abs from prev where cuenta_nivel_1 = 5), 0),
    coalesce((select total_signed from cur  where cuenta_nivel_1 = 4), 0) * -1
      - coalesce((select total_signed from cur  where cuenta_nivel_1 = 6), 0)
      - coalesce((select total_signed from cur  where cuenta_nivel_1 = 5), 0),
    coalesce((select total_signed from prev where cuenta_nivel_1 = 4), 0) * -1
      - coalesce((select total_signed from prev where cuenta_nivel_1 = 6), 0)
      - coalesce((select total_signed from prev where cuenta_nivel_1 = 5), 0);
end;
$function$;

CREATE OR REPLACE FUNCTION public.get_consolidated_clients(p_category text, p_period text, p_compare boolean DEFAULT true)
 RETURNS TABLE(client_id text, name text, amount numeric, amount_prev numeric, delta_percent numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    v_prev_start := (v_start - interval '12 months')::date;
    v_prev_end   := (v_end   - interval '12 months')::date;
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
      sum(case when cuenta_nivel_1 = 5 then saldo_final_ajustado else 0 end) as gas_sum,
      sum(case when cuenta_nivel_1 = 6 then saldo_final_ajustado else 0 end) as cos_sum,
      sum(case when cuenta_nivel_1 in (4, 5, 6) then -saldo_final else 0 end) as uti_sum
    from accounting_entries
    where fecha >= v_start and fecha <= v_end
      and centro_costo_nombre is not null
    group by centro_costo_nombre
  ),
  prv as (
    select
      centro_costo_nombre as cc,
      sum(case when cuenta_nivel_1 = 4 then saldo_final else 0 end) * -1 as ing_sum,
      sum(case when cuenta_nivel_1 = 5 then saldo_final_ajustado else 0 end) as gas_sum,
      sum(case when cuenta_nivel_1 = 6 then saldo_final_ajustado else 0 end) as cos_sum,
      sum(case when cuenta_nivel_1 in (4, 5, 6) then -saldo_final else 0 end) as uti_sum
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

CREATE OR REPLACE FUNCTION public.get_top_clients(p_period text, p_limit integer DEFAULT 8, p_compare boolean DEFAULT true)
 RETURNS TABLE(rank integer, centro_costo text, revenue numeric, revenue_prev numeric, delta_percent numeric)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    v_prev_start := (v_start - interval '12 months')::date;
    v_prev_end   := (v_end   - interval '12 months')::date;
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
    group by centro_costo_nombre
    having sum(saldo_final) * -1 > 0
  ),
  prv as (
    select centro_costo_nombre as cc, sum(saldo_final) * -1 as rev_prev
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
$function$;
