begin;
\ir _fixtures.psql
select plan(15);

-- A second active Super Admin, so the two-admin rule can be tested both ways.
insert into auth.users (id, email, raw_user_meta_data) values
  ('a0000000-0000-0000-0000-000000000008', 'second.admin@example.test', '{"full_name": "Second Admin"}');
update public.profiles set role = 'super_admin' where user_id = 'a0000000-0000-0000-0000-000000000008';

-- The functions behind the Staff and riders screen are for the admin-users Edge Function (service_role) only.
select tests.act_as('a0000000-0000-0000-0000-000000000005');
select throws_ok($$ select public.remove_account('a0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000001') $$,
  '42501', null, 'a logged-in Super Admin cannot call remove_account from the browser');
select throws_ok($$ select public.remove_rider('a0000000-0000-0000-0000-000000000005', 'b0000000-0000-0000-0000-000000000000') $$,
  '42501', null, 'a logged-in Super Admin cannot call remove_rider from the browser');
select throws_ok($$ select public.end_sessions('a0000000-0000-0000-0000-000000000003') $$,
  '42501', null, 'a logged-in Super Admin cannot call end_sessions from the browser');
reset role;
select tests.act_as_anon();
select throws_ok($$ select public.end_sessions('a0000000-0000-0000-0000-000000000003') $$, '42501', null, 'anon cannot end sessions');
reset role;

-- Stored passwords (encrypted) are for the Edge Function only: no API role may read the table, even a Super Admin.
select tests.act_as('a0000000-0000-0000-0000-000000000005');
select throws_ok($$ select * from public.staff_credentials $$, '42501', null, 'a Super Admin cannot read staff_credentials through the API');
reset role;
select tests.act_as_anon();
select throws_ok($$ select * from public.staff_credentials $$, '42501', null, 'anon cannot read staff_credentials');
reset role;

-- Own phone and own password flag, nothing else.
select tests.act_as('a0000000-0000-0000-0000-000000000003');
select is(tests.rows_affected($$ update public.profiles set phone = '923001234567' where user_id = 'a0000000-0000-0000-0000-000000000003' $$), 1,
  'staff change their own phone');
select throws_ok($$ update public.profiles set role = 'super_admin' where user_id = 'a0000000-0000-0000-0000-000000000003' $$,
  '42501', null, 'staff cannot change their own role');
select throws_ok($$ update public.profiles set deleted_at = null where user_id = 'a0000000-0000-0000-0000-000000000003' $$,
  '42501', null, 'staff cannot touch deleted_at');
select is(tests.rows_affected($$ update public.profiles set phone = '923009999999' where user_id = 'a0000000-0000-0000-0000-000000000004' $$), 0,
  'staff cannot change another person''s phone');
select throws_ok($$ insert into public.riders (branch_id, name, phone) values ('b0000000-0000-0000-0000-000000000001', 'Sneaky', '923001112233') $$,
  '42501', null, 'staff cannot add a rider');
reset role;

-- Removal rules, run as the Edge Function would (service_role, with the verified caller as actor).
set local role service_role;
select throws_ok($$ select public.remove_account('a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000004') $$,
  '42501', 'NOT_ALLOWED', 'order staff cannot remove anyone');
select throws_ok($$ select public.remove_account('a0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000005') $$,
  '42501', 'CANNOT_CHANGE_OWN_ACCESS', 'a Super Admin cannot remove themselves');
select throws_ok($$ select public.remove_account('a0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000008') $$,
  '23514', 'TWO_SUPER_ADMINS_REQUIRED', 'with only two Super Admins neither can be removed');
select is(public.remove_account('a0000000-0000-0000-0000-000000000005', 'a0000000-0000-0000-0000-000000000004'), 'deleted',
  'staff without history are deleted outright');
reset role;

select * from finish();
rollback;
