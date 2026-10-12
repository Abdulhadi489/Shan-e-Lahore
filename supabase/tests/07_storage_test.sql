begin;
\ir _fixtures.psql
select plan(5);

select tests.act_as_anon();
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('menu-images', 'items/anon.webp') $$,
  '42501', null, 'anon cannot upload menu images');
reset role;

select tests.act_as('a0000000-0000-0000-0000-000000000001');
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('menu-images', 'items/customer.webp') $$,
  '42501', null, 'an account with no role cannot upload menu images');
reset role;

select tests.act_as('a0000000-0000-0000-0000-000000000003');
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('menu-images', 'items/staff.webp') $$,
  '42501', null, 'staff cannot upload menu images');
reset role;

select tests.act_as('a0000000-0000-0000-0000-000000000007');
select throws_ok($$ insert into storage.objects (bucket_id, name) values ('menu-images', 'items/former.webp') $$,
  '42501', null, 'a deactivated super_admin cannot upload menu images');
reset role;

select tests.act_as('a0000000-0000-0000-0000-000000000005');
select lives_ok($$ insert into storage.objects (bucket_id, name) values ('menu-images', 'items/admin.webp') $$,
  'super_admin uploads menu images');
reset role;

select * from finish();
rollback;
