-- Refresco semanal de los últimos 12 meses del Auxiliar.
--
-- El cron diario sólo mira 90 días hacia atrás, así que un ajuste que
-- contabilidad haga sobre un mes más viejo nunca llegaba a la app: el 12m se
-- iba desviando solo. El 2026-08-04 enero–abril acumulaban 2.406 filas rancias
-- (marzo era el peor: +9.040 en ingresos y +21.094 en costos frente a PBI).
--
-- No se amplía la ventana diaria a 365 días porque serían ~70k filas en una
-- sola corrida y vuelve a chocar con el tope de CPU de las edge functions. En
-- vez de eso se disparan 13 invocaciones de un mes cada una (12 cerrados + el
-- corriente), que corren en paralelo y tardan ~12s cada una. Los rangos son
-- disjuntos, así que el prune de cada corrida no pisa a las demás.

create or replace function public.pbi_sync_refresh_last_12_months()
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
  v_i           integer;
  v_count       integer := 0;
begin
  select value into v_url    from starcorp_vault where key = 'PROJECT_URL';
  select value into v_secret from starcorp_vault where key = 'PBI_SYNC_CRON_SECRET';
  if v_url is null or v_secret is null then
    raise exception 'PROJECT_URL/PBI_SYNC_CRON_SECRET missing in vault';
  end if;

  -- i = 0 → el mes que empieza 12 meses atrás; i = 12 → el mes corriente.
  for v_i in 0..12 loop
    v_from := (v_month_start - ((12 - v_i) || ' months')::interval)::date;
    v_to   := (v_from + interval '1 month')::date;

    perform net.http_post(
      url     := v_url || '/functions/v1/pbi-sync-auxiliar',
      headers := jsonb_build_object(
        'Content-Type',  'application/json',
        'x-cron-secret', v_secret
      ),
      body    := jsonb_build_object('from', v_from::text, 'to', v_to::text),
      timeout_milliseconds := 60000
    );
    v_count := v_count + 1;
  end loop;

  return v_count;
end;
$function$;

revoke all on function public.pbi_sync_refresh_last_12_months() from public;
revoke all on function public.pbi_sync_refresh_last_12_months() from anon, authenticated;

-- Domingos 2:00am Colombia (07:00 UTC). No coincide con el sync del auxiliar
-- (03:00 / 11:00 / 19:00 UTC) ni con los demás jobs (11:00 UTC).
select cron.schedule(
  'pbi-sync-auxiliar-refresh-12m',
  '0 7 * * 0',
  $$select pbi_sync_refresh_last_12_months();$$
);
