-- Orders are inserted only by the place-order Edge Function (service_role).
-- Staff change status, payment and rider; every rule is enforced here, not in the browser.
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  branch_id uuid not null references public.branches (id),
  order_number integer not null,
  -- 32 random bytes, base64url. Stored as-is so staff can put the tracking link in WhatsApp
  -- messages; readable only by the order's owner and the branch's staff.
  tracking_token text not null unique check (tracking_token ~ '^[A-Za-z0-9_-]{43,}$'),
  customer_id uuid not null references public.customers (id),
  user_id uuid references auth.users (id) on delete set null,
  customer_name text not null check (char_length(customer_name) between 1 and 60),
  customer_phone text not null check (customer_phone ~ '^923[0-9]{9}$'),
  address_text text not null check (char_length(address_text) between 1 and 300),
  landmark text not null default '' check (char_length(landmark) <= 150),
  lat numeric(9, 6) not null check (lat between -90 and 90),
  lng numeric(9, 6) not null check (lng between -180 and 180),
  distance_km numeric(4, 1) not null check (distance_km >= 0),
  order_type public.order_type not null default 'delivery',
  status public.order_status not null default 'pending_confirmation',
  payment_method public.payment_method not null,
  payment_status public.payment_status not null default 'unpaid',
  transaction_id text check (char_length(transaction_id) between 1 and 60),
  payment_verified_by uuid references public.profiles (user_id),
  payment_verified_at timestamptz,
  subtotal integer not null check (subtotal >= 0),
  delivery_charge integer not null check (delivery_charge >= 0),
  discount_amount integer not null default 0 check (discount_amount >= 0),
  total integer not null,
  discount_code_id uuid references public.discount_codes (id),
  language text not null check (language in ('en', 'ur')),
  notes text not null default '' check (char_length(notes) <= 300),
  rider_id uuid references public.riders (id),
  confirmed_by uuid references public.profiles (user_id),
  cancel_reason public.cancel_reason,
  confirmed_at timestamptz,
  preparing_at timestamptz,
  out_for_delivery_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (branch_id, order_number),
  check (discount_amount <= subtotal),
  check (total = subtotal - discount_amount + delivery_charge),
  check ((status = 'cancelled') = (cancel_reason is not null)),
  check (status not in ('out_for_delivery', 'delivered') or rider_id is not null),
  check (payment_method = 'cod' or payment_status = 'unpaid' or transaction_id is not null)
);
create index orders_branch_created_idx on public.orders (branch_id, created_at desc);
create index orders_branch_status_idx on public.orders (branch_id, status);
create index orders_customer_id_idx on public.orders (customer_id);
create index orders_user_id_idx on public.orders (user_id);
create index orders_discount_code_id_idx on public.orders (discount_code_id);
create index orders_rider_id_idx on public.orders (rider_id);
create index orders_confirmed_by_idx on public.orders (confirmed_by);
create index orders_payment_verified_by_idx on public.orders (payment_verified_by);
create trigger set_updated_at before update on public.orders
  for each row execute function extensions.moddatetime(updated_at);

grant select on public.orders to authenticated;
grant update (status, payment_status, transaction_id, rider_id, cancel_reason) on public.orders to authenticated;
grant select, insert, update, delete on public.orders to service_role;
alter table public.orders enable row level security;

-- An account sees orders it placed, plus guest orders for its phone once a confirmation
-- call has verified the phone.
create policy "staff read their branch; customers read their own orders" on public.orders
  for select to authenticated
  using (
    private.is_staff_of(branch_id)
    or user_id = (select auth.uid())
    or exists (
      select 1 from public.customers c
      where c.id = customer_id and c.user_id = (select auth.uid()) and c.phone_verified_at is not null
    )
  );
create policy "staff update orders of their branch" on public.orders
  for update to authenticated
  using (private.is_staff_of(branch_id))
  with check (private.is_staff_of(branch_id));

