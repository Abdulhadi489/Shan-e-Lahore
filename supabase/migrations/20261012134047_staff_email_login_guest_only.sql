-- Guest checkout only, and staff/admin log in with email + password without MFA
-- (docs/decisions.md, 2026-10-12). Customer-account pieces are removed; phase 2 can
-- restore them from git history.

-- Access no longer depends on the JWT's aal claim: an active profile with the right role is enough.
create or replace function private.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid() and role = 'super_admin' and is_active
  );
$$;

create or replace function private.is_staff_of(target_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles
    where user_id = auth.uid()
      and is_active
      and (role = 'super_admin' or (role = 'order_staff' and branch_id = target_branch_id))
  );
$$;

-- Accounts are created only by super_admin (public signup is off). Every new account starts
-- with the no-access role 'customer' until super_admin sets its role. The name falls back
-- to the email's local part so Dashboard > Authentication > Add user works without metadata.
create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_user_name text := coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    left(split_part(new.email, '@', 1), 60)
  );
begin
  if char_length(coalesce(new_user_name, '')) not between 1 and 60 then
    raise exception 'INVALID_USER_NAME' using errcode = '22023';
  end if;

  insert into public.profiles (user_id, role, full_name)
  values (new.id, 'customer', new_user_name);

  return new;
end;
$$;

-- Orders are read by staff of the branch and super_admin only.
drop policy "staff read their branch; customers read their own orders" on public.orders;
create policy "staff read orders of their branch" on public.orders
  for select to authenticated
  using (private.is_staff_of(branch_id));

-- customers is now one row per guest phone, managed by super_admin (blocking, reports).
drop policy "customers read their own row; super_admin reads all" on public.customers;
drop policy "customers update their own row; super_admin updates all" on public.customers;
drop trigger customers_edit_only_name_and_language on public.customers;
revoke update (name, preferred_language) on public.customers from authenticated;

create policy "super_admin reads customers" on public.customers
  for select to authenticated
  using ((select private.is_super_admin()));
create policy "super_admin blocks and unblocks customers" on public.customers
  for update to authenticated
  using ((select private.is_super_admin()))
  with check ((select private.is_super_admin()));

drop table public.addresses;
drop function private.current_customer_id();

create or replace function private.after_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.order_status_log (order_id, from_status, to_status, changed_by)
  values (new.id, case when tg_op = 'UPDATE' then old.status end, new.status, auth.uid());
  return new;
end;
$$;

alter table public.orders drop column user_id;
alter table public.customers
  drop column user_id,
  drop column phone_verified_at,
  drop column preferred_language;
