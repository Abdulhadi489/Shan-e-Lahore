begin;
\ir _fixtures.psql
select plan(18);

select tests.act_as_anon();
select throws_ok($$ select * from public.riders $$, '42501', null, 'anon cannot read riders');
select throws_ok($$ select * from public.discount_codes $$, '42501', null, 'anon cannot read discount codes');
select throws_ok($$ select * from public.rate_limits $$, '42501', null, 'anon cannot read rate limits');
reset role;

select tests.act_as('a0000000-0000-0000-0000-000000000001');
select is((select count(*)::int from public.riders), 0, 'an account with no role cannot read riders');
select is((select count(*)::int from public.discount_codes), 0, 'an account with no role cannot list discount codes');
select throws_ok($$ select * from public.rate_limits $$, '42501', null, 'an account with no role cannot read rate limits');
select is(tests.rows_affected($$ update public.delivery_tiers set charge = 0 $$), 0, 'an account with no role cannot change delivery tiers');
select is(tests.rows_affected($$ update public.opening_hours set is_closed = true $$), 0, 'an account with no role cannot change opening hours');
reset role;

select tests.act_as('a0000000-0000-0000-0000-000000000003');
select set_eq($$ select name from public.riders $$, array['Rider One'], 'staff read riders of their branch only');
select throws_ok($$ insert into public.riders (branch_id, name, phone) values ('b0000000-0000-0000-0000-000000000001', 'New', '923110000009') $$,
  '42501', null, 'staff cannot add riders');
select is((select count(*)::int from public.discount_codes), 0, 'staff cannot read discount codes');
select throws_ok($$ insert into public.discount_codes (branch_id, code, type, value) values ('b0000000-0000-0000-0000-000000000001', 'FREE', 'fixed', 500) $$,
  '42501', null, 'staff cannot create discount codes');
select is(tests.rows_affected($$ update public.opening_hours set is_closed = true $$), 0, 'staff cannot change opening hours');
reset role;

select tests.act_as('a0000000-0000-0000-0000-000000000005');
select lives_ok($$ insert into public.riders (branch_id, name, phone) values ('b0000000-0000-0000-0000-000000000001', 'New', '923110000009') $$,
  'super_admin adds riders');
select is((select count(*)::int from public.discount_codes), 1, 'super_admin reads discount codes');
select lives_ok($$ insert into public.delivery_tiers (branch_id, upper_km, charge) values ('b0000000-0000-0000-0000-000000000001', 5, 150) $$,
  'super_admin adds a delivery tier');
reset role;

select ok(exists (
  select 1 from public.audit_log
  where table_name = 'delivery_tiers' and action = 'insert' and changed_by = 'a0000000-0000-0000-0000-000000000005'
), 'delivery tier changes are audited');

select tests.act_as('a0000000-0000-0000-0000-000000000007');
select is((select count(*)::int from public.discount_codes), 0, 'a deactivated super_admin cannot read discount codes');
reset role;

select * from finish();
rollback;
