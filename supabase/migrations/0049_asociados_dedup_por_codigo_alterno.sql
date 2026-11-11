-- get_asociados_snapshot: una fila por PERSONA, no por persona × cliente.
--
-- Tras el corte por codigoalterno (0048) el informe daba 331, pero no eran
-- 331 personas: `id_employee` es por (persona × cliente), así que quien
-- atiende varias cuentas se contaba varias veces. ANDRES ALVAREZ (código 200)
-- aparecía 6 veces — ADMINISTRATIVE TEAM 5TARS, BENCHMARK, LIVING GROUP,
-- OCEAN REEF, OKANA RESORT y REALJOY — y VILMA VELASCO (2259) otras 6.
-- Son 15 filas de más sobre 316 personas reales.
--
-- La identidad de persona es `codigo_alterno`, no `id_employee`. Se deduplica
-- por código quedándose con la asignación más reciente (Start Date Area, luego
-- Admission Date, y id_employee para desempatar de forma determinista), mismo
-- criterio que usa el sync para elegir el área vigente.
--
-- Total: 316 personas en 35 clientes. PBI reporta 317 porque su
-- DISTINCTCOUNT(codigoalterno) suma un bucket extra por los ~547 registros sin
-- código; ese 317º no es una persona.
--
-- Efecto: además de los 11 clientes que salieron en 0048, quedan fuera OCEAN
-- REEF, REALJOY y SOLELY, cuyos únicos asociados con código tienen su
-- asignación vigente en otra cuenta.

create or replace function public.get_asociados_snapshot()
returns json
language sql
stable security definer
set search_path to 'public'
as $function$
  with persona as (
    -- Una fila por persona: la asignación vigente.
    select distinct on (codigo_alterno)
      id_employee, employee_name, area, account, sub_account, codigo_alterno
    from public.empleados_detail
    where retirement_date is null
      -- Sin codigoalterno no se considera asociado vigente.
      and nullif(trim(codigo_alterno), '') is not null
    order by codigo_alterno,
             start_date_area desc nulls last,
             admission_date desc nulls last,
             id_employee
  )
  select json_build_object(
    'updatedAt',
      coalesce((select max(synced_at)::date::text from public.empleados_detail),
               current_date::text),
    'clients',
      coalesce((
        select json_agg(c order by c->>'name')
        from (
          select json_build_object(
            'id',      regexp_replace(lower(coalesce(sub_account, 'sin-nombre')),
                                      '[^a-z0-9]+', '-', 'g'),
            'name',    coalesce(nullif(trim(sub_account), ''), 'Sin nombre'),
            'account', account,
            'employees', json_agg(
              json_build_object(
                'id',            id_employee,
                'name',          coalesce(nullif(trim(employee_name), ''), 'Sin nombre'),
                'area',          coalesce(nullif(trim(area), ''), 'Sin área'),
                'codigoInterno', codigo_alterno
              )
              order by employee_name
            )
          ) as c
          from persona
          group by
            regexp_replace(lower(coalesce(sub_account, 'sin-nombre')), '[^a-z0-9]+', '-', 'g'),
            sub_account,
            account
        ) t
      ), '[]'::json)
  );
$function$;
