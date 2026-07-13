-- Personal Finance Tracking — accounts, recurring, envelopes, investments, debts, goals
-- Additive on top of budget_categories / budget_transactions (0012)

-- Accounts / wallets
create table if not exists public.finance_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  account_type text not null default 'cash'
    check (account_type in ('cash', 'bank', 'ewallet', 'other')),
  opening_balance numeric(14, 2) not null default 0,
  currency text not null default 'PHP',
  color text default '#1e40af',
  is_archived boolean not null default false,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists finance_accounts_user_id_idx
  on public.finance_accounts (user_id, position);

drop trigger if exists set_finance_accounts_updated_at on public.finance_accounts;
create trigger set_finance_accounts_updated_at
before update on public.finance_accounts
for each row execute function public.set_updated_at();

alter table public.finance_accounts enable row level security;

drop policy if exists "Users can read own finance accounts" on public.finance_accounts;
create policy "Users can read own finance accounts"
on public.finance_accounts for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create own finance accounts" on public.finance_accounts;
create policy "Users can create own finance accounts"
on public.finance_accounts for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own finance accounts" on public.finance_accounts;
create policy "Users can update own finance accounts"
on public.finance_accounts for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own finance accounts" on public.finance_accounts;
create policy "Users can delete own finance accounts"
on public.finance_accounts for delete to authenticated
using ((select auth.uid()) = user_id);

-- Link transactions to accounts + transfers
alter table public.budget_transactions
  add column if not exists account_id uuid references public.finance_accounts(id) on delete set null;

alter table public.budget_transactions
  add column if not exists transfer_pair_id uuid;

alter table public.budget_transactions
  alter column category_id drop not null;

alter table public.budget_transactions
  drop constraint if exists budget_transactions_type_check;

alter table public.budget_transactions
  add constraint budget_transactions_type_check
  check (
    type in ('income', 'expense', 'transfer')
    and (
      category_id is not null
      or type = 'transfer'
      or transfer_pair_id is not null
    )
  );

create index if not exists budget_transactions_account_id_idx
  on public.budget_transactions (account_id);

create index if not exists budget_transactions_transfer_pair_id_idx
  on public.budget_transactions (transfer_pair_id)
  where transfer_pair_id is not null;

create index if not exists budget_transactions_note_trgm_idx
  on public.budget_transactions (user_id, occurred_on desc);

-- Recurring templates
create table if not exists public.finance_recurring (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  amount numeric(14, 2) not null check (amount > 0),
  type text not null check (type in ('income', 'expense')),
  category_id uuid references public.budget_categories(id) on delete set null,
  account_id uuid references public.finance_accounts(id) on delete set null,
  cadence text not null default 'monthly'
    check (cadence in ('weekly', 'monthly', 'yearly')),
  next_due date not null default (current_date),
  is_active boolean not null default true,
  is_subscription boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists finance_recurring_user_id_idx
  on public.finance_recurring (user_id, next_due);

drop trigger if exists set_finance_recurring_updated_at on public.finance_recurring;
create trigger set_finance_recurring_updated_at
before update on public.finance_recurring
for each row execute function public.set_updated_at();

alter table public.finance_recurring enable row level security;

drop policy if exists "Users can read own finance recurring" on public.finance_recurring;
create policy "Users can read own finance recurring"
on public.finance_recurring for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create own finance recurring" on public.finance_recurring;
create policy "Users can create own finance recurring"
on public.finance_recurring for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own finance recurring" on public.finance_recurring;
create policy "Users can update own finance recurring"
on public.finance_recurring for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own finance recurring" on public.finance_recurring;
create policy "Users can delete own finance recurring"
on public.finance_recurring for delete to authenticated
using ((select auth.uid()) = user_id);

-- Zero-based envelopes (per month + category)
create table if not exists public.finance_envelopes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  month_key text not null check (month_key ~ '^\d{4}-\d{2}$'),
  category_id uuid not null references public.budget_categories(id) on delete cascade,
  allocated_amount numeric(14, 2) not null default 0 check (allocated_amount >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, month_key, category_id)
);

create index if not exists finance_envelopes_user_month_idx
  on public.finance_envelopes (user_id, month_key);

drop trigger if exists set_finance_envelopes_updated_at on public.finance_envelopes;
create trigger set_finance_envelopes_updated_at
before update on public.finance_envelopes
for each row execute function public.set_updated_at();

alter table public.finance_envelopes enable row level security;

drop policy if exists "Users can read own finance envelopes" on public.finance_envelopes;
create policy "Users can read own finance envelopes"
on public.finance_envelopes for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create own finance envelopes" on public.finance_envelopes;
create policy "Users can create own finance envelopes"
on public.finance_envelopes for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own finance envelopes" on public.finance_envelopes;
create policy "Users can update own finance envelopes"
on public.finance_envelopes for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own finance envelopes" on public.finance_envelopes;
create policy "Users can delete own finance envelopes"
on public.finance_envelopes for delete to authenticated
using ((select auth.uid()) = user_id);

-- Holdings
create table if not exists public.finance_holdings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  symbol text,
  asset_class text not null default 'stock'
    check (asset_class in ('stock', 'uitf', 'mutual_fund', 'crypto', 'time_deposit', 'other')),
  currency text not null default 'PHP',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists finance_holdings_user_id_idx
  on public.finance_holdings (user_id);

drop trigger if exists set_finance_holdings_updated_at on public.finance_holdings;
create trigger set_finance_holdings_updated_at
before update on public.finance_holdings
for each row execute function public.set_updated_at();

alter table public.finance_holdings enable row level security;

