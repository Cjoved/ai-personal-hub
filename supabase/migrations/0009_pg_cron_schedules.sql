-- Scheduled jobs: 4 daily Telegram reminders + monthly task cleanup + cron log purge
-- BEFORE running: store secrets in Supabase Vault (Dashboard → Project Settings → Vault):
--   cron_app_url  = https://YOUR_APP.vercel.app
--   cron_secret   = same value as Vercel CRON_SECRET

create extension if not exists pg_cron with schema extensions;
create extension if not exists pg_net with schema extensions;

-- Invoke Vercel task-reminder API for a time slot
create or replace function public.invoke_task_reminder(p_slot text)
returns bigint
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  app_url text;
  cron_secret text;
  req_id bigint;
  allowed_slots text[] := array['morning', 'noon', 'afternoon', 'night', 'monthly-report'];
begin
  if p_slot is null or not (p_slot = any (allowed_slots)) then
    raise exception 'Invalid reminder slot: %', p_slot;
  end if;

  select decrypted_secret into app_url
  from vault.decrypted_secrets
  where name = 'cron_app_url'
  limit 1;

  select decrypted_secret into cron_secret
  from vault.decrypted_secrets
  where name = 'cron_secret'
  limit 1;

  if app_url is null or cron_secret is null then
    raise warning 'invoke_task_reminder: configure vault secrets cron_app_url and cron_secret';
    return null;
  end if;

  select net.http_get(
    url := rtrim(app_url, '/') || '/api/cron/task-reminder?slot=' || p_slot,
    headers := jsonb_build_object(
      'Authorization', 'Bearer ' || cron_secret
    ),
    timeout_milliseconds := 60000
  )
  into req_id;

  return req_id;
end;
$$;

-- Delete done tasks completed during the previous calendar month (Asia/Manila)
create or replace function public.cleanup_previous_month_done_tasks()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  deleted_count integer;
  month_start timestamptz;
  month_end timestamptz;
begin
  month_start := (
    date_trunc(
      'month',
      (timezone('Asia/Manila', now()))::date - interval '1 month'
    )
  ) at time zone 'Asia/Manila';

  month_end := (
    date_trunc('month', (timezone('Asia/Manila', now()))::date)
  ) at time zone 'Asia/Manila';

  delete from public.tasks
  where status = 'done'
    and completed_at is not null
    and completed_at >= month_start
    and completed_at < month_end;

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

-- Purge old pg_cron run history (prevents silent disk growth on free tier)
create or replace function public.purge_cron_job_run_details()
returns integer
language plpgsql
security definer
set search_path = cron, public
as $$
declare
  deleted_count integer;
begin
  delete from cron.job_run_details
  where end_time < now() - interval '7 days';

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

-- Unschedule if re-applying migration
select cron.unschedule(jobid)
from cron.job
where jobname in (
  'tasker-reminder-morning',
  'tasker-reminder-noon',
  'tasker-reminder-afternoon',
  'tasker-reminder-night',
  'tasker-monthly-cleanup',
  'tasker-purge-cron-logs'
);

-- 5 AM PH = 21:00 UTC
select cron.schedule(
  'tasker-reminder-morning',
  '0 21 * * *',
  $$select public.invoke_task_reminder('morning');$$
);

-- 12 PM PH = 04:00 UTC
select cron.schedule(
  'tasker-reminder-noon',
  '0 4 * * *',
  $$select public.invoke_task_reminder('noon');$$
);

-- 5 PM PH = 09:00 UTC
select cron.schedule(
  'tasker-reminder-afternoon',
  '0 9 * * *',
  $$select public.invoke_task_reminder('afternoon');$$
);

-- 10 PM PH = 14:00 UTC
select cron.schedule(
  'tasker-reminder-night',
  '0 14 * * *',
  $$select public.invoke_task_reminder('night');$$
);

-- 1st of month ~00:30 PH = 16:30 UTC on the 1st
select cron.schedule(
  'tasker-monthly-cleanup',
  '30 16 1 * *',
  $$
  select public.cleanup_previous_month_done_tasks();
  select public.invoke_task_reminder('monthly-report');
  $$
);

-- Weekly purge of cron logs (Sunday 01:00 PH ≈ 17:00 UTC Saturday)
select cron.schedule(
  'tasker-purge-cron-logs',
  '0 17 * * 0',
  $$select public.purge_cron_job_run_details();$$
);
