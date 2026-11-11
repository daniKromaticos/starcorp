-- QuickBooks per-user OAuth tokens.
-- Service-role only: the client never reads or writes here.

create table if not exists qb_user_tokens (
  user_id            uuid primary key references auth.users on delete cascade,
  realm_id           text not null,
  access_token       text not null,
  refresh_token      text not null,
  access_expires_at  timestamptz not null,
  refresh_expires_at timestamptz not null,
  updated_at         timestamptz not null default now()
);

alter table qb_user_tokens enable row level security;

drop policy if exists "no client access" on qb_user_tokens;
create policy "no client access" on qb_user_tokens for all using (false);
