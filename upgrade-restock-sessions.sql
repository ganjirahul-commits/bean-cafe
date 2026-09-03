-- ============================================================
--  BEAN CAFE · restock sessions upgrade
--  Run once in Supabase → SQL Editor. Adds one column, deletes nothing.
-- ============================================================
alter table day_log add column if not exists restock_sessions integer default 0;