create function private.enforce_order_rules()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status in ('delivered', 'cancelled')
     and (to_jsonb(new) - 'payment_status' - 'updated_at') is distinct from (to_jsonb(old) - 'payment_status' - 'updated_at') then
    raise exception 'ORDER_CLOSED' using errcode = '23514';
  end if;

  -- Manual payment changes. The automatic ones (COD paid on delivery, refund due on
  -- cancel) are applied below, after this check.
  if new.payment_status is distinct from old.payment_status then
    if old.payment_status = 'unpaid' and new.payment_status = 'paid'
       and new.payment_method <> 'cod' and old.status = 'pending_confirmation' then
      new.payment_verified_by := auth.uid();
      new.payment_verified_at := now();
    elsif old.payment_status = 'refund_due' and new.payment_status = 'refunded' then
      null;
    else
      raise exception 'INVALID_PAYMENT_TRANSITION' using errcode = '23514';
    end if;
  end if;

  if new.transaction_id is distinct from old.transaction_id and old.payment_status <> 'unpaid' then
    raise exception 'TRANSACTION_ID_LOCKED' using errcode = '23514';
  end if;

  if new.status is distinct from old.status then
    if (old.status, new.status) not in (
      ('pending_confirmation'::public.order_status, 'confirmed'::public.order_status),
      ('pending_confirmation', 'cancelled'),
      ('confirmed', 'preparing'),
      ('confirmed', 'cancelled'),
      ('preparing', 'out_for_delivery'),
      ('preparing', 'cancelled'),
      ('out_for_delivery', 'delivered')
    ) then
      raise exception 'INVALID_STATUS_TRANSITION' using errcode = '23514';
    end if;

    case new.status
      when 'confirmed' then
        if new.payment_method <> 'cod' and new.payment_status <> 'paid' then
          raise exception 'TRANSFER_NOT_PAID' using errcode = '23514';
        end if;
        new.confirmed_at := now();
        new.confirmed_by := auth.uid();
      when 'preparing' then
        new.preparing_at := now();
      when 'out_for_delivery' then
        new.out_for_delivery_at := now();
      when 'delivered' then
        new.delivered_at := now();
        if new.payment_method = 'cod' then
          new.payment_status := 'paid';
        end if;
      when 'cancelled' then
        new.cancelled_at := now();
        if new.payment_status = 'paid' then
          new.payment_status := 'refund_due';
        end if;
      else
        null;
    end case;
  end if;

  return new;
end;
$$;
revoke execute on function private.enforce_order_rules() from public;

create trigger enforce_order_rules before update on public.orders
  for each row execute function private.enforce_order_rules();

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  item_id uuid references public.items (id) on delete set null,
  variant_id uuid references public.item_variants (id) on delete set null,
  name_en text not null check (char_length(name_en) between 1 and 60),
  name_ur text not null default '' check (char_length(name_ur) <= 60),
  variant_name_en text check (char_length(variant_name_en) <= 60),
  variant_name_ur text check (char_length(variant_name_ur) <= 60),
  -- base or variant price plus the add-ons, per unit, at the time of ordering
  unit_price integer not null check (unit_price >= 0),
  quantity integer not null check (quantity between 1 and 50),
  line_total integer not null,
  created_at timestamptz not null default now(),
  check (line_total = unit_price * quantity)
);
create index order_items_order_id_idx on public.order_items (order_id);
create index order_items_item_id_idx on public.order_items (item_id);
create index order_items_variant_id_idx on public.order_items (variant_id);

create table public.order_item_addons (
  id uuid primary key default gen_random_uuid(),
  order_item_id uuid not null references public.order_items (id) on delete cascade,
  addon_option_id uuid references public.addon_options (id) on delete set null,
  name_en text not null check (char_length(name_en) between 1 and 60),
  name_ur text not null default '' check (char_length(name_ur) <= 60),
  extra_price integer not null check (extra_price >= 0),
  created_at timestamptz not null default now()
);
create index order_item_addons_order_item_id_idx on public.order_item_addons (order_item_id);
create index order_item_addons_addon_option_id_idx on public.order_item_addons (addon_option_id);

