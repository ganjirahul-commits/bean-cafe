-- ============================================================
--  BEAN CAFE · clean start
--  Run once in Supabase → SQL Editor.
--  Wipes all past days, entries, dues and stock counts.
--  Your PRODUCTS and prices are kept. Everything starts at 0 today.
-- ============================================================
delete from day_log;
delete from days;
delete from dues;
delete from inventory;
