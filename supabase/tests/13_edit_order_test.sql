begin;
\ir _fixtures.psql
select plan(9);

-- The new contents as the edit-order Edge Function sends them after re-pricing.
create temporary table edit (order_data jsonb, lines jsonb);
insert into edit values (
  '{"address_text": "House 5, Gulberg", "landmark": "Near the park", "lat": 31.52, "lng": 74.35, "distance_km": 1.8,
    "subtotal": 3600, "delivery_charge": 100, "discount_amount": 0, "total": 3700, "discount_code_id": null}',
  '[{"item_id": "1e000000-0000-0000-0000-000000000001", "variant_id": "7a000000-0000-0000-0000-000000000001",
     "name_en": "Chicken Karahi", "variant_name_en": "Full", "unit_price": 1800, "quantity": 2, "line_total": 3600,
     "addons": [{"addon_option_id": "a0000000-0000-0000-0000-0000000000a1", "name_en": "Roghni naan", "extra_price": 0}]}]'
);
grant select on edit to anon, authenticated, service_role;

select tests.act_as('a0000000-0000-0000-0000-000000000003');
select throws_ok($$ select public.replace_order_contents('a0000000-0000-0000-0000-000000000003', '0d000000-0000-0000-0000-000000000001', order_data, lines) from edit $$,
  '42501', null, 'the browser cannot call it, even as staff');
reset role;

set local role service_role;
select throws_ok($$ select public.replace_order_contents('a0000000-0000-0000-0000-000000000004', '0d000000-0000-0000-0000-000000000001', order_data, lines) from edit $$,
  '42501', 'NOT_ALLOWED', 'staff of another branch cannot edit the order');
select throws_ok($$ select public.replace_order_contents('a0000000-0000-0000-0000-000000000006', '0d000000-0000-0000-0000-000000000001', order_data, lines) from edit $$,
  '42501', 'NOT_ALLOWED', 'deactivated staff cannot edit the order');
select throws_ok($$ select public.replace_order_contents('a0000000-0000-0000-0000-000000000001', '0d000000-0000-0000-0000-000000000001', order_data, lines) from edit $$,
  '42501', 'NOT_ALLOWED', 'an account with no role cannot edit the order');
select throws_ok($$ select public.replace_order_contents('a0000000-0000-0000-0000-000000000003', '0d000000-0000-0000-0000-000000000001',
                      order_data || '{"total": 1}', lines) from edit $$,
  '23514', null, 'totals that do not add up are refused');
select lives_ok($$ select public.replace_order_contents('a0000000-0000-0000-0000-000000000003', '0d000000-0000-0000-0000-000000000001', order_data, lines) from edit $$,
  'staff of the branch edit a pending order');
reset role;

select is(
  (select row(address_text, subtotal, total, (select sum(quantity) from public.order_items where order_id = o.id))::text
   from public.orders o where id = '0d000000-0000-0000-0000-000000000001'),
  row('House 5, Gulberg', 3600, 3700, 2::bigint)::text,
  'the address, totals and lines were replaced');
select ok(exists (
  select 1 from public.audit_log
  where table_name = 'orders' and row_id = '0d000000-0000-0000-0000-000000000001'
    and changed_by = 'a0000000-0000-0000-0000-000000000003' and (old_values ->> 'total')::int = 1900 and (new_values ->> 'total')::int = 3700
), 'the edit is audited with who made it and the old and new totals');

update public.orders set status = 'confirmed' where id = '0d000000-0000-0000-0000-000000000001';
set local role service_role;
select throws_ok($$ select public.replace_order_contents('a0000000-0000-0000-0000-000000000003', '0d000000-0000-0000-0000-000000000001', order_data, lines) from edit $$,
  '23514', 'ORDER_NOT_EDITABLE', 'a confirmed order can no longer be edited');
reset role;

select * from finish();
rollback;
