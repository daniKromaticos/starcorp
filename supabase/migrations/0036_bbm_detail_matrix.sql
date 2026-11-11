-- Cross-filtrado torta↔lista en el detalle BBM: cada bloque
-- (ingresos/gastos) de get_bbm_empresa_detail gana `matrix` — el desglose
-- cuenta4 × tercero (~84 pares/mes) — para que el frontend pueda filtrar
-- la lista de terceros por la categoría elegida en el donut y recalcular
-- el donut para el tercero elegido en la lista. Cambio aditivo: los
-- clientes viejos ignoran la clave nueva.

create or replace function get_bbm_empresa_detail(
  p_year int default null,
  p_month int default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_year int := p_year;
  v_month int := p_month;
  v_from date;
  v_to date;
  v_result jsonb;
begin
  if v_month is null then
    select extract(year from max(fecha))::int, extract(month from max(fecha))::int
      into v_year, v_month
    from bbm_entries
    where p_year is null or extract(year from fecha)::int = p_year;
  end if;

  if v_year is null or v_month is null then
    return jsonb_build_object(
      'period', null,
      'ingresos', jsonb_build_object('total', 0, 'categories', '[]'::jsonb, 'terceros', '[]'::jsonb, 'matrix', '[]'::jsonb),
      'gastos',   jsonb_build_object('total', 0, 'categories', '[]'::jsonb, 'terceros', '[]'::jsonb, 'matrix', '[]'::jsonb)
    );
  end if;

  v_from := make_date(v_year, v_month, 1);
  v_to := (v_from + interval '1 month')::date;

  with mov as (
    select
      cuenta4,
      left(cuenta4, 1) as clase,
      coalesce(nullif(trim(tercero), ''), '0') as tercero,
      nombre_tercero,
      (credito - debito) as ing,
      (debito - credito) as gas
    from bbm_entries
    where fecha >= v_from and fecha < v_to
  ),
  ing_cat as (
    select cuenta4, sum(ing) as amount from mov where clase = '4' group by cuenta4
  ),
  gas_cat as (
    select cuenta4, sum(gas) as amount from mov where clase in ('5', '6') group by cuenta4
  ),
  ing_ter as (
    select tercero, max(nombre_tercero) as nombre, sum(ing) as amount
    from mov where clase = '4' group by tercero
  ),
  gas_ter as (
    select tercero, max(nombre_tercero) as nombre, sum(gas) as amount
    from mov where clase in ('5', '6') group by tercero
  ),
  ing_mat as (
    select cuenta4, tercero, sum(ing) as amount
    from mov where clase = '4' group by cuenta4, tercero
  ),
  gas_mat as (
    select cuenta4, tercero, sum(gas) as amount
    from mov where clase in ('5', '6') group by cuenta4, tercero
  )
  select jsonb_build_object(
    'period', jsonb_build_object('year', v_year, 'month', v_month),
    'ingresos', jsonb_build_object(
      'total', coalesce((select sum(amount) from ing_cat), 0),
      'categories', coalesce((select jsonb_agg(to_jsonb(c) order by c.amount desc) from ing_cat c), '[]'::jsonb),
      'terceros', coalesce((select jsonb_agg(to_jsonb(t) order by t.amount desc) from ing_ter t), '[]'::jsonb),
      'matrix', coalesce((select jsonb_agg(to_jsonb(m) order by m.amount desc) from ing_mat m), '[]'::jsonb)
    ),
    'gastos', jsonb_build_object(
      'total', coalesce((select sum(amount) from gas_cat), 0),
      'categories', coalesce((select jsonb_agg(to_jsonb(c) order by c.amount desc) from gas_cat c), '[]'::jsonb),
      'terceros', coalesce((select jsonb_agg(to_jsonb(t) order by t.amount desc) from gas_ter t), '[]'::jsonb),
      'matrix', coalesce((select jsonb_agg(to_jsonb(m) order by m.amount desc) from gas_mat m), '[]'::jsonb)
    )
  ) into v_result;

  return v_result;
end;
$$;
