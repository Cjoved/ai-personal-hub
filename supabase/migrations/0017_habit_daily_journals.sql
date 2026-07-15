-- Daily learning journal (fixed prompts, one row per user per day)
create table if not exists public.habit_daily_journals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  journal_on date not null,
  keep_doing text,
  avoid_doing text,
  win text,
  tomorrow_focus text,
  mood smallint default null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, journal_on),
  constraint habit_daily_journals_mood_check
    check (mood is null or (mood >= 1 and mood <= 5))
);

create index if not exists habit_daily_journals_user_id_journal_on_idx
  on public.habit_daily_journals (user_id, journal_on desc);

drop trigger if exists set_habit_daily_journals_updated_at on public.habit_daily_journals;
create trigger set_habit_daily_journals_updated_at
before update on public.habit_daily_journals
for each row execute function public.set_updated_at();

alter table public.habit_daily_journals enable row level security;

drop policy if exists "Users can read own habit daily journals" on public.habit_daily_journals;
create policy "Users can read own habit daily journals"
on public.habit_daily_journals for select to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create own habit daily journals" on public.habit_daily_journals;
create policy "Users can create own habit daily journals"
on public.habit_daily_journals for insert to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own habit daily journals" on public.habit_daily_journals;
create policy "Users can update own habit daily journals"
on public.habit_daily_journals for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own habit daily journals" on public.habit_daily_journals;
create policy "Users can delete own habit daily journals"
on public.habit_daily_journals for delete to authenticated
using ((select auth.uid()) = user_id);
