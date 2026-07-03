-- Speed up monthly purge of completed tasks
create index if not exists tasks_user_status_completed_at_idx
  on public.tasks (user_id, status, completed_at)
  where status = 'done';
