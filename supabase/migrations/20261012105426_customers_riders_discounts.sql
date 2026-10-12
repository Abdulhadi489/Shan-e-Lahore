-- One row per phone number, for guests and account holders alike.
-- phone_verified_at is set when staff confirm an order placed from the linked account; only
-- then can the account see orders placed as a guest with this phone (no SMS verification).
create table public.customers (
  id uuid primary key default gen_random_uuid(),
  phone text not null unique check (phone ~ '^923[0-9]{9}$'),
  name text not null check (char_length(name) between 1 and 60),
  user_id uuid unique references auth.users (id) on delete set null,
  phone_verified_at timestamptz,
  preferred_language text not null default 'en' check (preferred_language in ('en', 'ur')),
  is_blocked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger set_updated_at before update on public.customers
  for each row execute function extensions.moddatetime(updated_at);
create trigger customers_edit_only_name_and_language before update on public.customers
  for each row execute function private.restrict_columns_unless_super_admin('name', 'preferred_language');

grant select on public.customers to authenticated;
grant update (name, preferred_language, is_blocked) on public.customers to authenticated;
grant select, insert, update, delete on public.customers to service_role;
alter table public.customers enable row level security;

create policy "customers read their own row; super_admin reads all" on public.customers
  for select to authenticated
  using (user_id = (select auth.uid()) or (select private.is_super_admin()));
create policy "customers update their own row; super_admin updates all" on public.customers
  for update to authenticated
  using (user_id = (select auth.uid()) or (select private.is_super_admin()))
  with check (user_id = (select auth.uid()) or (select private.is_super_admin()));

create function private.current_customer_id()
returns uuid
language sql
stable
set search_path = ''
as $$
  select id from public.customers where user_id = auth.uid();
$$;
revoke execute on function private.current_customer_id() from public;
grant execute on function private.current_customer_id() to authenticated;

create table public.addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers (id) on delete cascade,
  label text not null default '' check (char_length(label) <= 30),
  address_text text not null check (char_length(address_text) between 1 and 300),
  landmark text not null default '' check (char_length(landmark) <= 150),
  lat numeric(9, 6) not null check (lat between -90 and 90),
  lng numeric(9, 6) not null check (lng between -180 and 180),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index addresses_customer_id_idx on public.addresses (customer_id);
create trigger set_updated_at before update on public.addresses
  for each row execute function extensions.moddatetime(updated_at);

grant select, insert, update, delete on public.addresses to authenticated, service_role;
alter table public.addresses enable row level security;

create policy "customers manage their own addresses" on public.addresses
  for all to authenticated
  using (customer_id = (select private.current_customer_id()))
  with check (customer_id = (select private.current_customer_id()));

-- Signup: every account is phone-based. The client builds the email from the normalised
-- phone, so the server checks the exact format instead of trusting it.
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  signup_phone text := substring(new.email from '^(923[0-9]{9})@phone\.invalid$');
  signup_name text := btrim(coalesce(new.raw_user_meta_data ->> 'full_name', ''));
begin
  if signup_phone is null then
    raise exception 'INVALID_SIGNUP_PHONE' using errcode = '22023';
  end if;
  if char_length(signup_name) not between 1 and 60 then
    raise exception 'INVALID_SIGNUP_NAME' using errcode = '22023';
  end if;

  -- role is always customer; staff and admin roles are set later by admin-users
  insert into public.profiles (user_id, role, full_name)
  values (new.id, 'customer', signup_name);

  -- A guest row for this phone is linked, but its old orders stay hidden until the phone is
  -- verified by a confirmation call. The guest's name is replaced so it is not revealed.
  insert into public.customers (phone, name, user_id)
  values (signup_phone, signup_name, new.id)
  on conflict (phone) do update
    set user_id = excluded.user_id, name = excluded.name, phone_verified_at = null
    where public.customers.user_id is null;

  return new;
end;
$$;
revoke execute on function private.handle_new_user() from public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- Changing the login email would change the account's phone without any verification.
create function private.block_email_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.email is distinct from old.email then
    raise exception 'EMAIL_CHANGE_NOT_ALLOWED' using errcode = '42501';
  end if;
  return new;
end;
$$;
revoke execute on function private.block_email_change() from public;

create trigger block_email_change
  before update of email on auth.users
  for each row execute function private.block_email_change();

create table public.riders (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete cascade,
  name text not null check (char_length(name) between 1 and 60),
  phone text not null check (phone ~ '^923[0-9]{9}$'),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index riders_branch_id_idx on public.riders (branch_id);
create trigger set_updated_at before update on public.riders
  for each row execute function extensions.moddatetime(updated_at);

grant select, insert, update, delete on public.riders to authenticated, service_role;
alter table public.riders enable row level security;

create policy "staff read riders of their branch" on public.riders
  for select to authenticated using (private.is_staff_of(branch_id));
create policy "super_admin inserts riders" on public.riders
  for insert to authenticated with check ((select private.is_super_admin()));
create policy "super_admin updates riders" on public.riders
  for update to authenticated
  using ((select private.is_super_admin())) with check ((select private.is_super_admin()));
create policy "super_admin deletes riders" on public.riders
  for delete to authenticated using ((select private.is_super_admin()));

-- Usage is counted from non-cancelled orders when an order is placed, so there is no
-- separate counter to drift out of sync.
create table public.discount_codes (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id) on delete cascade,
  code text not null check (code ~ '^[A-Z0-9]{3,20}$'),
  type public.discount_type not null,
  value integer not null check (value > 0),
  min_order integer not null default 0 check (min_order >= 0),
  starts_at timestamptz,
  ends_at timestamptz,
  usage_limit integer check (usage_limit > 0),
  one_per_phone boolean not null default false,
  first_order_only boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (branch_id, code),
  check (type <> 'percent' or value <= 100),
  check (ends_at > starts_at)
);
create trigger set_updated_at before update on public.discount_codes
  for each row execute function extensions.moddatetime(updated_at);
create trigger audit after insert or update or delete on public.discount_codes
  for each row execute function private.write_audit_log();

-- Codes stay secret from the browser; quote-order checks them server-side.
grant select, insert, update, delete on public.discount_codes to authenticated, service_role;
alter table public.discount_codes enable row level security;

create policy "super_admin manages discount codes" on public.discount_codes
  for all to authenticated
  using ((select private.is_super_admin()))
  with check ((select private.is_super_admin()));
