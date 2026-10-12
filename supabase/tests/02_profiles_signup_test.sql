begin;
\ir _fixtures.psql
select plan(17);

select is((select role::text from public.profiles where user_id = 'a0000000-0000-0000-0000-000000000001'), 'customer',
  'signup creates a customer profile');
select is((select user_id from public.customers where phone = '923000000001'), 'a0000000-0000-0000-0000-000000000001'::uuid,
  'signup creates a customer row for the phone');

select lives_ok($$ insert into auth.users (id, email, raw_user_meta_data)
                   values ('a0000000-0000-0000-0000-0000000000e1', '923000000066@phone.invalid', '{"full_name": "Eve", "role": "super_admin"}') $$,
  'signup with extra metadata succeeds');
select is((select role::text from public.profiles where user_id = 'a0000000-0000-0000-0000-0000000000e1'), 'customer',
  'a role in user metadata is ignored');
select throws_ok($$ insert into auth.users (id, email, raw_user_meta_data) values (gen_random_uuid(), 'someone@gmail.com', '{"full_name": "X"}') $$,
  '22023', 'INVALID_SIGNUP_PHONE', 'signup with a non-phone email is rejected');
select throws_ok($$ insert into auth.users (id, email, raw_user_meta_data) values (gen_random_uuid(), '923000000067@phone.invalid', '{}') $$,
  '22023', 'INVALID_SIGNUP_NAME', 'signup without a name is rejected');
select throws_ok($$ update auth.users set email = '923000000099@phone.invalid' where id = 'a0000000-0000-0000-0000-000000000001' $$,
  '42501', 'EMAIL_CHANGE_NOT_ALLOWED', 'an account cannot switch to another phone');

select tests.act_as('a0000000-0000-0000-0000-000000000001', 'aal1');
select is((select count(*)::int from public.profiles), 1, 'customers read only their own profile');
select throws_ok($$ update public.profiles set role = 'super_admin' where user_id = 'a0000000-0000-0000-0000-000000000001' $$,
  '42501', null, 'users cannot change their own role');
select throws_ok($$ update public.profiles set branch_id = 'b0000000-0000-0000-0000-000000000001' where user_id = 'a0000000-0000-0000-0000-000000000001' $$,
  '42501', null, 'users cannot change their own branch');
select is(tests.rows_affected($$ update public.profiles set full_name = 'Ali' where user_id = 'a0000000-0000-0000-0000-000000000001' $$), 1,
  'users change their own name');
select is(tests.rows_affected($$ update public.profiles set full_name = 'Ali' where user_id = 'a0000000-0000-0000-0000-000000000002' $$), 0,
  'users cannot change someone else''s name');
select throws_ok($$ insert into public.profiles (user_id, role, full_name) values ('a0000000-0000-0000-0000-000000000001', 'super_admin', 'X') $$,
  '42501', null, 'users cannot create profiles');
reset role;

select tests.act_as('a0000000-0000-0000-0000-000000000003');
select is((select count(*)::int from public.profiles), 1, 'staff read only their own profile');
reset role;

select tests.act_as('a0000000-0000-0000-0000-000000000005');
select is((select count(*)::int from public.profiles), 6, 'super_admin reads all profiles');
reset role;

select tests.act_as('a0000000-0000-0000-0000-000000000005', 'aal1');
select is((select count(*)::int from public.profiles), 1, 'super_admin without MFA reads only their own profile');
reset role;

select ok(exists (
  select 1 from public.audit_log
  where table_name = 'profiles' and row_id = 'a0000000-0000-0000-0000-000000000005'
    and new_values ->> 'role' = 'super_admin'
), 'role changes are audited');

select * from finish();
rollback;
