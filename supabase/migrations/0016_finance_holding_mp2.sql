-- Allow MP2 (Pag-IBIG) as an investment asset class
alter table public.finance_holdings
  drop constraint if exists finance_holdings_asset_class_check;

alter table public.finance_holdings
  add constraint finance_holdings_asset_class_check
  check (asset_class in ('stock', 'uitf', 'mutual_fund', 'mp2', 'crypto', 'time_deposit', 'other'));
