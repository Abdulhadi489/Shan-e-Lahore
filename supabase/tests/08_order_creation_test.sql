begin;
\ir _fixtures.psql
select plan(14);

-- Only the Edge Functions (service_role) may create orders or count rate limits.
select ok(not has_function_privilege('anon', 'public.create_order(jsonb, jsonb)', 'execute'), 'anon cannot create orders');
select ok(not has_function_privilege('authenticated', 'public.create_order(jsonb, jsonb)', 'execute'),
  'logged-in users cannot create orders');
select ok(has_function_privilege('service_role', 'public.create_order(jsonb, jsonb)', 'execute'), 'service_role creates orders');
select ok(not has_function_privilege('anon', 'public.hit_rate_limit(text, integer, integer)', 'execute'),
  'anon cannot touch rate limits');
select ok(not has_function_privilege('authenticated', 'public.hit_rate_limit(text, integer, integer)', 'execute'),
  'logged-in users cannot touch rate limits');

-- The fixtures insert orders 1001 and 1002 directly; real orders always come through create_order.
update public.branches set last_order_number = 1002 where id = 'b0000000-0000-0000-0000-000000000001';

set local role service_role;

create temporary table placed as
select public.create_order(
  '{"branch_id": "b0000000-0000-0000-0000-000000000001", "customer_phone": "923001112233", "customer_name": "New Guest",
    "address_text": "House 5, Gulberg", "landmark": "Near the park", "lat": 31.52, "lng": 74.35, "distance_km": 2.4,
    "payment_method": "cod", "subtotal": 1860, "delivery_charge": 100, "discount_amount": 0, "total": 1960,
    "language": "ur", "notes": ""}',
  '[{"item_id": "1e000000-0000-0000-0000-000000000001", "variant_id": "7a000000-0000-0000-0000-000000000001",
     "name_en": "Chicken Karahi", "variant_name_en": "Full", "unit_price": 1860, "quantity": 1, "line_total": 1860,
     "addons": [{"addon_option_id": "a0000000-0000-0000-0000-0000000000a1", "name_en": "Roghni naan", "extra_price": 60}]}]'
) as result;

select is((select (result ->> 'order_number')::integer from placed), 1003, 'the order takes the branch''s next number');
select matches((select result ->> 'tracking_token' from placed), '^[A-Za-z0-9_-]{43}$', 'tracking token is 43 base64url characters');
select results_eq(
  $$ select o.status::text, o.customer_name, c.name, o.total from public.orders o join public.customers c on c.id = o.customer_id
     where o.tracking_token = (select result ->> 'tracking_token' from placed) $$,
  $$ values ('pending_confirmation', 'New Guest', 'New Guest', 1960) $$,
  'order and its customer row are created together');
select is(
  (select count(*)::integer from public.order_item_addons a join public.order_items i on i.id = a.order_item_id
   join public.orders o on o.id = i.order_id where o.tracking_token = (select result ->> 'tracking_token' from placed)),
  1, 'lines and their add-ons are stored');
select is(
  (select count(*)::integer from public.order_status_log l join public.orders o on o.id = l.order_id
   where o.tracking_token = (select result ->> 'tracking_token' from placed) and l.to_status = 'pending_confirmation'),
  1, 'placing an order is logged');

update public.customers set is_blocked = true where phone = '923001112233';
select throws_ok(
  $$ select public.create_order(
       '{"branch_id": "b0000000-0000-0000-0000-000000000001", "customer_phone": "923001112233", "customer_name": "New Guest",
         "address_text": "House 5", "lat": 31.52, "lng": 74.35, "distance_km": 2.4, "payment_method": "cod",
         "subtotal": 1000, "delivery_charge": 100, "discount_amount": 0, "total": 1100, "language": "en"}', '[]') $$,
  '23514', 'NUMBER_BLOCKED', 'blocked numbers cannot order');

select throws_ok(
  $$ select public.create_order(
       '{"branch_id": "b0000000-0000-0000-0000-000000000001", "customer_phone": "923004445566", "customer_name": "Cheat",
         "address_text": "House 6", "lat": 31.52, "lng": 74.35, "distance_km": 2.4, "payment_method": "cod",
         "subtotal": 1000, "delivery_charge": 100, "discount_amount": 0, "total": 1, "language": "en"}', '[]') $$,
  '23514', null, 'a total that does not add up is rejected by the table check');

select is(
  (select array_agg(public.hit_rate_limit('test-key', 600, 2)) from generate_series(1, 3)),
  array[true, true, false], 'the third request in the window is over a limit of two');
select is((select count(*)::integer from public.rate_limits where key = 'test-key'), 1, 'one row per key and window');

select * from finish();
rollback;
