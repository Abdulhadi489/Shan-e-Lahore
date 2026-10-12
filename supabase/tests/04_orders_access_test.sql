begin;
\ir _fixtures.psql
select plan(22);

select tests.act_as_anon();
select throws_ok($$ select * from public.orders $$, '42501', null, 'anon cannot read orders');
select throws_ok($$ select * from public.order_items $$, '42501', null, 'anon cannot read order lines');
reset role;

select tests.act_as('a0000000-0000-0000-0000-000000000001');
select is((select count(*)::int from public.orders), 0, 'an account with no role reads no orders');
select is((select count(*)::int from public.order_items), 0, 'an account with no role reads no order lines');
select is((select count(*)::int from public.order_item_addons), 0, 'an account with no role reads no order add-ons');
select is(tests.rows_affected($$ update public.orders set status = 'cancelled', cancel_reason = 'customer_request' $$), 0,
  'an account with no role cannot change orders');
select throws_ok($$ insert into public.orders (branch_id, order_number, tracking_token, customer_id, customer_name, customer_phone,
                      address_text, lat, lng, distance_km, payment_method, subtotal, delivery_charge, total, language)
                    values ('b0000000-0000-0000-0000-000000000001', 1, repeat('z', 43), 'c0000000-0000-0000-0000-000000000001', 'A', '923000000001',
                      'X', 31.5, 74.3, 1, 'cod', 1, 0, 1, 'en') $$,
  '42501', null, 'nobody inserts orders through the API');
select throws_ok($$ delete from public.orders $$, '42501', null, 'nobody deletes orders through the API');
select throws_ok($$ insert into public.call_attempts (order_id) values ('0d000000-0000-0000-0000-000000000001') $$,
  '42501', null, 'an account with no role cannot log call attempts');
select is((select count(*)::int from public.audit_log), 0, 'an account with no role cannot read the audit log');
reset role;

select tests.act_as('a0000000-0000-0000-0000-000000000003');
select set_eq($$ select id from public.orders $$,
  array['0d000000-0000-0000-0000-000000000001', '0d000000-0000-0000-0000-000000000002']::uuid[],
  'staff read only their branch''s orders');
select is((select count(*)::int from public.order_items), 1, 'staff read order lines of their branch');
select is((select count(*)::int from public.order_status_log), 2, 'staff read the status log of their branch');
select is(tests.rows_affected($$ update public.orders set rider_id = 'd0000000-0000-0000-0000-000000000002'
                                  where id = '0d000000-0000-0000-0000-000000000003' $$), 0,
  'staff cannot change another branch''s orders');
select throws_ok($$ update public.orders set total = 1 where id = '0d000000-0000-0000-0000-000000000001' $$,
  '42501', null, 'staff cannot change totals');
select throws_ok($$ update public.orders set customer_phone = '923000000002' where id = '0d000000-0000-0000-0000-000000000001' $$,
  '42501', null, 'staff cannot change the customer snapshot');
select throws_ok($$ insert into public.call_attempts (order_id, staff_id)
                    values ('0d000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004') $$,
  '42501', null, 'staff cannot log a call under someone else''s name');
select is((select count(*)::int from public.audit_log), 0, 'staff cannot read the audit log');
reset role;

select tests.act_as('a0000000-0000-0000-0000-000000000006');
select is((select count(*)::int from public.orders), 0, 'deactivated staff see no orders');
reset role;

select tests.act_as('a0000000-0000-0000-0000-000000000004');
select set_eq($$ select id from public.orders $$, array['0d000000-0000-0000-0000-000000000003'::uuid],
  'staff of branch two read only branch two''s orders');
reset role;

select tests.act_as('a0000000-0000-0000-0000-000000000005');
select is((select count(*)::int from public.orders), 3, 'super_admin reads every branch''s orders');
select ok((select count(*) from public.audit_log) > 0, 'super_admin reads the audit log');
reset role;

select * from finish();
rollback;
