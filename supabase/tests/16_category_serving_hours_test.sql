begin;
\ir _fixtures.psql
select plan(5);

select tests.act_as_anon();
select is((select count(*)::integer from public.categories where available_from is not null), 0,
  'anon can read the serving hours');

reset role;
select tests.act_as('a0000000-0000-0000-0000-000000000003');
select is(tests.rows_affected($$ update public.categories set available_from = '04:00', available_until = '12:00' $$), 0,
  'staff cannot set serving hours');

reset role;
select tests.act_as('a0000000-0000-0000-0000-000000000005');
select is(tests.rows_affected($$ update public.categories set available_from = '04:00', available_until = '12:00' where name_en = 'Karahi' $$), 1,
  'super_admin sets serving hours');
select throws_ok($$ update public.categories set available_from = '04:00', available_until = null where name_en = 'Karahi' $$,
  '23514', null, 'a start without an end is refused');
select throws_ok($$ update public.categories set available_from = '04:00', available_until = '04:00' where name_en = 'Karahi' $$,
  '23514', null, 'an empty window is refused');

select * from finish();
rollback;
