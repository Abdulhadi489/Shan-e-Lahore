begin;
\ir _fixtures.psql
select plan(15);

select is((select role::text from public.profiles where user_id = 'a0000000-0000-0000-0000-000000000001'), 'customer',
  'a new account gets the no-access role');
select is((select count(*)::int from public.customers), 3,
  'creating an account does not create a customer row (fixtures hold three guests)');

select lives_ok($$ insert into auth.users (id, email, raw_user_meta_data)
                   values ('a0000000-0000-0000-0000-0000000000e1', 'eve@example.test', '{"full_name": "Eve", "role": "super_admin"}') $$,
  'an account created with extra metadata succeeds');
select is((select role::text from public.profiles where user_id = 'a0000000-0000-0000-0000-0000000000e1'), 'customer',
  'a role in user metadata is ignored');
select lives_ok($$ insert into auth.users (id, email) values ('a0000000-0000-0000-0000-0000000000e2', 'ayesha.khan@example.test') $$,
  'Dashboard > Add user works without a name');
select is((select full_name from public.profiles where user_id = 'a0000000-0000-0000-0000-0000000000e2'), 'ayesha.khan',
  'the name falls back to the part of the email before @');
select throws_ok($$ update auth.users set email = 'someone.else@example.test' where id = 'a0000000-0000-0000-0000-000000000003' $$,
  '42501', 'EMAIL_CHANGE_NOT_ALLOWED', 'an account cannot change its email');

select tests.act_as('a0000000-0000-0000-0000-000000000003');
select is((select count(*)::int from public.profiles), 1, 'staff read only their own profile');
select throws_ok($$ update public.profiles set role = 'super_admin' where user_id = 'a0000000-0000-0000-0000-000000000003' $$,
  '42501', null, 'staff cannot change their own role');
select throws_ok($$ update public.profiles set branch_id = 'b0000000-0000-0000-0000-000000000002' where user_id = 'a0000000-0000-0000-0000-000000000003' $$,
  '42501', null, 'staff cannot change their own branch');
select throws_ok($$ update public.profiles set is_active = true where user_id = 'a0000000-0000-0000-0000-000000000006' $$,
  '42501', null, 'staff cannot reactivate anyone');
select is(tests.rows_affected($$ update public.profiles set full_name = 'Ali' where user_id = 'a0000000-0000-0000-0000-000000000004' $$), 0,
  'staff cannot change someone else''s name');
select throws_ok($$ insert into public.profiles (user_id, role, full_name) values ('a0000000-0000-0000-0000-000000000003', 'super_admin', 'X') $$,
  '42501', null, 'nobody creates profiles through the API');
reset role;

select tests.act_as('a0000000-0000-0000-0000-000000000005');
select is((select count(*)::int from public.profiles), 8, 'super_admin reads all profiles');
reset role;

select ok(exists (
  select 1 from public.audit_log
  where table_name = 'profiles' and row_id = 'a0000000-0000-0000-0000-000000000005'
    and new_values ->> 'role' = 'super_admin'
), 'role changes are audited');

select * from finish();
rollback;
