-- Recurring daily spend caps (Daily / custom weekdays) instead of one-off dates
alter table public.finance_daily_limits
  drop constraint if exists finance_daily_limits_user_id_account_id_limit_on_key;

alter table public.finance_daily_limits
  drop column if exists limit_on;

alter table public.finance_daily_limits
  add column if not exists schedule text not null default 'daily',
  add column if not exists target_days integer[] not null default '{}'::integer[];

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'finance_daily_limits_schedule_check'
  ) then
    alter table public.finance_daily_limits
      add constraint finance_daily_limits_schedule_check
      check (schedule in ('daily', 'custom_days'));
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'finance_daily_limits_user_account_unique'
  ) then
    alter table public.finance_daily_limits
      add constraint finance_daily_limits_user_account_unique
      unique (user_id, account_id);
  end if;
end $$;

drop index if exists finance_daily_limits_user_id_limit_on_idx;

create index if not exists finance_daily_limits_user_id_idx
  on public.finance_daily_limits (user_id);
