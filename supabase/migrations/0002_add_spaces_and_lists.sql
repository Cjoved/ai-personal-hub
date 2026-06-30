create table if not exists public.spaces (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  icon text,
  color text,
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.task_lists (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  space_id uuid not null references public.spaces(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  position integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tasks
add column if not exists space_id uuid references public.spaces(id) on delete set null,
add column if not exists list_id uuid references public.task_lists(id) on delete set null;

create index if not exists spaces_user_id_position_idx on public.spaces (user_id, position);
create index if not exists task_lists_user_id_space_id_position_idx on public.task_lists (user_id, space_id, position);
create index if not exists tasks_user_id_space_id_idx on public.tasks (user_id, space_id);
create index if not exists tasks_user_id_list_id_idx on public.tasks (user_id, list_id);

drop trigger if exists set_spaces_updated_at on public.spaces;
create trigger set_spaces_updated_at
before update on public.spaces
for each row
execute function public.set_updated_at();

drop trigger if exists set_task_lists_updated_at on public.task_lists;
create trigger set_task_lists_updated_at
before update on public.task_lists
for each row
execute function public.set_updated_at();

alter table public.spaces enable row level security;
alter table public.task_lists enable row level security;

drop policy if exists "Users can read own spaces" on public.spaces;
create policy "Users can read own spaces"
on public.spaces
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create own spaces" on public.spaces;
create policy "Users can create own spaces"
on public.spaces
for insert
to authenticated
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own spaces" on public.spaces;
create policy "Users can update own spaces"
on public.spaces
for update
to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can delete own spaces" on public.spaces;
create policy "Users can delete own spaces"
on public.spaces
for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can read own task lists" on public.task_lists;
create policy "Users can read own task lists"
on public.task_lists
for select
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create own task lists" on public.task_lists;
create policy "Users can create own task lists"
on public.task_lists
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.spaces
    where spaces.id = task_lists.space_id
      and spaces.user_id = (select auth.uid())
  )
);

drop policy if exists "Users can update own task lists" on public.task_lists;
create policy "Users can update own task lists"
on public.task_lists
for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and exists (
    select 1
    from public.spaces
    where spaces.id = task_lists.space_id
      and spaces.user_id = (select auth.uid())
  )
);

drop policy if exists "Users can delete own task lists" on public.task_lists;
create policy "Users can delete own task lists"
on public.task_lists
for delete
to authenticated
using ((select auth.uid()) = user_id);

drop policy if exists "Users can create own tasks" on public.tasks;
create policy "Users can create own tasks"
on public.tasks
for insert
to authenticated
with check (
  (select auth.uid()) = user_id
  and (
    space_id is null
    or exists (
      select 1
      from public.spaces
      where spaces.id = tasks.space_id
        and spaces.user_id = (select auth.uid())
    )
  )
  and (
    list_id is null
    or exists (
      select 1
      from public.task_lists
      where task_lists.id = tasks.list_id
        and task_lists.user_id = (select auth.uid())
    )
  )
);

drop policy if exists "Users can update own tasks" on public.tasks;
create policy "Users can update own tasks"
on public.tasks
for update
to authenticated
using ((select auth.uid()) = user_id)
with check (
  (select auth.uid()) = user_id
  and (
    space_id is null
    or exists (
      select 1
      from public.spaces
      where spaces.id = tasks.space_id
        and spaces.user_id = (select auth.uid())
    )
  )
  and (
    list_id is null
    or exists (
      select 1
      from public.task_lists
      where task_lists.id = tasks.list_id
        and task_lists.user_id = (select auth.uid())
    )
  )
);
