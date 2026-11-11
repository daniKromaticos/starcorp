-- Single-use CSRF nonces for QuickBooks OAuth flow.
-- Created by qb-oauth-init, consumed by qb-oauth-callback.
create table if not exists qb_oauth_states (
  nonce       text primary key,
  user_id     uuid not null references auth.users on delete cascade,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz not null default now() + interval '10 minutes'
);

alter table qb_oauth_states enable row level security;
drop policy if exists "no client access" on qb_oauth_states;
create policy "no client access" on qb_oauth_states for all using (false);

create index if not exists qb_oauth_states_expires_idx on qb_oauth_states(expires_at);
