begin;
\ir _fixtures.psql
select plan(9);

select tests.act_as_anon();
select throws_ok($$ select * from public.customers $$, '42501', null, 'anon cannot read customers');
reset role;

select tests.act_as('a0000000-0000-0000-0000-000000000001');
select is((select count(*)::int from public.customers), 0, 'an account with no role cannot read customers');
reset role;

select tests.act_as('a0000000-0000-0000-0000-000000000003');
select is((select count(*)::int from public.customers), 0, 'staff cannot browse customers');
select is(tests.rows_affected($$ update public.customers set is_blocked = true $$), 0, 'staff cannot block numbers');
reset role;

select tests.act_as('a0000000-0000-0000-0000-000000000006');
select is((select count(*)::int from public.customers), 0, 'deactivated staff cannot read customers');
reset role;

select tests.act_as('a0000000-0000-0000-0000-000000000005');
select is((select count(*)::int from public.customers), 3, 'super_admin reads all customers');
select is(tests.rows_affected($$ update public.customers set is_blocked = true where phone = '923000000009' $$), 1,
  'super_admin blocks a number');
select throws_ok($$ update public.customers set name = 'X' $$, '42501', null,
  'customer names are not editable through the API');
reset role;

select tests.act_as('a0000000-0000-0000-0000-000000000007');
select is((select count(*)::int from public.customers), 0, 'a deactivated super_admin cannot read customers');
reset role;

select * from finish();
rollback;
