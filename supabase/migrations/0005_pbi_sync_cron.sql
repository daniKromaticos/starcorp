-- Schedule weekly Power BI sync via pg_cron + pg_net.
-- The cron job calls the pbi-sync-auxiliar edge function, which writes
-- straight back into accounting_entries via service_role.

create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Required vault keys (operator must set real values after migration):
--   PBI_SYNC_CRON_SECRET     - long random string, also set as edge function secret
--   PBI_AUXILIAR_DATASET_ID  - Power BI datasetId of the Auxiliar model
--   PBI_AUXILIAR_GROUP_ID    - Power BI workspace (groupId) hosting the dataset
--   PROJECT_URL              - Supabase project URL (no trailing slash)
insert into starcorp_vault (key, value) values
  ('PBI_SYNC_CRON_SECRET',    'CHANGE_ME_BEFORE_USE'),
  ('PBI_AUXILIAR_DATASET_ID', 'CHANGE_ME'),
  ('PBI_AUXILIAR_GROUP_ID',   'CHANGE_ME'),
  ('PROJECT_URL',             'https://fczbzbtpyycrkxbpwhvl.supabase.co')
on conflict (key) do nothing;

create or replace function trigger_pbi_sync_auxiliar()
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

  if v_url    is null then raise exception 'PROJECT_URL missing in starcorp_vault';            end if;
  if v_secret is null then raise exception 'PBI_SYNC_CRON_SECRET missing in starcorp_vault';   end if;
  if v_secret = 'CHANGE_ME_BEFORE_USE' then
    raise exception 'PBI_SYNC_CRON_SECRET is still the placeholder; set a real value';
  end if;

  select net.http_post(
    url     := v_url || '/functions/v1/pbi-sync-auxiliar',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'x-cron-secret', v_secret
    ),
    body    := jsonb_build_object('source', 'cron')
  ) into v_req_id;

  return v_req_id;
end;
$$;

revoke all on function trigger_pbi_sync_auxiliar() from public;

-- Lunes 08:00 UTC = 03:00 hora Bogota (UTC-5).
select cron.schedule(
  'pbi-sync-auxiliar-weekly',
  '0 8 * * 1',
  $cron$select trigger_pbi_sync_auxiliar();$cron$
);
