-- Range-based sync helpers. The edge function now accepts a {from, to} body
-- and processes a single date range per invocation. SQL helpers fan out
-- multiple parallel calls so each invocation has its own CPU budget
-- (Supabase edge functions cap at ~25-30s of CPU per call).

create or replace function pbi_sync_range(p_from date, p_to date)
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
    raise exception 'PROJECT_URL/PBI_SYNC_CRON_SECRET missing in vault';
  end if;

  select net.http_post(
    url     := v_url || '/functions/v1/pbi-sync-auxiliar',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'x-cron-secret', v_secret
    ),
    body    := jsonb_build_object('from', p_from::text, 'to', p_to::text),
    timeout_milliseconds := 60000
  ) into v_req_id;
  return v_req_id;
end;
$$;

revoke all on function pbi_sync_range(date, date) from public;
revoke execute on function pbi_sync_range(date, date) from anon;
revoke execute on function pbi_sync_range(date, date) from authenticated;

-- Fires N parallel calls, one per quarter, covering [p_start, p_end).
-- For heavy quarters (year-end closings, payroll spikes) that hit the CPU
-- cap, retry the offending range with monthly or bi-weekly subranges.
create or replace function pbi_sync_backfill_quarters(
  p_start date default '2023-01-01'::date,
  p_end   date default (current_date + interval '1 month')::date
)
returns table (q_start date, q_end date, request_id bigint)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_qs date := p_start;
  v_qe date;
begin
  while v_qs < p_end loop
    v_qe := (v_qs + interval '3 months')::date;
    if v_qe > p_end then v_qe := p_end; end if;
    q_start := v_qs;
    q_end   := v_qe;
    request_id := pbi_sync_range(v_qs, v_qe);
    return next;
    v_qs := v_qe;
  end loop;
end;
$$;

revoke all on function pbi_sync_backfill_quarters(date, date) from public;
revoke execute on function pbi_sync_backfill_quarters(date, date) from anon;
revoke execute on function pbi_sync_backfill_quarters(date, date) from authenticated;

-- Weekly cron now syncs the last 90 days only (incremental).
-- Empty body -> the edge function defaults to last 90 days.
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
  if v_url is null or v_secret is null then
    raise exception 'PROJECT_URL/PBI_SYNC_CRON_SECRET missing';
  end if;

  select net.http_post(
    url     := v_url || '/functions/v1/pbi-sync-auxiliar',
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

revoke all on function trigger_pbi_sync_auxiliar() from public;
revoke execute on function trigger_pbi_sync_auxiliar() from anon;
revoke execute on function trigger_pbi_sync_auxiliar() from authenticated;
