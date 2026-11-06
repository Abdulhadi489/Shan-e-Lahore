-- ROLLBACK for 20261106100000_staff_and_riders.sql. Not run automatically (it is outside supabase/migrations).
-- Run it by hand, after a backup. What is lost: staff phone numbers, "created by", rider vehicle details and the
-- "must change password" and "deleted" markers. Accounts removed through the screen stay removed or anonymised:
-- a person already anonymised keeps the name "Deleted staff member" and a rider "Deleted rider".
-- Drops only what this migration added.
begin;
drop trigger if exists audit on public.riders;
drop function if exists public.end_sessions(uuid);
drop function if exists private.end_sessions(uuid);
drop function if exists public.remove_rider(uuid, uuid);
drop function if exists public.remove_account(uuid, uuid);
revoke update (phone, must_change_password) on public.profiles from authenticated;
alter table public.riders drop column if exists deleted_at, drop column if exists vehicle_number,
  drop column if exists vehicle_type, drop column if exists created_by;
alter table public.profiles drop column if exists deleted_at, drop column if exists must_change_password,
  drop column if exists created_by, drop column if exists phone;
delete from supabase_migrations.schema_migrations where version = '20261106100000';
commit;
