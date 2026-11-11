-- Tighten exposure flagged by Supabase advisors after 0004/0005.
-- (pg_net SET SCHEMA is unsupported on this build, so we leave it in public;
--  the only mitigation is the function-level revokes below.)

-- get_dashboard_summary: keep `authenticated`; deny everyone else explicitly.
revoke execute on function get_dashboard_summary(text, text, boolean) from anon;
revoke execute on function get_dashboard_summary(text, text, boolean) from public;

-- refresh_mv_monthly_summary: only service_role (already granted).
-- Strip whatever PostgREST exposed implicitly to anon/authenticated.
revoke execute on function refresh_mv_monthly_summary() from anon;
revoke execute on function refresh_mv_monthly_summary() from authenticated;
revoke execute on function refresh_mv_monthly_summary() from public;

-- trigger_pbi_sync_auxiliar: only postgres (cron) needs it.
revoke execute on function trigger_pbi_sync_auxiliar() from anon;
revoke execute on function trigger_pbi_sync_auxiliar() from authenticated;
revoke execute on function trigger_pbi_sync_auxiliar() from public;
