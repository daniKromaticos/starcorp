-- pbi-sync-historico nunca fue programado: la edge function existía desde
-- 2026-06-03 pero no había cron job que la invocara, así que
-- historico_emp_cli quedó congelada en su carga inicial (la tendencia de
-- asociados sólo mostraba may/jun 2026). Se agrega el trigger + cron diario
-- a las 11:00 UTC (6am Colombia), igual que los otros syncs PBI.

create or replace function public.trigger_pbi_sync_historico()
returns bigint
language plpgsql
security definer
set search_path to 'public'
as $function$
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
    url     := v_url || '/functions/v1/pbi-sync-historico',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'x-cron-secret', v_secret
    ),
    body    := '{}'::jsonb,
    timeout_milliseconds := 60000
  ) into v_req_id;
  return v_req_id;
end;
$function$;

select cron.schedule(
  'pbi-sync-historico-daily',
  '0 11 * * *',
  'select trigger_pbi_sync_historico();'
);
