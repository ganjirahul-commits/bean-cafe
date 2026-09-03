-- ============================================================
--  BEAN CAFE · upgrade for daily checkout, cash, dues, inventory
--  Run this ONCE in Supabase → SQL Editor on your existing project.
--  Safe: it only adds new tables/columns, nothing is deleted.
-- ============================================================

-- Carry-over inventory: units currently sitting on the shelf
create table if not exists inventory (
  user_id    uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  on_hand    int not null default 0,
  primary key (user_id, product_id)
);
alter table inventory enable row level security;
drop policy if exists "own inventory" on inventory;
create policy "own inventory" on inventory for all using (auth.uid()=user_id) with check (auth.uid()=user_id);

-- Per-day header + the summary saved when you close the day
create table if not exists days (
  user_id      uuid not null references auth.users(id) on delete cascade,
  day          date not null,
  cash_loaded  numeric not null default 0,
  closed       boolean not null default false,
  closed_at    timestamptz,
  stock_cost   numeric default 0,
  sale_amount  numeric default 0,
  profit       numeric default 0,
  shelf_value  numeric default 0,
  dues_total   numeric default 0,
  cash_sales   numeric default 0,
  drawer_close numeric default 0,
  items_sold   int default 0,
  primary key (user_id, day)
);
alter table days enable row level security;
drop policy if exists "own days" on days;
create policy "own days" on days for all using (auth.uid()=user_id) with check (auth.uid()=user_id);

-- Dues ledger (who owes you)
create table if not exists dues (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users(id) on delete cascade,
  name       text not null,
  amount     numeric not null default 0,
  phone      text,
  day        date not null default current_date,
  paid       boolean not null default false,
  created_at timestamptz default now()
);
alter table dues enable row level security;
drop policy if exists "own dues" on dues;
create policy "own dues" on dues for all using (auth.uid()=user_id) with check (auth.uid()=user_id);

-- day_log: remember how many were left on the shelf at close
alter table day_log add column if not exists closing int;

-- Live sync for the new tables (idempotent)
do $$
begin
  begin execute 'alter publication supabase_realtime add table inventory'; exception when others then null; end;
  begin execute 'alter publication supabase_realtime add table days';      exception when others then null; end;
  begin execute 'alter publication supabase_realtime add table dues';      exception when others then null; end;
end $$;
