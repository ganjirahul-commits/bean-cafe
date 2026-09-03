-- ============================================================
--  BEAN CAFE · personal cash upgrade
--  Run once in Supabase → SQL Editor. Adds one column, deletes nothing.
-- ============================================================
alter table days add column if not exists personal_cash numeric default 0;
