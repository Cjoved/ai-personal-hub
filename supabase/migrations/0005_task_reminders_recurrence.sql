-- Per-task reminders and simple recurrence
alter table public.tasks
  add column if not exists reminder_at timestamptz,
  add column if not exists recurrence_rule text not null default 'none',
  add column if not exists recurrence_interval integer not null default 1;

alter table public.tasks
  drop constraint if exists tasks_recurrence_rule_check;

alter table public.tasks
  add constraint tasks_recurrence_rule_check
  check (recurrence_rule in ('none', 'daily', 'weekly', 'monthly'));

alter table public.tasks
  drop constraint if exists tasks_recurrence_interval_check;

alter table public.tasks
  add constraint tasks_recurrence_interval_check
  check (recurrence_interval >= 1 and recurrence_interval <= 365);

create index if not exists tasks_user_id_reminder_at_idx
  on public.tasks (user_id, reminder_at)
  where reminder_at is not null;
