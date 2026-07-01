-- Ensure task list belongs to its space when both are set
create or replace function public.enforce_task_list_space_consistency()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  list_space_id uuid;
begin
  if new.list_id is null then
    return new;
  end if;

  select space_id into list_space_id
  from public.task_lists
  where id = new.list_id and user_id = new.user_id;

  if list_space_id is null then
    raise exception 'List does not exist for this user';
  end if;

  new.space_id := list_space_id;
  return new;
end;
$$;

drop trigger if exists enforce_task_list_space_consistency on public.tasks;
create trigger enforce_task_list_space_consistency
before insert or update of list_id, space_id on public.tasks
for each row
execute function public.enforce_task_list_space_consistency();
