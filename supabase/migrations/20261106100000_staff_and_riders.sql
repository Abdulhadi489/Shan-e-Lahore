-- Super Admin screen "Staff and riders": a few more details per person, the functions behind safe removal,
-- and an audit trail for riders. Additive only: new columns, functions and one trigger. Safe to run twice.
-- Nothing here touches orders, customers, prices, tracking links or any existing policy.
begin;

-- Staff: phone, who created the account, and whether the temporary password must be replaced at first login.
-- deleted_at marks an account that was removed but is still referenced by orders (see remove_account).
alter table public.profiles
  add column if not exists phone text check (phone ~ '^923[0-9]{9}$'),
  add column if not exists created_by uuid references public.profiles (user_id) on delete set null,
  add column if not exists must_change_password boolean not null default false,
  add column if not exists deleted_at timestamptz;

-- Riders: who added them, an optional vehicle, and deleted_at for riders that past orders still point to.
alter table public.riders
  add column if not exists created_by uuid default auth.uid() references public.profiles (user_id) on delete set null,
  add column if not exists vehicle_type text check (char_length(vehicle_type) <= 30),
  add column if not exists vehicle_number text check (char_length(vehicle_number) <= 20),
  add column if not exists deleted_at timestamptz;

-- People may change their own phone and clear their own "change your password" flag after changing it.
-- The existing policy "users update their own name" already limits updates to the person's own row, and role,
-- branch and active state stay outside these column grants.
grant update (phone, must_change_password) on public.profiles to authenticated;

-- Rider changes are audited like staff changes (who, when, old and new values).
create or replace trigger audit after insert or update or delete on public.riders
  for each row execute function private.write_audit_log('id');

-- Removing a staff account. Called only by the admin-users Edge Function with the verified caller as actor_id.
-- Returns 'deleted' when no history points at the person (the function then removes the login), or 'anonymised'
-- when orders or call logs still do: the row stays, without name or phone and without access, so history keeps working.
create or replace function public.remove_account(actor_id uuid, target_user_id uuid)
returns text
language plpgsql
set search_path = ''
as $$
declare
  target_role public.user_role;
  target_active boolean;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', actor_id, 'role', 'authenticated')::text, true);
  if not private.is_super_admin() then
    raise exception 'NOT_ALLOWED' using errcode = '42501';
  end if;
  if target_user_id = actor_id then
    raise exception 'CANNOT_CHANGE_OWN_ACCESS' using errcode = '42501';
  end if;

  perform 1 from public.profiles where role = 'super_admin' and is_active for update;
  select role, is_active into target_role, target_active from public.profiles
  where user_id = target_user_id and deleted_at is null for update;
  if not found then
    raise exception 'ACCOUNT_NOT_FOUND' using errcode = 'P0002';
  end if;
  -- Two active Super Admins must always remain (CLAUDE.md section 5).
  if target_role = 'super_admin' and target_active
     and (select count(*) from public.profiles where role = 'super_admin' and is_active) < 3 then
    raise exception 'TWO_SUPER_ADMINS_REQUIRED' using errcode = '23514';
  end if;

  begin
    delete from public.profiles where user_id = target_user_id;
    return 'deleted';
  exception when foreign_key_violation then
    update public.profiles
    set full_name = 'Deleted staff member', phone = null, role = 'customer', branch_id = null,
        is_active = false, must_change_password = false, deleted_at = now()
    where user_id = target_user_id;
    return 'anonymised';
  end;
end;
$$;
revoke execute on function public.remove_account(uuid, uuid) from public, anon, authenticated;
grant execute on function public.remove_account(uuid, uuid) to service_role;

-- Removing a rider has no login to deal with, so the whole job is here.
create or replace function public.remove_rider(actor_id uuid, rider uuid)
returns text
language plpgsql
set search_path = ''
as $$
begin
  perform set_config('request.jwt.claims', json_build_object('sub', actor_id, 'role', 'authenticated')::text, true);
  if not private.is_super_admin() then
    raise exception 'NOT_ALLOWED' using errcode = '42501';
  end if;
  perform 1 from public.riders where id = rider and deleted_at is null for update;
  if not found then
    raise exception 'ACCOUNT_NOT_FOUND' using errcode = 'P0002';
  end if;

  begin
    delete from public.riders where id = rider;
    return 'deleted';
  exception when foreign_key_violation then
    update public.riders
    set name = 'Deleted rider', phone = '923000000000', vehicle_type = null, vehicle_number = null,
        is_active = false, deleted_at = now()
    where id = rider;
    return 'anonymised';
  end;
end;
$$;
revoke execute on function public.remove_rider(uuid, uuid) from public, anon, authenticated;
grant execute on function public.remove_rider(uuid, uuid) to service_role;

-- Deactivating or removing a person also ends their sessions, so no refresh token outlives the change.
-- The API roles may not touch the auth schema, so the deleting itself is a SECURITY DEFINER function in the private
-- schema (the baseline test forbids those in public); the public one is a thin wrapper only service_role may call.
create or replace function private.end_sessions(target_user_id uuid)
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.sessions where user_id = target_user_id;
$$;
revoke execute on function private.end_sessions(uuid) from public, anon, authenticated;
grant execute on function private.end_sessions(uuid) to service_role;

create or replace function public.end_sessions(target_user_id uuid)
returns void
language sql
set search_path = ''
as $$
  select private.end_sessions(target_user_id);
$$;
revoke execute on function public.end_sessions(uuid) from public, anon, authenticated;
grant execute on function public.end_sessions(uuid) to service_role;

commit;
