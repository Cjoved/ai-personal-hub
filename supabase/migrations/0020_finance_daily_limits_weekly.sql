-- Allow weekly spend caps (Mon–Sun local week) on finance_daily_limits
alter table public.finance_daily_limits
  drop constraint if exists finance_daily_limits_schedule_check;

alter table public.finance_daily_limits
  add constraint finance_daily_limits_schedule_check
  check (schedule in ('daily', 'custom_days', 'weekly'));
