-- ============================================================
--  BEAN CAFE · full database setup (for a brand-new project)
--  Paste into Supabase → SQL Editor → Run.
--  (If your project already has products/categories/day_log,
--   run upgrade.sql instead — it just adds the new pieces.)
-- ============================================================

create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null, category text not null default 'Others',
  buy numeric not null default 0, sell numeric not null default 0,
  created_at timestamptz default now()
);
create table if not exists categories (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null, sort int default 0, unique (user_id, name)
);
create table if not exists day_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null,
  product_id uuid not null references products(id) on delete cascade,
  qty int not null default 0, closing int,
  unique (user_id, day, product_id)
);
create table if not exists inventory (
  user_id uuid not null references auth.users(id) on delete cascade,
  product_id uuid not null references products(id) on delete cascade,
  on_hand int not null default 0, primary key (user_id, product_id)
);
create table if not exists days (
  user_id uuid not null references auth.users(id) on delete cascade,
  day date not null, cash_loaded numeric not null default 0,
  closed boolean not null default false, closed_at timestamptz,
  stock_cost numeric default 0, sale_amount numeric default 0, profit numeric default 0,
  shelf_value numeric default 0, dues_total numeric default 0, cash_sales numeric default 0,
  drawer_close numeric default 0, items_sold int default 0, primary key (user_id, day)
);
create table if not exists dues (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null, amount numeric not null default 0, phone text,
  day date not null default current_date, paid boolean not null default false,
  created_at timestamptz default now()
);

alter table products   enable row level security;
alter table categories enable row level security;
alter table day_log    enable row level security;
alter table inventory  enable row level security;
alter table days       enable row level security;
alter table dues       enable row level security;

create policy "own products"   on products   for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "own categories" on categories for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "own day_log"    on day_log    for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "own inventory"  on inventory  for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "own days"       on days       for all using (auth.uid()=user_id) with check (auth.uid()=user_id);
create policy "own dues"       on dues       for all using (auth.uid()=user_id) with check (auth.uid()=user_id);

do $$
begin
  begin execute 'alter publication supabase_realtime add table products, categories, day_log, inventory, days, dues'; exception when others then null; end;
end $$;
