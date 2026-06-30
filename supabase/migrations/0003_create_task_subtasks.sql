create table if not exists public.task_subtasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid not null references public.tasks(id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  status text not null default 'todo',
  position integer not null default 0,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint task_subtasks_status_check check (status in ('todo', 'in_progress', 'done'))
);

create index if not exists task_subtasks_user_id_idx on public.task_subtasks (user_id);
create index if not exists task_subtasks_task_id_position_idx on public.task_subtasks (task_id, position);

drop trigger if exists set_task_subtasks_updated_at on public.task_subtasks;
create trigger set_task_subtasks_updated_at
before update on public.task_subtasks
for each row
execute function public.set_updated_at();

alter table public.task_subtasks enable row level security;

drop policy if exists "Users can read own task subtasks" on public.task_subtasks;
create policy "Users can read own task subtasks"
on public.task_subtasks
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create own task subtasks" on public.task_subtasks;
create policy "Users can create own task subtasks"
on public.task_subtasks
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.tasks
    where tasks.id = task_subtasks.task_id
      and tasks.user_id = (select auth.uid())
  )
);

drop policy if exists "Users can update own task subtasks" on public.task_subtasks;
create policy "Users can update own task subtasks"
on public.task_subtasks
for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.tasks
    where tasks.id = task_subtasks.task_id
      and tasks.user_id = (select auth.uid())
  )
);

drop policy if exists "Users can delete own task subtasks" on public.task_subtasks;
create policy "Users can delete own task subtasks"
on public.task_subtasks
for delete
to authenticated
using ((select auth.uid()) = user_id);
