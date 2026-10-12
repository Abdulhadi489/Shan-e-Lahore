create table public.branches (
  id uuid primary key default gen_random_uuid(),
  name_en text not null check (char_length(name_en) between 1 and 60),
  name_ur text not null default '' check (char_length(name_ur) <= 60),
  address_en text not null check (char_length(address_en) between 1 and 300),
  address_ur text not null default '' check (char_length(address_ur) <= 300),
  -- landlines and UAN numbers are longer or shorter than mobiles
  phone text not null check (phone ~ '^92[0-9]{9,11}$'),
  lat numeric(9, 6) not null check (lat between -90 and 90),
  lng numeric(9, 6) not null check (lng between -180 and 180),
  order_prefix text not null check (order_prefix ~ '^[A-Z]{2,4}$'),
  last_order_number integer not null default 1000 check (last_order_number >= 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger set_updated_at before update on public.branches
  for each row execute function extensions.moddatetime(updated_at);

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'customer',
  branch_id uuid references public.branches (id),
  full_name text not null check (char_length(full_name) between 1 and 60),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- staff belong to exactly one branch; super_admin sees all branches; customers none
  check (
    (role = 'order_staff' and branch_id is not null)
    or (role in ('super_admin', 'customer') and branch_id is null)
  )
);
create index profiles_branch_id_idx on public.profiles (branch_id);
create trigger set_updated_at before update on public.profiles
  for each row execute function extensions.moddatetime(updated_at);
create trigger audit after insert or update or delete on public.profiles
  for each row execute function private.write_audit_log('user_id');

-- Role and branch come from profiles, never from user-editable JWT metadata.
-- SECURITY DEFINER so policies on profiles itself can call these without recursing.
create function private.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'aal' = 'aal2', false)
    and exists (
      select 1 from public.profiles
      where user_id = auth.uid() and role = 'super_admin' and is_active
    );
$$;

