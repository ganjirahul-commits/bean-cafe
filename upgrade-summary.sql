-- ============================================================
--  BEAN CAFE · summary upgrade (per-product breakdown)
--  Run once in Supabase → SQL Editor. Adds one column, deletes nothing.
-- ============================================================
alter table day_log add column if not exists sold int;