grant select on public.order_items, public.order_item_addons to authenticated;
grant select, insert, update, delete on public.order_items, public.order_item_addons to service_role;
alter table public.order_items enable row level security;
alter table public.order_item_addons enable row level security;

create policy "order lines follow their order" on public.order_items
  for select to authenticated
  using (exists (select 1 from public.orders o where o.id = order_id));
create policy "order line addons follow their line" on public.order_item_addons
  for select to authenticated
  using (exists (select 1 from public.order_items oi where oi.id = order_item_id));

-- Each row is one unanswered confirmation call. staff_id cannot be supplied by the client.
create table public.call_attempts (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  staff_id uuid not null default auth.uid() references public.profiles (user_id),
  created_at timestamptz not null default now()
);
create index call_attempts_order_id_idx on public.call_attempts (order_id);
create index call_attempts_staff_id_idx on public.call_attempts (staff_id);

grant select on public.call_attempts to authenticated;
grant insert (order_id) on public.call_attempts to authenticated;
grant select, insert, update, delete on public.call_attempts to service_role;
alter table public.call_attempts enable row level security;

create policy "staff read call attempts of their branch" on public.call_attempts
  for select to authenticated
  using (exists (
    select 1 from public.orders o where o.id = order_id and private.is_staff_of(o.branch_id)
  ));
create policy "staff log calls for pending orders of their branch" on public.call_attempts
  for insert to authenticated
  with check (exists (
    select 1 from public.orders o
    where o.id = order_id and o.status = 'pending_confirmation' and private.is_staff_of(o.branch_id)
  ));

-- Runs as the staff member, so the cancel goes through their RLS and the order rules.
create function private.cancel_after_third_missed_call()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if (select count(*) from public.call_attempts where order_id = new.order_id) >= 3 then
    update public.orders
    set status = 'cancelled', cancel_reason = 'unreachable'
    where id = new.order_id and status = 'pending_confirmation';
  end if;
  return new;
end;
$$;
revoke execute on function private.cancel_after_third_missed_call() from public;

create trigger cancel_after_third_missed_call after insert on public.call_attempts
  for each row execute function private.cancel_after_third_missed_call();

create table public.order_status_log (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  from_status public.order_status,
  to_status public.order_status not null,
  -- null when the change came from the server (order placed, customer cancelled by link)
  changed_by uuid references public.profiles (user_id),
  created_at timestamptz not null default now()
);
create index order_status_log_order_id_idx on public.order_status_log (order_id);
create index order_status_log_changed_by_idx on public.order_status_log (changed_by);

grant select on public.order_status_log to authenticated;
grant select, insert, update, delete on public.order_status_log to service_role;
alter table public.order_status_log enable row level security;

create policy "staff read status log of their branch" on public.order_status_log
  for select to authenticated
  using (exists (
    select 1 from public.orders o where o.id = order_id and private.is_staff_of(o.branch_id)
  ));

-- SECURITY DEFINER: writes the log and marks the phone verified, which staff cannot do directly.
create function private.after_order_status_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.order_status_log (order_id, from_status, to_status, changed_by)
  values (new.id, case when tg_op = 'UPDATE' then old.status end, new.status, auth.uid());

  -- A staff member reached this account's phone on a confirmation call.
  if new.status = 'confirmed' and new.user_id is not null then
    update public.customers
    set phone_verified_at = coalesce(phone_verified_at, now())
    where id = new.customer_id and user_id = new.user_id;
  end if;

  return new;
end;
$$;
revoke execute on function private.after_order_status_change() from public;

create trigger after_order_insert after insert on public.orders
  for each row execute function private.after_order_status_change();
create trigger after_order_status_change after update of status on public.orders
  for each row when (old.status is distinct from new.status)
  execute function private.after_order_status_change();

-- Staff dashboards subscribe to new and changed orders; Realtime applies the select policy.
alter publication supabase_realtime add table public.orders;