-- True for active order_staff of that branch, and for super_admin. Both need MFA (aal2).
create function private.is_staff_of(target_branch_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(auth.jwt() ->> 'aal' = 'aal2', false)
    and exists (
      select 1 from public.profiles
      where user_id = auth.uid()
        and is_active
        and (role = 'super_admin' or (role = 'order_staff' and branch_id = target_branch_id))
    );
$$;

revoke execute on function private.is_super_admin() from public;
revoke execute on function private.is_staff_of(uuid) from public;
grant execute on function private.is_super_admin() to anon, authenticated, service_role;
grant execute on function private.is_staff_of(uuid) to anon, authenticated, service_role;
revoke execute on function private.write_audit_log() from public;
revoke execute on function private.restrict_columns_unless_super_admin() from public;

create policy "super_admin reads audit log" on public.audit_log
  for select to authenticated
  using ((select private.is_super_admin()));

grant select on public.branches to anon, authenticated;
grant insert, update, delete on public.branches to authenticated;
grant select, insert, update, delete on public.branches to service_role;
alter table public.branches enable row level security;

create policy "anyone reads active branches; staff read their own" on public.branches
  for select to anon, authenticated
  using (is_active or private.is_staff_of(id));
create policy "super_admin inserts branches" on public.branches
  for insert to authenticated
  with check ((select private.is_super_admin()));
create policy "super_admin updates branches" on public.branches
  for update to authenticated
  using ((select private.is_super_admin()))
  with check ((select private.is_super_admin()));
create policy "super_admin deletes branches" on public.branches
  for delete to authenticated
  using ((select private.is_super_admin()));

-- Staff and admin accounts get their role only through the admin-users Edge Function
-- (service_role). Users may change their own name and nothing else.
grant select on public.profiles to authenticated;
grant update (full_name) on public.profiles to authenticated;
grant select, insert, update, delete on public.profiles to service_role;
alter table public.profiles enable row level security;

create policy "users read their own profile; super_admin reads all" on public.profiles
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_super_admin()));
create policy "users update their own name" on public.profiles
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create table public.branch_settings (
  branch_id uuid primary key references public.branches (id) on delete cascade,
  delivery_enabled boolean not null default true,
  min_order_amount integer not null default 0 check (min_order_amount >= 0),
  free_delivery_threshold integer check (free_delivery_threshold > 0),
  road_distance_factor numeric(3, 2) not null default 1.30 check (road_distance_factor between 1 and 3),
  estimated_delivery_minutes integer not null default 45 check (estimated_delivery_minutes between 10 and 240),
  whatsapp_number text check (whatsapp_number ~ '^923[0-9]{9}$'),
  bank_name text check (char_length(bank_name) <= 60),
  bank_account_title text check (char_length(bank_account_title) <= 60),
  bank_account_number text check (char_length(bank_account_number) <= 30),
  bank_iban text check (bank_iban ~ '^PK[0-9]{2}[A-Z]{4}[0-9]{16}$'),
  jazzcash_account_title text check (char_length(jazzcash_account_title) <= 60),
  jazzcash_number text check (jazzcash_number ~ '^923[0-9]{9}$'),
  easypaisa_account_title text check (char_length(easypaisa_account_title) <= 60),
  easypaisa_number text check (easypaisa_number ~ '^923[0-9]{9}$'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger set_updated_at before update on public.branch_settings
  for each row execute function extensions.moddatetime(updated_at);
create trigger audit after insert or update or delete on public.branch_settings
  for each row execute function private.write_audit_log('branch_id');
create trigger staff_only_toggle_delivery before update on public.branch_settings
  for each row execute function private.restrict_columns_unless_super_admin('delivery_enabled');

-- Payment account details are shown to every customer at checkout, so they are public.
grant select on public.branch_settings to anon, authenticated;
grant insert, update, delete on public.branch_settings to authenticated;
grant select, insert, update, delete on public.branch_settings to service_role;
alter table public.branch_settings enable row level security;

create policy "anyone reads branch settings" on public.branch_settings
  for select to anon, authenticated
  using (true);
create policy "super_admin inserts branch settings" on public.branch_settings
  for insert to authenticated
  with check ((select private.is_super_admin()));
-- Staff of the branch may update; the trigger above limits them to delivery_enabled.
create policy "staff update their branch settings" on public.branch_settings
  for update to authenticated
  using (private.is_staff_of(branch_id))
  with check (private.is_staff_of(branch_id));
create policy "super_admin deletes branch settings" on public.branch_settings
  for delete to authenticated
  using ((select private.is_super_admin()));

create table public.delivery_tiers (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete cascade,
  upper_km numeric(4, 1) not null check (upper_km > 0 and upper_km <= 50),
  charge integer not null check (charge >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (branch_id, upper_km)
);
create trigger set_updated_at before update on public.delivery_tiers
  for each row execute function extensions.moddatetime(updated_at);
create trigger audit after insert or update or delete on public.delivery_tiers
  for each row execute function private.write_audit_log();

-- weekday follows JavaScript getDay() and Postgres extract(dow): 0 = Sunday.
-- close_time earlier than open_time means the branch closes after midnight.
create table public.opening_hours (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  open_time time not null,
  close_time time not null,
  is_closed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (branch_id, weekday),
  check (is_closed or open_time <> close_time)
);
create trigger set_updated_at before update on public.opening_hours
  for each row execute function extensions.moddatetime(updated_at);
create trigger audit after insert or update or delete on public.opening_hours
  for each row execute function private.write_audit_log();

grant select on public.delivery_tiers, public.opening_hours to anon, authenticated;
grant insert, update, delete on public.delivery_tiers, public.opening_hours to authenticated;
grant select, insert, update, delete on public.delivery_tiers, public.opening_hours to service_role;
alter table public.delivery_tiers enable row level security;
alter table public.opening_hours enable row level security;

create policy "anyone reads delivery tiers" on public.delivery_tiers
  for select to anon, authenticated
  using (true);
create policy "super_admin inserts delivery tiers" on public.delivery_tiers
  for insert to authenticated
  with check ((select private.is_super_admin()));
create policy "super_admin updates delivery tiers" on public.delivery_tiers
  for update to authenticated
  using ((select private.is_super_admin()))
  with check ((select private.is_super_admin()));
create policy "super_admin deletes delivery tiers" on public.delivery_tiers
  for delete to authenticated
  using ((select private.is_super_admin()));

create policy "anyone reads opening hours" on public.opening_hours
  for select to anon, authenticated
  using (true);
create policy "super_admin inserts opening hours" on public.opening_hours
  for insert to authenticated
  with check ((select private.is_super_admin()));
create policy "super_admin updates opening hours" on public.opening_hours
  for update to authenticated
  using ((select private.is_super_admin()))
  with check ((select private.is_super_admin()));
create policy "super_admin deletes opening hours" on public.opening_hours
  for delete to authenticated
  using ((select private.is_super_admin()));
