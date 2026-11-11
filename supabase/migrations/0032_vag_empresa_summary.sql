-- Resumen para la card de VAG en la lista de "Otras compañías": ingresos
-- del último mes con datos + delta % vs el mes anterior (mismo contrato
-- que get_bbm_empresa_summary). Sobre movimientos reales de la clase 4
-- (crédito − débito), excluyendo las filas de corte es_saldo_inicial.
-- null si aún no hay sync.
create or replace function get_vag_empresa_summary()
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_last date;
  v_cur numeric;
  v_prev numeric;
begin
  select date_trunc('month', max(fecha))::date into v_last
  from vag_entries
  where cuenta1 = '4' and not es_saldo_inicial;
  if v_last is null then
    return null;
  end if;

  select coalesce(sum(credito - debito), 0) into v_cur
  from vag_entries
  where cuenta1 = '4' and not es_saldo_inicial
    and fecha >= v_last and fecha < (v_last + interval '1 month')::date;

  select coalesce(sum(credito - debito), 0) into v_prev
  from vag_entries
  where cuenta1 = '4' and not es_saldo_inicial
    and fecha >= (v_last - interval '1 month')::date and fecha < v_last;

  return jsonb_build_object(
    'year', extract(year from v_last)::int,
    'month', extract(month from v_last)::int,
    'ingresos', v_cur,
    'delta_pct', case when v_prev = 0 then 0
                      else round(((v_cur - v_prev) / abs(v_prev)) * 100, 2) end
  );
end;
$$;
