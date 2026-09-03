-- ============================================================
--  BEAN CAFE · box-loading upgrade
--  Run once in Supabase → SQL Editor. Adds two columns, deletes nothing.
-- ============================================================
alter table products add column if not exists pieces_per_box int;
alter table products add column if not exists box_price numeric;
