begin;
\ir _fixtures.psql
select plan(27);

select tests.act_as_anon();
select throws_ok($$ select * from public.orders $$, '42501', null, 'anon cannot read orders');
select throws_ok($$ select * from public.order_items $$, '42501', null, 'anon cannot read order lines');
reset role;

select tests.act_as('a0000000-0000-0000-0000-000000000001', 'aal1');
select set_eq($$ select id from public.orders $$, array['0d000000-0000-0000-0000-000000000001'::uuid],
  'customers read only their own orders');
select is((select count(*)::int from public.order_items), 1, 'customers read only their own order lines');
select is((select count(*)::int from public.order_item_addons), 1, 'customers read only their own order add-ons');
select is(tests.rows_affected($$ update public.orders set status = 'cancelled', cancel_reason = 'customer_request' $$), 0,
  'customers cannot change orders directly');
select throws_ok($$ insert into public.orders (branch_id, order_number, tracking_token, customer_id, customer_name, customer_phone,
                      address_text, lat, lng, distance_km, payment_method, subtotal, delivery_charge, total, language)
                    values ('b0000000-0000-0000-0000-000000000001', 1, repeat('z', 43), private.current_customer_id(), 'A', '923000000001',
                      'X', 31.5, 74.3, 1, 'cod', 1, 0, 1, 'en') $$,
  '42501', null, 'customers cannot insert orders');
select throws_ok($$ delete from public.orders $$, '42501', null, 'customers cannot delete orders');
select is((select count(*)::int from public.order_status_log), 0, 'customers cannot read the staff status log');
select throws_ok($$ insert into public.call_attempts (order_id) values ('0d000000-0000-0000-0000-000000000001') $$,
  '42501', null, 'customers cannot log call attempts');
select is((select count(*)::int from public.audit_log), 0, 'customers cannot read the audit log');
reset role;

select tests.act_as('a0000000-0000-0000-0000-000000000003');
select set_eq($$ select id from public.orders $$,
  array['0d000000-0000-0000-0000-000000000001', '0d000000-0000-0000-0000-000000000002']::uuid[],
  'staff read only their branch''s orders');
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

select tests.act_as('a0000000-0000-0000-0000-000000000003', 'aal1');
select is((select count(*)::int from public.orders), 0, 'staff without MFA see no orders');
reset role;

select tests.act_as('a0000000-0000-0000-0000-000000000004');
select set_eq($$ select id from public.orders $$, array['0d000000-0000-0000-0000-000000000003'::uuid],
  'staff of branch two read only branch two''s orders');
select throws_ok($$ insert into public.call_attempts (order_id) values ('0d000000-0000-0000-0000-000000000001') $$,
  '42501', null, 'staff cannot log calls for another branch''s orders');
reset role;

select tests.act_as('a0000000-0000-0000-0000-000000000005');
select is((select count(*)::int from public.orders), 3, 'super_admin reads every branch''s orders');
select ok((select count(*) from public.audit_log) > 0, 'super_admin reads the audit log');
reset role;

-- Guest orders stay hidden from a new account until a confirmation call verifies the phone.
insert into public.customers (id, phone, name) values ('c0000000-0000-0000-0000-000000000077', '923000000077', 'Real Owner');
insert into public.orders (id, branch_id, order_number, tracking_token, customer_id, customer_name, customer_phone,
  address_text, lat, lng, distance_km, payment_method, subtotal, delivery_charge, total, language)
values ('0d000000-0000-0000-0000-000000000077', 'b0000000-0000-0000-0000-000000000001', 1077, repeat('g', 43),
  'c0000000-0000-0000-0000-000000000077', 'Real Owner', '923000000077', 'Owner''s home', 31.5, 74.3, 1, 'cod', 1000, 100, 1100, 'en');
insert into auth.users (id, email, raw_user_meta_data)
values ('a0000000-0000-0000-0000-000000000077', '923000000077@phone.invalid', '{"full_name": "New Account"}');

select tests.act_as('a0000000-0000-0000-0000-000000000077', 'aal1');
select is((select count(*)::int from public.orders), 0, 'a new account cannot see guest orders for its phone');
select is((select name from public.customers), 'New Account', 'a new account does not see the guest''s name');
reset role;

insert into public.orders (id, branch_id, order_number, tracking_token, customer_id, user_id, customer_name, customer_phone,
  address_text, lat, lng, distance_km, payment_method, subtotal, delivery_charge, total, language)
values ('0d000000-0000-0000-0000-000000000078', 'b0000000-0000-0000-0000-000000000001', 1078, repeat('h', 43),
  'c0000000-0000-0000-0000-000000000077', 'a0000000-0000-0000-0000-000000000077', 'New Account', '923000000077',
  'Same home', 31.5, 74.3, 1, 'cod', 1000, 100, 1100, 'en');
select tests.act_as('a0000000-0000-0000-0000-000000000003');
select is(tests.rows_affected($$ update public.orders set status = 'confirmed' where id = '0d000000-0000-0000-0000-000000000078' $$), 1,
  'staff confirm the account''s order on the call');
reset role;

select tests.act_as('a0000000-0000-0000-0000-000000000077', 'aal1');
select is((select count(*)::int from public.orders), 2, 'after a confirmed call the account sees its guest orders');
reset role;

select * from finish();
rollback;
