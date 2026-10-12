-- Nothing in public is reachable until a migration grants it explicitly.
alter default privileges for role postgres in schema public
  revoke all on tables from anon, authenticated, service_role;
alter default privileges for role postgres in schema public
  revoke all on sequences from anon, authenticated, service_role;
alter default privileges for role postgres
  revoke execute on functions from public;
alter default privileges for role postgres in schema public
  revoke execute on functions from anon, authenticated, service_role;

-- Helpers used by RLS policies and triggers. Not in the Data API's exposed schemas.
create schema private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated, service_role;

create extension if not exists moddatetime schema extensions;

create type public.user_role as enum ('super_admin', 'order_staff', 'customer');
create type public.order_status as enum (
  'pending_confirmation', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'
);
create type public.order_type as enum ('delivery');
create type public.payment_method as enum ('cod', 'bank_transfer', 'jazzcash', 'easypaisa');
create type public.payment_status as enum ('unpaid', 'paid', 'refund_due', 'refunded');
create type public.cancel_reason as enum (
  'customer_request', 'unreachable', 'unpaid_transfer', 'out_of_stock', 'other'
);
create type public.discount_type as enum ('percent', 'fixed');

-- Who changed prices, delivery settings, discount codes and staff, and when.
create table public.audit_log (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  row_id uuid not null,
  action text not null check (action in ('insert', 'update', 'delete')),
  old_values jsonb,
  new_values jsonb,
  changed_by uuid,
  created_at timestamptz not null default now()
);
create index audit_log_table_row_idx on public.audit_log (table_name, row_id);
create index audit_log_created_at_idx on public.audit_log (created_at desc);

grant select on public.audit_log to authenticated;
grant select on public.audit_log to service_role;
alter table public.audit_log enable row level security;
-- Policy is added in the next migration, once private.is_super_admin() exists.

-- Trigger argument: the table's key column, when it is not "id".
create function private.write_audit_log()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  old_values jsonb := case when tg_op = 'INSERT' then null else to_jsonb(old) end;
  new_values jsonb := case when tg_op = 'DELETE' then null else to_jsonb(new) end;
  row_values jsonb := coalesce(new_values, old_values);
begin
  if tg_op = 'UPDATE' and new_values - 'updated_at' = old_values - 'updated_at' then
    return new;
  end if;

  insert into public.audit_log (table_name, row_id, action, old_values, new_values, changed_by)
  values (
    tg_table_name,
    (row_values ->> coalesce(tg_argv[0], 'id'))::uuid,
    lower(tg_op),
    old_values,
    new_values,
    auth.uid()
  );
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

-- Lets one role update only some columns while super_admin may update all of them.
-- Trigger arguments are the column names the restricted user is allowed to change.
create function private.restrict_columns_unless_super_admin()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if current_user <> 'authenticated' or private.is_super_admin() then
    return new;
  end if;

  if (to_jsonb(new) - tg_argv - 'updated_at') is distinct from (to_jsonb(old) - tg_argv - 'updated_at') then
    raise exception 'COLUMN_NOT_EDITABLE' using errcode = '42501';
  end if;
  return new;
end;
$$;
