-- ROLLBACK for 20261106140000_staff_credentials.sql. Not run automatically (it is outside supabase/migrations).
-- Deletes every stored password copy; the logins themselves keep working with the passwords they have.
begin;
drop table if exists public.staff_credentials;
delete from supabase_migrations.schema_migrations where version = '20261106140000';
commit;
