-- Top 8 clientes: excluye centros cuyo ingreso del periodo suma 0 (o menos).
--
-- `cur` agrupaba todo centro con algún asiento de cuenta 4 en el periodo,
-- aunque los asientos se anularan entre sí o fueran de movimiento cero. Ese
-- centro entraba al ranking con $0 y le quitaba el puesto a un cliente real.
-- Con el `having` el top siempre se llena con clientes que sí facturaron.
--
-- Definición tomada de pg_get_functiondef (vigente: saldo_final_ajustado,
-- histórico espejo un año atrás, cierre fiscal incluido); el único cambio es
-- el `having` de `cur`.

create or replace function public.get_top_clients(
  p_period text,
  p_limit integer default 8,
  p_compare boolean default true
)
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
    v_prev_start := (v_start - interval '12 months')::date;
    v_prev_end   := (v_end   - interval '12 months')::date;
  else
    v_span_days  := v_end - v_start + 1;
    v_prev_end   := v_start - 1;
    v_prev_start := v_prev_end - (v_span_days - 1);
  end if;

  return query
  with cur as (
    select centro_costo_nombre as cc, sum(saldo_final_ajustado) as rev
    from accounting_entries
    where cuenta_nivel_1 = 4
      and fecha >= v_start and fecha <= v_end
      and centro_costo_nombre is not null
    group by centro_costo_nombre
    having sum(saldo_final_ajustado) > 0
  ),
  prv as (
    select centro_costo_nombre as cc, sum(saldo_final_ajustado) as rev_prev
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
