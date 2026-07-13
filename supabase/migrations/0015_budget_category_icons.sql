-- Add optional icon key to budget categories for UI badges / limit cards
alter table public.budget_categories
  add column if not exists icon text default 'other';

comment on column public.budget_categories.icon is
  'UI icon key (food, transport, bills, shopping, salary, health, home, entertainment, education, travel, gift, coffee, phone, fitness, groceries, other)';
