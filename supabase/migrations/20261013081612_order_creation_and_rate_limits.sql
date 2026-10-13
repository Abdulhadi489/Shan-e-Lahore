-- Called only by the place-order Edge Function (service_role) after it has priced the order
-- with supabase/functions/_shared. One transaction: customer row, order number, order, lines.
-- The table CHECKs (totals, line totals, phone format) still apply to whatever is passed in.
create function public.create_order(order_data jsonb, lines jsonb)
returns jsonb
language plpgsql
set search_path = ''
as $$
declare
  new_customer_id uuid;
  customer_blocked boolean;
  new_order_number integer;
  new_order_id uuid;
  -- 32 random bytes, base64url without padding: 43 characters.
  new_token text := rtrim(translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/', '-_'), '=');
  line jsonb;
  new_line_id uuid;
begin
  insert into public.customers as c (phone, name)
  values (order_data ->> 'customer_phone', order_data ->> 'customer_name')
  on conflict (phone) do update set name = excluded.name
  returning c.id, c.is_blocked into new_customer_id, customer_blocked;
  if customer_blocked then
    raise exception 'NUMBER_BLOCKED' using errcode = '23514';
  end if;

  -- The row lock on the branch serialises concurrent orders, so numbers never repeat or skip.
  update public.branches
  set last_order_number = last_order_number + 1
  where id = (order_data ->> 'branch_id')::uuid and is_active
  returning last_order_number into new_order_number;
  if new_order_number is null then
    raise exception 'BRANCH_NOT_FOUND' using errcode = '23503';
  end if;

  insert into public.orders (
    branch_id, order_number, tracking_token, customer_id, customer_name, customer_phone,
    address_text, landmark, lat, lng, distance_km, payment_method,
    subtotal, delivery_charge, discount_amount, total, discount_code_id, language, notes
  ) values (
    (order_data ->> 'branch_id')::uuid, new_order_number, new_token, new_customer_id,
    order_data ->> 'customer_name', order_data ->> 'customer_phone',
    order_data ->> 'address_text', coalesce(order_data ->> 'landmark', ''),
    (order_data ->> 'lat')::numeric, (order_data ->> 'lng')::numeric, (order_data ->> 'distance_km')::numeric,
    (order_data ->> 'payment_method')::public.payment_method,
    (order_data ->> 'subtotal')::integer, (order_data ->> 'delivery_charge')::integer,
    (order_data ->> 'discount_amount')::integer, (order_data ->> 'total')::integer,
    (order_data ->> 'discount_code_id')::uuid, order_data ->> 'language', coalesce(order_data ->> 'notes', '')
  )
  returning id into new_order_id;

  for line in select value from jsonb_array_elements(lines) loop
    insert into public.order_items (
      order_id, item_id, variant_id, name_en, name_ur, variant_name_en, variant_name_ur,
      unit_price, quantity, line_total
    ) values (
      new_order_id, (line ->> 'item_id')::uuid, (line ->> 'variant_id')::uuid,
      line ->> 'name_en', coalesce(line ->> 'name_ur', ''), line ->> 'variant_name_en', line ->> 'variant_name_ur',
      (line ->> 'unit_price')::integer, (line ->> 'quantity')::integer, (line ->> 'line_total')::integer
    )
    returning id into new_line_id;

    insert into public.order_item_addons (order_item_id, addon_option_id, name_en, name_ur, extra_price)
    select new_line_id, (addon ->> 'addon_option_id')::uuid, addon ->> 'name_en',
           coalesce(addon ->> 'name_ur', ''), (addon ->> 'extra_price')::integer
    from jsonb_array_elements(coalesce(line -> 'addons', '[]'::jsonb)) addon;
  end loop;

  return jsonb_build_object('order_number', new_order_number, 'tracking_token', new_token);
end;
$$;
revoke execute on function public.create_order(jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.create_order(jsonb, jsonb) to service_role;

-- Counts one request against a fixed time window and says whether it is still within the limit.
-- limit_key is a SHA-256 hash made by the Edge Function, so no phone number or IP is stored.
create function public.hit_rate_limit(limit_key text, window_seconds integer, max_count integer)
returns boolean
language sql
set search_path = ''
as $$
  -- shortcut: only this key's old windows are cleaned up here; add a pg_cron job if the table grows large.
  delete from public.rate_limits where key = limit_key and window_start < now() - interval '1 day';

  insert into public.rate_limits as r (key, window_start, count)
  values (limit_key, to_timestamp(floor(extract(epoch from now()) / window_seconds) * window_seconds), 1)
  on conflict (key, window_start) do update set count = r.count + 1
  returning r.count <= max_count;
$$;
revoke execute on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.hit_rate_limit(text, integer, integer) to service_role;
