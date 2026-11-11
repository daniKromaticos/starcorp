-- get_dashboard_summary('1w') usaba v_today - interval '7 days' (8 dias,
-- hoy-7..hoy), mientras que get_consolidated_clients y get_top_clients usan
-- v_today - 6 (7 dias, hoy-6..hoy) para el mismo periodo "1 Semana". El Total
-- del consolidado quedaba un dia por delante de la suma por cuenta/cliente,
-- generando diferencia entre el card de Ingresos/Costos/Gastos y la lista
-- por cliente apenas hubiera movimiento ese dia extra.
--
-- Se alinea el Total a la misma ventana de 7 dias. v_span_days (usado para
-- dimensionar el periodo anterior de comparacion) se recalcula solo a partir
-- de v_start/v_end, asi que el periodo previo queda automaticamente del mismo
-- largo (7 dias) sin tocarlo.

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
    coalesce((select total_abs from cur  where cuenta_nivel_1 = 4), 0),
    coalesce((select total_abs from cur  where cuenta_nivel_1 = 6), 0),
    coalesce((select total_abs from cur  where cuenta_nivel_1 = 5), 0),
    coalesce((select total_abs from prev where cuenta_nivel_1 = 4), 0),
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
