-- Staff change an order's dishes or address during the confirmation call (docs/decisions.md, 2026-10-12).
-- Called only by the edit-order Edge Function (service_role), which re-prices everything from the
-- database first. One transaction: the order row is locked, its lines replaced and the change audited.
create function public.replace_order_contents(actor_id uuid, target_order_id uuid, order_data jsonb, lines jsonb)
returns void
language plpgsql
set search_path = ''
as $$
declare
  current_order public.orders;
  line jsonb;
  new_line_id uuid;
begin
  -- Act as the staff member, so private.is_staff_of() checks them and the audit names them.
  perform set_config('request.jwt.claims', json_build_object('sub', actor_id, 'role', 'authenticated')::text, true);

  select * into current_order from public.orders where id = target_order_id for update;
  if not found or not private.is_staff_of(current_order.branch_id) then
    raise exception 'NOT_ALLOWED' using errcode = '42501';
  end if;
  -- Only before the confirmation; afterwards the kitchen may already be cooking.
  if current_order.status <> 'pending_confirmation' then
    raise exception 'ORDER_NOT_EDITABLE' using errcode = '23514';
  end if;

  insert into public.audit_log (table_name, row_id, action, old_values, new_values, changed_by)
  values (
    'orders',
    target_order_id,
    'update',
    jsonb_build_object(
      'address_text', current_order.address_text, 'landmark', current_order.landmark,
      'subtotal', current_order.subtotal, 'delivery_charge', current_order.delivery_charge,
      'discount_amount', current_order.discount_amount, 'total', current_order.total,
      'items', (select jsonb_agg(jsonb_build_object('name', name_en, 'variant', variant_name_en, 'quantity', quantity))
                from public.order_items where order_id = target_order_id)
    ),
    jsonb_build_object(
      'address_text', order_data ->> 'address_text', 'landmark', order_data ->> 'landmark',
      'subtotal', (order_data ->> 'subtotal')::integer, 'delivery_charge', (order_data ->> 'delivery_charge')::integer,
      'discount_amount', (order_data ->> 'discount_amount')::integer, 'total', (order_data ->> 'total')::integer,
      'items', (select jsonb_agg(jsonb_build_object('name', l ->> 'name_en', 'variant', l ->> 'variant_name_en', 'quantity', (l ->> 'quantity')::integer))
                from jsonb_array_elements(lines) l)
    ),
    actor_id
  );

  update public.orders
  set address_text = order_data ->> 'address_text',
      landmark = coalesce(order_data ->> 'landmark', ''),
      lat = (order_data ->> 'lat')::numeric,
      lng = (order_data ->> 'lng')::numeric,
      distance_km = (order_data ->> 'distance_km')::numeric,
      subtotal = (order_data ->> 'subtotal')::integer,
      delivery_charge = (order_data ->> 'delivery_charge')::integer,
      discount_amount = (order_data ->> 'discount_amount')::integer,
      total = (order_data ->> 'total')::integer,
      discount_code_id = (order_data ->> 'discount_code_id')::uuid
  where id = target_order_id;

  delete from public.order_items where order_id = target_order_id;
  for line in select value from jsonb_array_elements(lines) loop
    insert into public.order_items (
      order_id, item_id, variant_id, name_en, name_ur, variant_name_en, variant_name_ur,
      unit_price, quantity, line_total
    ) values (
      target_order_id, (line ->> 'item_id')::uuid, (line ->> 'variant_id')::uuid,
      line ->> 'name_en', coalesce(line ->> 'name_ur', ''), line ->> 'variant_name_en', line ->> 'variant_name_ur',
      (line ->> 'unit_price')::integer, (line ->> 'quantity')::integer, (line ->> 'line_total')::integer
    )
    returning id into new_line_id;

    insert into public.order_item_addons (order_item_id, addon_option_id, name_en, name_ur, extra_price)
    select new_line_id, (addon ->> 'addon_option_id')::uuid, addon ->> 'name_en',
           coalesce(addon ->> 'name_ur', ''), (addon ->> 'extra_price')::integer
    from jsonb_array_elements(coalesce(line -> 'addons', '[]'::jsonb)) addon;
  end loop;
end;
$$;
revoke execute on function public.replace_order_contents(uuid, uuid, jsonb, jsonb) from public, anon, authenticated;
grant execute on function public.replace_order_contents(uuid, uuid, jsonb, jsonb) to service_role;
