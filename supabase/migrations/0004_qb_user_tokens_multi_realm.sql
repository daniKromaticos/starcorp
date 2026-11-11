-- Allow multiple QuickBooks companies (realms) per user.
-- Switch primary key from user_id to (user_id, realm_id) and cache company name.

alter table qb_user_tokens
  drop constraint if exists qb_user_tokens_pkey;

alter table qb_user_tokens
  add constraint qb_user_tokens_pkey primary key (user_id, realm_id);

alter table qb_user_tokens
  add column if not exists company_name text;

create index if not exists qb_user_tokens_user_id_idx
  on qb_user_tokens (user_id);
