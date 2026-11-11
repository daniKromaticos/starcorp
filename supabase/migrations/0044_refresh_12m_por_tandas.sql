-- Corrige 0043: disparar los 13 meses de una sola vez satura la base.
--
-- En la primera prueba real 9 de 13 corridas murieron con
-- "upsert at offset 0: canceling statement due to statement timeout", y las 4
-- que sobrevivieron tardaron 40s en vez de los ~11s que tardan cuando corren
-- de a cuatro.
--
-- Espaciarlas con pg_sleep dentro de la función no sirve: net.http_post encola
-- la petición dentro de la transacción, así que el worker de pg_net no ve nada
-- hasta el commit y las 13 salen juntas igual. Y COMMIT dentro de un
-- procedimiento no es opción porque pg_cron ya ejecuta el job dentro de una
-- transacción.
--
-- Solución: cuatro jobs separados con tres minutos de diferencia, de a 3-4
-- meses cada uno. Cada tanda es del tamaño que ya se probó que aguanta.

drop function if exists public.pbi_sync_refresh_last_12_months();
select cron.unschedule('pbi-sync-auxiliar-refresh-12m');

-- Dispara un sync por cada mes del rango, expresado en offsets respecto al mes
-- corriente: (-12, -9) son los meses que empiezan 12, 11, 10 y 9 meses atrás.
create or replace function public.pbi_sync_refresh_months(
  p_from_offset integer,
  p_to_offset   integer
)
returns integer
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_url         text;
  v_secret      text;
  v_month_start date := date_trunc('month', current_date)::date;
  v_from        date;
  v_to          date;
  v_off         integer;
  v_count       integer := 0;
begin
  if p_from_offset > p_to_offset then
    raise exception 'rango invalido: % > %', p_from_offset, p_to_offset;
  end if;
  if p_to_offset - p_from_offset > 5 then
    raise exception 'tanda demasiado grande (% meses): la base no aguanta mas de ~4 syncs en paralelo',
      p_to_offset - p_from_offset + 1;
  end if;

  select value into v_url    from starcorp_vault where key = 'PROJECT_URL';
  select value into v_secret from starcorp_vault where key = 'PBI_SYNC_CRON_SECRET';
  if v_url is null or v_secret is null then
    raise exception 'PROJECT_URL/PBI_SYNC_CRON_SECRET missing in vault';
  end if;

  for v_off in p_from_offset..p_to_offset loop
    v_from := (v_month_start + (v_off || ' months')::interval)::date;
    v_to   := (v_from + interval '1 month')::date;

    perform net.http_post(
      url     := v_url || '/functions/v1/pbi-sync-auxiliar',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'x-cron-secret', v_secret
      ),
      body    := jsonb_build_object('from', v_from::text, 'to', v_to::text),
      timeout_milliseconds := 90000
    );
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$function$;

revoke all on function public.pbi_sync_refresh_months(integer, integer) from public;
revoke all on function public.pbi_sync_refresh_months(integer, integer) from anon, authenticated;

-- Domingos desde las 2:00am Colombia (07:00 UTC), una tanda cada 3 minutos.
-- 4 + 3 + 3 + 3 = los 12 meses cerrados más el corriente.
select cron.schedule('pbi-sync-refresh-12m-1', '0 7 * * 0',  $$select pbi_sync_refresh_months(-12, -9);$$);
select cron.schedule('pbi-sync-refresh-12m-2', '3 7 * * 0',  $$select pbi_sync_refresh_months(-8, -6);$$);
select cron.schedule('pbi-sync-refresh-12m-3', '6 7 * * 0',  $$select pbi_sync_refresh_months(-5, -3);$$);
select cron.schedule('pbi-sync-refresh-12m-4', '9 7 * * 0',  $$select pbi_sync_refresh_months(-2, 0);$$);
