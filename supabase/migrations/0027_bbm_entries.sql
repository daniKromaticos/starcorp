-- Staging de la tabla AuxiliarBBM de Power BI (compañía BBM, sección
-- "Otras compañías"). Mismo dataset/semantic model que el Auxiliar de
-- 5 Stars; la sincroniza el edge function pbi-sync-bbm (historia completa
-- en cada corrida: ~12k filas de cuentas 4/5/6, cabe de sobra en una
-- invocación).
--
-- OJO con los montos: en AuxiliarBBM `SALDO FINAL` es saldo ACUMULADO por
-- tercero×cuenta (no movimiento), así que NO se suma por período. El
-- movimiento de una fila es DEBITO − CREDITO (la columna calculada `Total`
-- del modelo). Convención de signos PUC:
--   ingresos (cuenta 4) = SUM(credito − debito)
--   gastos  (cuentas 5 y 6) = SUM(debito − credito)
-- Validado contra PBI: abril 2026 → ingresos 99,817,966; gastos 100,656,816.

create table bbm_entries (
  id bigint generated always as identity primary key,
  fecha date not null,
  cuenta text not null,          -- CUENTA8 (cuenta contable completa)
  cuenta4 text not null,         -- grupo PUC de 4 dígitos (categorías del donut)
  tipo text,
  documento text,
  prefijo text,
  numero text,
  modulo text,
  nota text,
  tercero text,                  -- nit/cédula ('0' = sin tercero)
  nombre_tercero text,
  base numeric,
  debito numeric not null default 0,
  credito numeric not null default 0,
  saldo_inicial numeric,
  saldo_final numeric,
  source_hash text not null unique,
  synced_at timestamptz not null
);

create index bbm_entries_fecha_idx on bbm_entries (fecha);
create index bbm_entries_cuenta4_idx on bbm_entries (cuenta4);

alter table bbm_entries enable row level security;
create policy "auth read bbm_entries" on bbm_entries
  for select to authenticated using (true);

-- Detalle Ingresos/Gastos de un mes para la pantalla de BBM.
-- p_month null → último mes con datos (dentro de p_year si viene).
-- Devuelve el período resuelto para que el chip de la UI muestre el mes real.
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
      'ingresos', jsonb_build_object('total', 0, 'categories', '[]'::jsonb, 'terceros', '[]'::jsonb),
      'gastos',   jsonb_build_object('total', 0, 'categories', '[]'::jsonb, 'terceros', '[]'::jsonb)
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
  )
  select jsonb_build_object(
    'period', jsonb_build_object('year', v_year, 'month', v_month),
    'ingresos', jsonb_build_object(
      'total', coalesce((select sum(amount) from ing_cat), 0),
      'categories', coalesce((select jsonb_agg(to_jsonb(c) order by c.amount desc) from ing_cat c), '[]'::jsonb),
      'terceros', coalesce((select jsonb_agg(to_jsonb(t) order by t.amount desc) from ing_ter t), '[]'::jsonb)
    ),
    'gastos', jsonb_build_object(
      'total', coalesce((select sum(amount) from gas_cat), 0),
      'categories', coalesce((select jsonb_agg(to_jsonb(c) order by c.amount desc) from gas_cat c), '[]'::jsonb),
      'terceros', coalesce((select jsonb_agg(to_jsonb(t) order by t.amount desc) from gas_ter t), '[]'::jsonb)
    )
  ) into v_result;

  return v_result;
end;
$$;

-- Resumen para la lista de "Otras compañías": ingresos del último mes con
-- datos + delta % vs el mes anterior. null si aún no hay sync.
create or replace function get_bbm_empresa_summary()
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
  select date_trunc('month', max(fecha))::date into v_last from bbm_entries;
  if v_last is null then
    return null;
  end if;

  select coalesce(sum(credito - debito), 0) into v_cur
  from bbm_entries
  where left(cuenta4, 1) = '4'
    and fecha >= v_last and fecha < (v_last + interval '1 month')::date;

  select coalesce(sum(credito - debito), 0) into v_prev
  from bbm_entries
  where left(cuenta4, 1) = '4'
    and fecha >= (v_last - interval '1 month')::date and fecha < v_last;

  return jsonb_build_object(
    'year', extract(year from v_last)::int,
    'month', extract(month from v_last)::int,
    'ingresos', v_cur,
    'delta_pct', case when v_prev = 0 then 0
                      else round(((v_cur - v_prev) / v_prev) * 100, 2) end
  );
end;
$$;

-- Disparo diario del sync (mismo patrón que los demás pbi-sync-*).
create or replace function trigger_pbi_sync_bbm()
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url    text;
  v_secret text;
  v_req_id bigint;
begin
  select value into v_url    from starcorp_vault where key = 'PROJECT_URL';
  select value into v_secret from starcorp_vault where key = 'PBI_SYNC_CRON_SECRET';
  if v_url is null or v_secret is null then
    raise exception 'PROJECT_URL/PBI_SYNC_CRON_SECRET missing';
  end if;

  select net.http_post(
    url     := v_url || '/functions/v1/pbi-sync-bbm',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'x-cron-secret', v_secret
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 60000
  ) into v_req_id;
  return v_req_id;
end;
$$;

-- 6am Colombia (11 UTC), junto a los demás syncs diarios.
select cron.schedule('pbi-sync-bbm-daily', '0 11 * * *', 'select trigger_pbi_sync_bbm();');
