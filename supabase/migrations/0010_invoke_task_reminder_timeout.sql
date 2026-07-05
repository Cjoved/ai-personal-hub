-- pg_net default timeout (~1s) is too short when AI Telegram digest calls an LLM.
-- Use GET + 60s timeout so cron reliably reaches Vercel.

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
