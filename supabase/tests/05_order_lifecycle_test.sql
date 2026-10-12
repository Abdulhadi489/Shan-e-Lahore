begin;
\ir _fixtures.psql
select plan(28);

-- Extra pending orders for the cancel and missed-call paths.
insert into public.orders (id, branch_id, order_number, tracking_token, customer_id, customer_name, customer_phone,
  address_text, lat, lng, distance_km, payment_method, subtotal, delivery_charge, total, language)
values
  ('0d000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', 1004, repeat('d', 43),
   'c0000000-0000-0000-0000-000000000009', 'Guest', '923000000009', 'House 9', 31.5, 74.3, 1, 'cod', 1000, 100, 1100, 'en'),
  ('0d000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000001', 1005, repeat('e', 43),
   'c0000000-0000-0000-0000-000000000009', 'Guest', '923000000009', 'House 9', 31.5, 74.3, 1, 'easypaisa', 1000, 100, 1100, 'en');

select tests.act_as('a0000000-0000-0000-0000-000000000003');

-- Cash on delivery, the happy path.
select lives_ok($$ update public.orders set status = 'confirmed' where id = '0d000000-0000-0000-0000-000000000001' $$,
  'staff confirm a COD order');
select results_eq(
  $$ select confirmed_by, confirmed_at is not null from public.orders where id = '0d000000-0000-0000-0000-000000000001' $$,
  $$ values ('a0000000-0000-0000-0000-000000000003'::uuid, true) $$,
  'confirming records who and when');
select throws_ok($$ update public.orders set status = 'delivered' where id = '0d000000-0000-0000-0000-000000000001' $$,
  '23514', 'INVALID_STATUS_TRANSITION', 'statuses cannot be skipped');
select lives_ok($$ update public.orders set status = 'preparing' where id = '0d000000-0000-0000-0000-000000000001' $$,
  'confirmed orders move to preparing');
select throws_ok($$ update public.orders set status = 'out_for_delivery' where id = '0d000000-0000-0000-0000-000000000001' $$,
  '23514', null, 'out for delivery needs a rider');
select lives_ok($$ update public.orders set status = 'out_for_delivery', rider_id = 'd0000000-0000-0000-0000-000000000001'
                   where id = '0d000000-0000-0000-0000-000000000001' $$,
  'out for delivery with a rider');
select lives_ok($$ update public.orders set status = 'delivered' where id = '0d000000-0000-0000-0000-000000000001' $$,
  'delivered');
select is((select payment_status::text from public.orders where id = '0d000000-0000-0000-0000-000000000001'), 'paid',
  'COD becomes paid when delivered');
select throws_ok($$ update public.orders set rider_id = 'd0000000-0000-0000-0000-000000000001', status = 'preparing'
                    where id = '0d000000-0000-0000-0000-000000000001' $$,
  '23514', 'ORDER_CLOSED', 'delivered orders are closed');
select throws_ok($$ update public.orders set payment_status = 'paid', transaction_id = 'X1'
                    where id = '0d000000-0000-0000-0000-000000000004' $$,
  '23514', 'INVALID_PAYMENT_TRANSITION', 'COD cannot be marked paid by hand');

-- Bank transfer: must be verified before it can be confirmed.
select throws_ok($$ update public.orders set status = 'confirmed' where id = '0d000000-0000-0000-0000-000000000002' $$,
  '23514', 'TRANSFER_NOT_PAID', 'an unpaid transfer cannot be confirmed');
select throws_ok($$ update public.orders set payment_status = 'paid' where id = '0d000000-0000-0000-0000-000000000002' $$,
  '23514', null, 'marking paid needs a transaction ID');
select lives_ok($$ update public.orders set payment_status = 'paid', transaction_id = 'TXN123'
                   where id = '0d000000-0000-0000-0000-000000000002' $$,
  'staff mark a transfer paid with its transaction ID');
select results_eq(
  $$ select payment_verified_by, payment_verified_at is not null from public.orders where id = '0d000000-0000-0000-0000-000000000002' $$,
  $$ values ('a0000000-0000-0000-0000-000000000003'::uuid, true) $$,
  'payment verification records who and when');
select throws_ok($$ update public.orders set transaction_id = 'OTHER' where id = '0d000000-0000-0000-0000-000000000002' $$,
  '23514', 'TRANSACTION_ID_LOCKED', 'a verified transaction ID cannot be edited');
select throws_ok($$ update public.orders set payment_status = 'unpaid' where id = '0d000000-0000-0000-0000-000000000002' $$,
  '23514', 'INVALID_PAYMENT_TRANSITION', 'paid cannot go back to unpaid');
select lives_ok($$ update public.orders set status = 'confirmed' where id = '0d000000-0000-0000-0000-000000000002' $$,
  'a paid transfer can be confirmed');
select throws_ok($$ update public.orders set status = 'cancelled' where id = '0d000000-0000-0000-0000-000000000002' $$,
  '23514', null, 'cancelling needs a reason');
select lives_ok($$ update public.orders set status = 'cancelled', cancel_reason = 'out_of_stock'
                   where id = '0d000000-0000-0000-0000-000000000002' $$,
  'staff cancel a confirmed order with a reason');
select is((select payment_status::text from public.orders where id = '0d000000-0000-0000-0000-000000000002'), 'refund_due',
  'cancelling a paid order makes the refund due');
select lives_ok($$ update public.orders set payment_status = 'refunded' where id = '0d000000-0000-0000-0000-000000000002' $$,
  'staff mark the refund sent');
select throws_ok($$ update public.orders set status = 'pending_confirmation' where id = '0d000000-0000-0000-0000-000000000002' $$,
  '23514', null, 'cancelled orders cannot be reopened');

-- Unpaid transfer at the call.
select lives_ok($$ update public.orders set status = 'cancelled', cancel_reason = 'unpaid_transfer'
                   where id = '0d000000-0000-0000-0000-000000000005' $$,
  'an unpaid transfer is cancelled at the call');
select is((select payment_status::text from public.orders where id = '0d000000-0000-0000-0000-000000000005'), 'unpaid',
  'nothing to refund when it was never paid');

-- Three unanswered calls.
insert into public.call_attempts (order_id) values ('0d000000-0000-0000-0000-000000000004');
insert into public.call_attempts (order_id) values ('0d000000-0000-0000-0000-000000000004');
select is((select status::text from public.orders where id = '0d000000-0000-0000-0000-000000000004'), 'pending_confirmation',
  'two missed calls keep the order pending');
insert into public.call_attempts (order_id) values ('0d000000-0000-0000-0000-000000000004');
select results_eq(
  $$ select status::text, cancel_reason::text from public.orders where id = '0d000000-0000-0000-0000-000000000004' $$,
  $$ values ('cancelled', 'unreachable') $$,
  'the third missed call cancels the order as unreachable');
select throws_ok($$ insert into public.call_attempts (order_id) values ('0d000000-0000-0000-0000-000000000004') $$,
  '42501', null, 'calls cannot be logged on a cancelled order');
reset role;

select is(
  (select count(*)::int from public.order_status_log
   where order_id = '0d000000-0000-0000-0000-000000000001' and changed_by = 'a0000000-0000-0000-0000-000000000003'),
  4,
  'every status change is logged with the staff member'
);

select * from finish();
rollback;
