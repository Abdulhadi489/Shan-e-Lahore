begin;
\ir _fixtures.psql
select plan(16);

select tests.act_as_anon();
select throws_ok($$ select * from public.customers $$, '42501', null, 'anon cannot read customers');
select throws_ok($$ select * from public.addresses $$, '42501', null, 'anon cannot read addresses');
reset role;

select tests.act_as('a0000000-0000-0000-0000-000000000001', 'aal1');
select set_eq($$ select phone from public.customers $$, array['923000000001'], 'customers read only their own row');
select is(tests.rows_affected($$ update public.customers set name = 'Ali', preferred_language = 'ur' $$), 1,
  'customers change their own name and language');
select throws_ok($$ update public.customers set is_blocked = true $$, '42501', 'COLUMN_NOT_EDITABLE',
  'customers cannot change their blocked flag');
select throws_ok($$ update public.customers set phone = '923000000002' $$, '42501', null,
  'customers cannot change their phone');
select lives_ok($$ insert into public.addresses (customer_id, address_text, lat, lng)
                   values (private.current_customer_id(), 'House 1, Gulberg', 31.51, 74.35) $$,
  'customers save their own address');
select throws_ok($$ insert into public.addresses (customer_id, address_text, lat, lng)
                    values ('c0000000-0000-0000-0000-000000000009', 'House 9', 31.47, 74.41) $$,
  '42501', null, 'customers cannot save an address for someone else');
select is((select count(*)::int from public.addresses), 1, 'customers see their own addresses');
reset role;

select tests.act_as('a0000000-0000-0000-0000-000000000002', 'aal1');
select is((select count(*)::int from public.addresses), 0, 'customers cannot see other customers'' addresses');
select is(tests.rows_affected($$ delete from public.addresses $$), 0, 'customers cannot delete other customers'' addresses');
reset role;

select tests.act_as('a0000000-0000-0000-0000-000000000003');
select set_eq($$ select phone from public.customers $$, array['923000000003'],
  'staff see only their own customer row, not other customers');
select is((select count(*)::int from public.addresses), 0, 'staff cannot browse saved addresses');
reset role;

select tests.act_as('a0000000-0000-0000-0000-000000000005');
select is((select count(*)::int from public.customers), 6, 'super_admin reads all customers');
select is(tests.rows_affected($$ update public.customers set is_blocked = true where phone = '923000000009' $$), 1,
  'super_admin blocks a number');
reset role;

select tests.act_as('a0000000-0000-0000-0000-000000000005', 'aal1');
select is((select count(*)::int from public.customers), 1, 'super_admin without MFA sees only their own customer row');
reset role;

select * from finish();
rollback;
