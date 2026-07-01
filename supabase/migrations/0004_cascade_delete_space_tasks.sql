-- When a Space or List is deleted, remove related tasks (and their subtasks via tasks FK cascade).
alter table public.tasks drop constraint if exists tasks_space_id_fkey;
alter table public.tasks drop constraint if exists tasks_list_id_fkey;

alter table public.tasks
  add constraint tasks_space_id_fkey
    foreign key (space_id) references public.spaces(id) on delete cascade,
  add constraint tasks_list_id_fkey
    foreign key (list_id) references public.task_lists(id) on delete cascade;
