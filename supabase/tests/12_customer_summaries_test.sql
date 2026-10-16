begin;
\ir _fixtures.psql
select plan(4);

select tests.act_as_anon();
select throws_ok($$ select * from public.customer_summaries $$, '42501', null, 'anon cannot read customer summaries');
reset role;

select tests.act_as('a0000000-0000-0000-0000-000000000003');
select is((select count(*)::int from public.customer_summaries), 0, 'order staff see no customers');
reset role;

select tests.act_as('a0000000-0000-0000-0000-000000000005');
select is((select count(*)::int from public.customer_summaries), 3, 'a Super Admin sees every customer');
select is(
  (select row(order_count, cancelled_count, delivered_spend)::text from public.customer_summaries where phone = '923000000001'),
  row(1, 0, 0)::text,
  'totals count orders, cancellations and delivered spend');
reset role;

select * from finish();
rollback;
