-- Personal Tracker: habits + budget (fuller v1)

-- Habit categories
create table if not exists public.habit_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  color text default '#f59e0b',
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists habit_categories_user_id_position_idx
  on public.habit_categories (user_id, position);

drop trigger if exists set_habit_categories_updated_at on public.habit_categories;
create trigger set_habit_categories_updated_at
before update on public.habit_categories
for each row execute function public.set_updated_at();

alter table public.habit_categories enable row level security;

drop policy if exists "Users can read own habit categories" on public.habit_categories;
create policy "Users can read own habit categories"
on public.habit_categories for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create own habit categories" on public.habit_categories;
create policy "Users can create own habit categories"
on public.habit_categories for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own habit categories" on public.habit_categories;
create policy "Users can update own habit categories"
on public.habit_categories for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own habit categories" on public.habit_categories;
create policy "Users can delete own habit categories"
on public.habit_categories for delete to authenticated
using ((select auth.uid()) = user_id);

-- Habits
create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid references public.habit_categories(id) on delete set null,
  title text not null check (char_length(trim(title)) > 0),
  color text default '#10b981',
  notes text,
  frequency text not null default 'daily' check (frequency in ('daily', 'weekly')),
  target_days smallint[] default null,
  reminder_time time default null,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists habits_user_id_archived_idx
  on public.habits (user_id, is_archived);

create index if not exists habits_user_id_category_id_idx
  on public.habits (user_id, category_id);

drop trigger if exists set_habits_updated_at on public.habits;
create trigger set_habits_updated_at
before update on public.habits
for each row execute function public.set_updated_at();

alter table public.habits enable row level security;

drop policy if exists "Users can read own habits" on public.habits;
create policy "Users can read own habits"
on public.habits for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create own habits" on public.habits;
create policy "Users can create own habits"
on public.habits for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own habits" on public.habits;
create policy "Users can update own habits"
on public.habits for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own habits" on public.habits;
create policy "Users can delete own habits"
on public.habits for delete to authenticated
using ((select auth.uid()) = user_id);

-- Habit checks
create table if not exists public.habit_checks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade,
  checked_on date not null,
  created_at timestamptz not null default now(),
  unique (habit_id, checked_on)
);

create index if not exists habit_checks_user_id_checked_on_idx
  on public.habit_checks (user_id, checked_on desc);

create index if not exists habit_checks_habit_id_checked_on_idx
  on public.habit_checks (habit_id, checked_on desc);

alter table public.habit_checks enable row level security;

drop policy if exists "Users can read own habit checks" on public.habit_checks;
create policy "Users can read own habit checks"
on public.habit_checks for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create own habit checks" on public.habit_checks;
create policy "Users can create own habit checks"
on public.habit_checks for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own habit checks" on public.habit_checks;
create policy "Users can delete own habit checks"
on public.habit_checks for delete to authenticated
using ((select auth.uid()) = user_id);

-- Budget categories
create table if not exists public.budget_categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  kind text not null default 'expense' check (kind in ('income', 'expense')),
  color text default '#6366f1',
  monthly_limit numeric(12, 2) default null check (monthly_limit is null or monthly_limit > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists budget_categories_user_id_kind_idx
  on public.budget_categories (user_id, kind);

drop trigger if exists set_budget_categories_updated_at on public.budget_categories;
create trigger set_budget_categories_updated_at
before update on public.budget_categories
for each row execute function public.set_updated_at();

alter table public.budget_categories enable row level security;

drop policy if exists "Users can read own budget categories" on public.budget_categories;
create policy "Users can read own budget categories"
on public.budget_categories for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create own budget categories" on public.budget_categories;
create policy "Users can create own budget categories"
on public.budget_categories for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own budget categories" on public.budget_categories;
create policy "Users can update own budget categories"
on public.budget_categories for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own budget categories" on public.budget_categories;
create policy "Users can delete own budget categories"
on public.budget_categories for delete to authenticated
using ((select auth.uid()) = user_id);

-- Budget transactions
create table if not exists public.budget_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.budget_categories(id) on delete restrict,
  amount numeric(12, 2) not null check (amount > 0),
  type text not null check (type in ('income', 'expense')),
  note text,
  occurred_on date not null default (current_date),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists budget_transactions_user_id_occurred_on_idx
  on public.budget_transactions (user_id, occurred_on desc);

create index if not exists budget_transactions_user_id_category_id_idx
  on public.budget_transactions (user_id, category_id);

drop trigger if exists set_budget_transactions_updated_at on public.budget_transactions;
create trigger set_budget_transactions_updated_at
before update on public.budget_transactions
for each row execute function public.set_updated_at();

alter table public.budget_transactions enable row level security;

drop policy if exists "Users can read own budget transactions" on public.budget_transactions;
create policy "Users can read own budget transactions"
on public.budget_transactions for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create own budget transactions" on public.budget_transactions;
create policy "Users can create own budget transactions"
on public.budget_transactions for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own budget transactions" on public.budget_transactions;
create policy "Users can update own budget transactions"
on public.budget_transactions for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own budget transactions" on public.budget_transactions;
create policy "Users can delete own budget transactions"
on public.budget_transactions for delete to authenticated
using ((select auth.uid()) = user_id);
