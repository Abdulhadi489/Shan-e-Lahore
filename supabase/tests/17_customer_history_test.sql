begin;
\ir _fixtures.psql
select plan(5);

select tests.act_as_anon();
select throws_ok($$ select * from public.customer_order_totals $$, '42501', null, 'anon cannot read the customer totals view');
reset role;

select tests.act_as('a0000000-0000-0000-0000-000000000001');
select is((select count(*)::int from public.customer_order_totals), 0, 'a logged-in user without a role sees no customers');
reset role;

select tests.act_as('a0000000-0000-0000-0000-000000000003');
select is((select count(*)::int from public.customer_order_totals), 0, 'order staff see no customer totals (customers are Super Admin only)');
reset role;

select tests.act_as('a0000000-0000-0000-0000-000000000005');
select ok((select count(*)::int from public.customer_order_totals) > 0, 'a Super Admin sees customer totals');
select is((select count(*)::int from public.customer_order_totals where first_order_at > last_order_at), 0, 'first order is never after the last');
reset role;

select * from finish();
rollback;
