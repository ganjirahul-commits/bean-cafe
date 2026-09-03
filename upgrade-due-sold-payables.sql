-- ============================================================
--  BEAN CAFE · sell-as-due + payables upgrade
--  Run once in Supabase → SQL Editor. Adds new columns/tables, deletes nothing.
-- ============================================================

-- how many of today's sold units (per product) were sold on credit
alter table day_log add column if not exists due_sold numeric default 0;

-- frozen cash-only sale figure for a closed day (sale_amount minus due sales)
alter table days add column if not exists cash_sale_amount numeric default 0;

-- backfill: days closed before this upgrade had no due sales, so cash sales = full sales
update days set cash_sale_amount = sale_amount where closed = true and (cash_sale_amount is null or cash_sale_amount = 0);

-- payables: money YOU owe suppliers (mirrors dues, reversed direction)
create table if not exists payables (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  phone text,
  amount numeric not null default 0,
  paid boolean default false,
  payments jsonb default '[]'::jsonb,
  topups jsonb default '[]'::jsonb,
  created_at timestamptz default now()
);
alter table payables enable row level security;
drop policy if exists "own rows" on payables;
create policy "own rows" on payables for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

do $$
begin
  begin execute 'alter publication supabase_realtime add table payables'; exception when others then null; end;
end $$;