drop policy if exists "Users can read own finance holdings" on public.finance_holdings;
create policy "Users can read own finance holdings"
on public.finance_holdings for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create own finance holdings" on public.finance_holdings;
create policy "Users can create own finance holdings"
on public.finance_holdings for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own finance holdings" on public.finance_holdings;
create policy "Users can update own finance holdings"
on public.finance_holdings for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own finance holdings" on public.finance_holdings;
create policy "Users can delete own finance holdings"
on public.finance_holdings for delete to authenticated
using ((select auth.uid()) = user_id);

-- Cost basis lots
create table if not exists public.finance_lots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  holding_id uuid not null references public.finance_holdings(id) on delete cascade,
  bought_on date not null default (current_date),
  units numeric(18, 8) not null check (units > 0),
  unit_cost numeric(18, 8) not null check (unit_cost >= 0),
  created_at timestamptz not null default now()
);

create index if not exists finance_lots_holding_id_idx
  on public.finance_lots (holding_id);

alter table public.finance_lots enable row level security;

drop policy if exists "Users can read own finance lots" on public.finance_lots;
create policy "Users can read own finance lots"
on public.finance_lots for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create own finance lots" on public.finance_lots;
create policy "Users can create own finance lots"
on public.finance_lots for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own finance lots" on public.finance_lots;
create policy "Users can update own finance lots"
on public.finance_lots for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own finance lots" on public.finance_lots;
create policy "Users can delete own finance lots"
on public.finance_lots for delete to authenticated
using ((select auth.uid()) = user_id);

-- Manual price marks
create table if not exists public.finance_price_marks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  holding_id uuid not null references public.finance_holdings(id) on delete cascade,
  marked_on date not null default (current_date),
  unit_price numeric(18, 8) not null check (unit_price >= 0),
  created_at timestamptz not null default now(),
  unique (holding_id, marked_on)
);

create index if not exists finance_price_marks_holding_id_idx
  on public.finance_price_marks (holding_id, marked_on desc);

alter table public.finance_price_marks enable row level security;

drop policy if exists "Users can read own finance price marks" on public.finance_price_marks;
create policy "Users can read own finance price marks"
on public.finance_price_marks for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create own finance price marks" on public.finance_price_marks;
create policy "Users can create own finance price marks"
on public.finance_price_marks for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own finance price marks" on public.finance_price_marks;
create policy "Users can update own finance price marks"
on public.finance_price_marks for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own finance price marks" on public.finance_price_marks;
create policy "Users can delete own finance price marks"
on public.finance_price_marks for delete to authenticated
using ((select auth.uid()) = user_id);

-- Dividends / interest
create table if not exists public.finance_dividends (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  holding_id uuid not null references public.finance_holdings(id) on delete cascade,
  paid_on date not null default (current_date),
  amount numeric(14, 2) not null check (amount > 0),
  note text,
  created_at timestamptz not null default now()
);

create index if not exists finance_dividends_holding_id_idx
  on public.finance_dividends (holding_id, paid_on desc);

alter table public.finance_dividends enable row level security;

drop policy if exists "Users can read own finance dividends" on public.finance_dividends;
create policy "Users can read own finance dividends"
on public.finance_dividends for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create own finance dividends" on public.finance_dividends;
create policy "Users can create own finance dividends"
on public.finance_dividends for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own finance dividends" on public.finance_dividends;
create policy "Users can update own finance dividends"
on public.finance_dividends for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own finance dividends" on public.finance_dividends;
create policy "Users can delete own finance dividends"
on public.finance_dividends for delete to authenticated
using ((select auth.uid()) = user_id);

-- Liabilities / debts
create table if not exists public.finance_liabilities (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  balance numeric(14, 2) not null check (balance >= 0),
  apr numeric(8, 4) not null default 0 check (apr >= 0),
  min_payment numeric(14, 2) not null default 0 check (min_payment >= 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists finance_liabilities_user_id_idx
  on public.finance_liabilities (user_id);

drop trigger if exists set_finance_liabilities_updated_at on public.finance_liabilities;
create trigger set_finance_liabilities_updated_at
before update on public.finance_liabilities
for each row execute function public.set_updated_at();

alter table public.finance_liabilities enable row level security;

drop policy if exists "Users can read own finance liabilities" on public.finance_liabilities;
create policy "Users can read own finance liabilities"
on public.finance_liabilities for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create own finance liabilities" on public.finance_liabilities;
create policy "Users can create own finance liabilities"
on public.finance_liabilities for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own finance liabilities" on public.finance_liabilities;
create policy "Users can update own finance liabilities"
on public.finance_liabilities for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own finance liabilities" on public.finance_liabilities;
create policy "Users can delete own finance liabilities"
on public.finance_liabilities for delete to authenticated
using ((select auth.uid()) = user_id);

-- Savings goals
create table if not exists public.finance_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  target_amount numeric(14, 2) not null check (target_amount > 0),
  current_amount numeric(14, 2) not null default 0 check (current_amount >= 0),
  due_on date,
  color text default '#059669',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists finance_goals_user_id_idx
  on public.finance_goals (user_id);

drop trigger if exists set_finance_goals_updated_at on public.finance_goals;
create trigger set_finance_goals_updated_at
before update on public.finance_goals
for each row execute function public.set_updated_at();

alter table public.finance_goals enable row level security;

drop policy if exists "Users can read own finance goals" on public.finance_goals;
create policy "Users can read own finance goals"
on public.finance_goals for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create own finance goals" on public.finance_goals;
create policy "Users can create own finance goals"
on public.finance_goals for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own finance goals" on public.finance_goals;
create policy "Users can update own finance goals"
on public.finance_goals for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own finance goals" on public.finance_goals;
create policy "Users can delete own finance goals"
on public.finance_goals for delete to authenticated
using ((select auth.uid()) = user_id);
