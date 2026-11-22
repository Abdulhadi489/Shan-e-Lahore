-- ROLLBACK for 20261122100000_customer_history.sql. Not run automatically (it is outside supabase/migrations).
-- Removes only what that migration added: the view and the two indexes. No data is lost.
begin;
drop view if exists public.customer_order_totals;
drop index if exists public.order_status_log_created_idx;
drop index if exists public.orders_customer_created_idx;
delete from supabase_migrations.schema_migrations where version = '20261122100000';
commit;
