-- Per-user preferences (synced from app; read by cron via service role)
create table if not exists public.user_settings (
  user_id uuid primary key references auth.users (id) on delete cascade,
  timezone text not null default 'Asia/Manila',
  default_space_id uuid references public.spaces (id) on delete set null,
  telegram_reminders boolean not null default true,
  ai_telegram_digest boolean not null default false,
  onboarding_complete boolean not null default false,
  updated_at timestamptz not null default now()
);

drop trigger if exists set_user_settings_updated_at on public.user_settings;
create trigger set_user_settings_updated_at
before update on public.user_settings
for each row execute function public.set_updated_at();

alter table public.user_settings enable row level security;

drop policy if exists "Users can read own settings" on public.user_settings;
create policy "Users can read own settings"
on public.user_settings for select
using ((select auth.uid()) = user_id);

drop policy if exists "Users can insert own settings" on public.user_settings;
create policy "Users can insert own settings"
on public.user_settings for insert
with check ((select auth.uid()) = user_id);

drop policy if exists "Users can update own settings" on public.user_settings;
create policy "Users can update own settings"
on public.user_settings for update
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

-- AI provider call counts per calendar month (service role only in practice)
create table if not exists public.ai_usage (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  usage_month text not null,
  call_count integer not null default 0,
  constraint ai_usage_provider_month_unique unique (provider, usage_month)
);

create index if not exists ai_usage_month_idx on public.ai_usage (usage_month);

alter table public.ai_usage enable row level security;

-- No client policies; cron/AI routes use service role
