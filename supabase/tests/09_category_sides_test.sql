begin;
\ir _fixtures.psql
select plan(3);

select tests.act_as_anon();
select is((select count(*)::integer from public.categories where is_side), 0, 'anon can read the sides flag');

reset role;
select tests.act_as('a0000000-0000-0000-0000-000000000003');
select is(tests.rows_affected($$ update public.categories set is_side = true $$), 0, 'staff cannot mark categories as sides');

reset role;
select tests.act_as('a0000000-0000-0000-0000-000000000005');
select is(tests.rows_affected($$ update public.categories set is_side = true where name_en = 'Karahi' $$), 1,
  'super_admin marks a category as sides');

select * from finish();
rollback;
