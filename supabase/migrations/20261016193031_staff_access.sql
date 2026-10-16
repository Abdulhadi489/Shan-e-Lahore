-- Settings > Staff: a Super Admin sets an account's role, branch and active state.
-- Called only by the admin-users Edge Function (service_role), after it has checked the caller's
-- login; the browser cannot call it. It acts as that Super Admin for the rest of the transaction,
-- so private.is_super_admin() checks them and the profiles audit trigger records them.
create function public.set_staff_access(
  actor_id uuid,
  target_user_id uuid,
  new_role public.user_role,
  new_branch_id uuid,
  active boolean
)
returns void
language plpgsql
set search_path = ''
as $$
declare
  was_active_super_admin boolean;
begin
  perform set_config('request.jwt.claims', json_build_object('sub', actor_id, 'role', 'authenticated')::text, true);
  if not private.is_super_admin() then
    raise exception 'NOT_ALLOWED' using errcode = '42501';
  end if;
  if target_user_id = actor_id then
    raise exception 'CANNOT_CHANGE_OWN_ACCESS' using errcode = '42501';
  end if;

  -- Locks the Super Admin rows so two admins can't deactivate each other at the same moment.
  perform 1 from public.profiles where role = 'super_admin' and is_active for update;
  select role = 'super_admin' and is_active into was_active_super_admin
  from public.profiles where user_id = target_user_id
  for update;
  if not found then
    raise exception 'ACCOUNT_NOT_FOUND' using errcode = 'P0002';
  end if;

  update public.profiles
  set role = new_role,
      branch_id = case when new_role = 'order_staff' then new_branch_id end,
      is_active = active
  where user_id = target_user_id;

  -- Either Super Admin can reset the other's password, so two must stay (CLAUDE.md section 5).
  if was_active_super_admin
     and (select count(*) from public.profiles where role = 'super_admin' and is_active) < 2 then
    raise exception 'TWO_SUPER_ADMINS_REQUIRED' using errcode = '23514';
  end if;
end;
$$;
revoke execute on function public.set_staff_access(uuid, uuid, public.user_role, uuid, boolean) from public, anon, authenticated;
grant execute on function public.set_staff_access(uuid, uuid, public.user_role, uuid, boolean) to service_role;

-- Password resets happen in Supabase Auth, which has no audit trigger, so admin-users logs them here.
grant insert on public.audit_log to service_role;
