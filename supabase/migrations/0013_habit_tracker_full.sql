-- Habit Tracker full scope: types, flexible frequency, rich checks, freezes, XP

-- Expand habits columns
alter table public.habits
  add column if not exists habit_type text not null default 'boolean',
  add column if not exists target_value numeric(12, 2) default null,
  add column if not exists unit text default null,
  add column if not exists times_per_week smallint default null,
  add column if not exists interval_days smallint default null,
  add column if not exists stack_after_habit_id uuid default null references public.habits(id) on delete set null,
  add column if not exists xp_reward smallint not null default 10;

alter table public.habits drop constraint if exists habits_frequency_check;
alter table public.habits
  add constraint habits_frequency_check
  check (frequency in ('daily', 'weekly', 'custom_days', 'times_per_week', 'every_n_days'));

alter table public.habits drop constraint if exists habits_habit_type_check;
alter table public.habits
  add constraint habits_habit_type_check
  check (habit_type in ('boolean', 'quantity', 'duration'));

alter table public.habits drop constraint if exists habits_times_per_week_check;
alter table public.habits
  add constraint habits_times_per_week_check
  check (times_per_week is null or (times_per_week >= 1 and times_per_week <= 7));

alter table public.habits drop constraint if exists habits_interval_days_check;
alter table public.habits
  add constraint habits_interval_days_check
  check (interval_days is null or interval_days >= 1);

create index if not exists habits_stack_after_habit_id_idx
  on public.habits (stack_after_habit_id);

-- Expand habit_checks
alter table public.habit_checks
  add column if not exists value numeric(12, 2) default null,
  add column if not exists status text not null default 'completed',
  add column if not exists mood smallint default null,
  add column if not exists journal_note text default null,
  add column if not exists sentiment jsonb default null;

alter table public.habit_checks drop constraint if exists habit_checks_status_check;
alter table public.habit_checks
  add constraint habit_checks_status_check
  check (status in ('completed', 'skipped', 'partial'));

alter table public.habit_checks drop constraint if exists habit_checks_mood_check;
alter table public.habit_checks
  add constraint habit_checks_mood_check
  check (mood is null or (mood >= 1 and mood <= 5));

drop policy if exists "Users can update own habit checks" on public.habit_checks;
create policy "Users can update own habit checks"
on public.habit_checks for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- Streak freezes used per habit/day
create table if not exists public.habit_freezes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid not null references public.habits(id) on delete cascade,
  used_on date not null,
  created_at timestamptz not null default now(),
  unique (habit_id, used_on)
);

create index if not exists habit_freezes_user_id_used_on_idx
  on public.habit_freezes (user_id, used_on desc);

alter table public.habit_freezes enable row level security;

drop policy if exists "Users can read own habit freezes" on public.habit_freezes;
create policy "Users can read own habit freezes"
on public.habit_freezes for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create own habit freezes" on public.habit_freezes;
create policy "Users can create own habit freezes"
on public.habit_freezes for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own habit freezes" on public.habit_freezes;
create policy "Users can delete own habit freezes"
on public.habit_freezes for delete to authenticated
using ((select auth.uid()) = user_id);

-- Per-user XP / levels / freeze tokens / badges
create table if not exists public.habit_user_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  xp integer not null default 0 check (xp >= 0),
  level integer not null default 1 check (level >= 1),
  freeze_tokens integer not null default 2 check (freeze_tokens >= 0),
  badges jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now()
);

drop trigger if exists set_habit_user_progress_updated_at on public.habit_user_progress;
create trigger set_habit_user_progress_updated_at
before update on public.habit_user_progress
for each row execute function public.set_updated_at();

alter table public.habit_user_progress enable row level security;

drop policy if exists "Users can read own habit progress" on public.habit_user_progress;
create policy "Users can read own habit progress"
on public.habit_user_progress for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own habit progress" on public.habit_user_progress;
create policy "Users can insert own habit progress"
on public.habit_user_progress for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own habit progress" on public.habit_user_progress;
create policy "Users can update own habit progress"
on public.habit_user_progress for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- Reminder interaction events (analytics only; not bandit)
create table if not exists public.habit_reminder_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  habit_id uuid references public.habits(id) on delete set null,
  event_type text not null check (event_type in ('shown', 'clicked', 'dismissed')),
  occurred_at timestamptz not null default now()
);

create index if not exists habit_reminder_events_user_id_occurred_at_idx
  on public.habit_reminder_events (user_id, occurred_at desc);

alter table public.habit_reminder_events enable row level security;

drop policy if exists "Users can read own habit reminder events" on public.habit_reminder_events;
create policy "Users can read own habit reminder events"
on public.habit_reminder_events for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create own habit reminder events" on public.habit_reminder_events;
create policy "Users can create own habit reminder events"
on public.habit_reminder_events for insert to authenticated
with check ((select auth.uid()) = user_id);
