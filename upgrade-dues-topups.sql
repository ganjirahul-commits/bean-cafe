-- ============================================================
--  BEAN CAFE · dues topup (add more to existing due) upgrade
--  Run once in Supabase → SQL Editor. Adds one column, deletes nothing.
-- ============================================================
alter table dues add column if not exists topups jsonb default '[]'::jsonb;
