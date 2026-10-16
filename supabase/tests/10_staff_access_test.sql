begin;
\ir _fixtures.psql
select plan(12);

-- A second active Super Admin, so the two-admin rule can be tested both ways.
insert into auth.users (id, email, raw_user_meta_data) values
  ('a0000000-0000-0000-0000-000000000008', 'second.admin@example.test', '{"full_name": "Second Admin"}');
update public.profiles set role = 'super_admin' where user_id = 'a0000000-0000-0000-0000-000000000008';

select tests.act_as('a0000000-0000-0000-0000-000000000005');
select throws_ok($$ select public.set_staff_access('a0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'super_admin', null, true) $$,
  '42501', null, 'even a Super Admin cannot call it from the browser');
reset role;
select tests.act_as_anon();
select throws_ok($$ select public.set_staff_access('a0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'super_admin', null, true) $$,
  '42501', null, 'anon cannot call it');
reset role;

-- The admin-users Edge Function calls it as service_role with the verified caller as actor_id.
set local role service_role;
select throws_ok($$ select public.set_staff_access('a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'order_staff', 'b0000000-0000-0000-0000-000000000001', true) $$,
  '42501', 'NOT_ALLOWED', 'order staff cannot set staff access');
select throws_ok($$ select public.set_staff_access('a0000000-0000-0000-0000-000000000007', 'a0000000-0000-0000-0000-000000000001', 'super_admin', null, true) $$,
  '42501', 'NOT_ALLOWED', 'a deactivated Super Admin cannot set staff access');
select lives_ok($$ select public.set_staff_access('a0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'order_staff', 'b0000000-0000-0000-0000-000000000002', true) $$,
  'a Super Admin gives a new account a role and branch');
select throws_ok($$ select public.set_staff_access('a0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000005', 'order_staff', 'b0000000-0000-0000-0000-000000000001', true) $$,
  '42501', 'CANNOT_CHANGE_OWN_ACCESS', 'a Super Admin cannot change their own access');
select throws_ok($$ select public.set_staff_access('a0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001', 'order_staff', null, true) $$,
  '23514', null, 'order staff need a branch');
select lives_ok($$ select public.set_staff_access('a0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000003', 'order_staff', 'b0000000-0000-0000-0000-000000000001', false) $$,
  'a Super Admin deactivates staff');
select throws_ok($$ select public.set_staff_access('a0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000008', 'super_admin', null, false) $$,
  '23514', 'TWO_SUPER_ADMINS_REQUIRED', 'the last two active Super Admins cannot be reduced to one');
reset role;

select is(
  (select row(role::text, branch_id, is_active)::text from public.profiles where user_id = 'a0000000-0000-0000-0000-000000000001'),
  row('order_staff', 'b0000000-0000-0000-0000-000000000002'::uuid, true)::text,
  'the role, branch and active state were saved');
select is((select is_active from public.profiles where user_id = 'a0000000-0000-0000-0000-000000000003'), false,
  'the deactivation was saved');
select ok(exists (
  select 1 from public.audit_log
  where table_name = 'profiles' and row_id = 'a0000000-0000-0000-0000-000000000003'
    and changed_by = 'a0000000-0000-0000-0000-000000000005' and new_values ->> 'is_active' = 'false'
), 'the audit log records which Super Admin made the change');

select * from finish();
rollback;
