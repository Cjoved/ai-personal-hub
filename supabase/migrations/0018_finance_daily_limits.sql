-- Recurring daily spend caps per account (Daily / weekly / custom weekdays)
create table if not exists public.finance_daily_limits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null references public.finance_accounts(id) on delete cascade,
  amount numeric(14, 2) not null check (amount > 0),
  schedule text not null default 'daily' check (schedule in ('daily', 'custom_days', 'weekly')),
  target_days integer[] not null default '{}'::integer[],
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, account_id)
);

create index if not exists finance_daily_limits_user_id_idx
  on public.finance_daily_limits (user_id);

create index if not exists finance_daily_limits_account_id_idx
  on public.finance_daily_limits (account_id);

drop trigger if exists set_finance_daily_limits_updated_at on public.finance_daily_limits;
create trigger set_finance_daily_limits_updated_at
before update on public.finance_daily_limits
for each row execute function public.set_updated_at();

alter table public.finance_daily_limits enable row level security;

drop policy if exists "Users can read own finance daily limits" on public.finance_daily_limits;
create policy "Users can read own finance daily limits"
on public.finance_daily_limits for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create own finance daily limits" on public.finance_daily_limits;
create policy "Users can create own finance daily limits"
on public.finance_daily_limits for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own finance daily limits" on public.finance_daily_limits;
create policy "Users can update own finance daily limits"
on public.finance_daily_limits for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own finance daily limits" on public.finance_daily_limits;
create policy "Users can delete own finance daily limits"
on public.finance_daily_limits for delete to authenticated
using ((select auth.uid()) = user_id);
