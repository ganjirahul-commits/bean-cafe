-- ============================================================
--  BEAN CAFE · dues given today upgrade
--  Run once in Supabase → SQL Editor. Adds one column, deletes nothing.
-- ============================================================
alter table days add column if not exists dues_given_today numeric default 0;
