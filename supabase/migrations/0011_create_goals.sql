-- Motivational goals: display-only reminders with a countdown timeframe
create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  description text,
  starts_at timestamptz not null default now(),
  ends_at timestamptz not null,
  color text default '#6366f1',
  status text not null default 'active' check (status in ('active', 'ended')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at > starts_at)
);

create index if not exists goals_user_id_status_idx on public.goals (user_id, status);
create index if not exists goals_user_id_ends_at_idx on public.goals (user_id, ends_at);

drop trigger if exists set_goals_updated_at on public.goals;
create trigger set_goals_updated_at
before update on public.goals
for each row execute function public.set_updated_at();

alter table public.goals enable row level security;

drop policy if exists "Users can read own goals" on public.goals;
create policy "Users can read own goals"
on public.goals
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create own goals" on public.goals;
create policy "Users can create own goals"
on public.goals
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own goals" on public.goals;
create policy "Users can update own goals"
on public.goals
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own goals" on public.goals;
create policy "Users can delete own goals"
on public.goals
for delete
to authenticated
using ((select auth.uid()) = user_id);
