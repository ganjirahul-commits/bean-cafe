-- ============================================================
--  BEAN CAFE · dues payment-history upgrade
--  Run once in Supabase → SQL Editor. Adds one column, deletes nothing.
-- ============================================================
alter table dues add column if not exists payments jsonb default '[]'::jsonb;
