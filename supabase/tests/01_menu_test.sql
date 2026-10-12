begin;
\ir _fixtures.psql
select plan(34);

-- anon
select tests.act_as_anon();
select set_eq($$ select name_en from public.categories $$, array['BBQ', 'Karahi'],
  'anon sees only active categories');
select set_eq($$ select name_en from public.items $$, array['Chicken Karahi', 'Seekh Kabab'],
  'anon sees only visible items in active categories');
select set_eq($$ select id from public.item_variants $$, array['7a000000-0000-0000-0000-000000000001'::uuid],
  'anon sees variants of visible items only');
select is((select count(*)::int from public.banners), 1, 'anon sees only active banners');
select is((select count(*)::int from public.branch_settings), 2, 'anon reads branch settings for checkout');
select throws_ok($$ insert into public.categories (branch_id, name_en) values ('b0000000-0000-0000-0000-000000000001', 'X') $$,
  '42501', null, 'anon cannot insert categories');
select throws_ok($$ update public.items set base_price = 1 $$, '42501', null, 'anon cannot update items');
reset role;

-- logged-in account with no role
select tests.act_as('a0000000-0000-0000-0000-000000000001');
select set_eq($$ select name_en from public.items $$, array['Chicken Karahi', 'Seekh Kabab'],
  'an account with no role sees the same menu as anon');
select is(tests.rows_affected($$ update public.items set base_price = 1 $$), 0, 'an account with no role cannot change prices');
select throws_ok($$ insert into public.items (branch_id, category_id, name_en, base_price)
                   values ('b0000000-0000-0000-0000-000000000001', 'ca000000-0000-0000-0000-000000000001', 'X', 1) $$,
  '42501', null, 'an account with no role cannot add items');
reset role;

-- staff of branch one
select tests.act_as('a0000000-0000-0000-0000-000000000003');
select set_eq($$ select name_en from public.items $$,
  array['Chicken Karahi', 'Secret Karahi', 'Retired Dish', 'Seekh Kabab'],
  'staff see hidden items of their own branch');
select is(tests.rows_affected($$ update public.items set is_available = false where id = '1e000000-0000-0000-0000-000000000001' $$), 1,
  'staff mark an item sold out');
select is(tests.rows_affected($$ update public.item_variants set is_available = false where id = '7a000000-0000-0000-0000-000000000001' $$), 1,
  'staff mark a variant sold out');
select is(tests.rows_affected($$ update public.addon_options set is_available = false $$), 1,
  'staff mark an add-on option sold out');
select throws_ok($$ update public.items set base_price = 1 where id = '1e000000-0000-0000-0000-000000000001' $$,
  '42501', 'COLUMN_NOT_EDITABLE', 'staff cannot change prices');
select throws_ok($$ update public.items set is_hidden = true where id = '1e000000-0000-0000-0000-000000000001' $$,
  '42501', 'COLUMN_NOT_EDITABLE', 'staff cannot hide items');
select is(tests.rows_affected($$ update public.items set is_available = false where id = '1e000000-0000-0000-0000-000000000004' $$), 0,
  'staff cannot touch another branch''s items');
select is(tests.rows_affected($$ update public.categories set is_active = false $$), 0, 'staff cannot change categories');
select is(tests.rows_affected($$ delete from public.items $$), 0, 'staff cannot delete items');
select throws_ok($$ insert into public.categories (branch_id, name_en) values ('b0000000-0000-0000-0000-000000000001', 'X') $$,
  '42501', null, 'staff cannot add categories');
select is(tests.rows_affected($$ update public.branch_settings set delivery_enabled = false where branch_id = 'b0000000-0000-0000-0000-000000000001' $$), 1,
  'staff pause delivery for their branch');
select throws_ok($$ update public.branch_settings set min_order_amount = 5000 where branch_id = 'b0000000-0000-0000-0000-000000000001' $$,
  '42501', 'COLUMN_NOT_EDITABLE', 'staff cannot change the minimum order');
select is(tests.rows_affected($$ update public.branch_settings set delivery_enabled = false where branch_id = 'b0000000-0000-0000-0000-000000000002' $$), 0,
  'staff cannot pause delivery for another branch');
select throws_ok($$ insert into public.delivery_tiers (branch_id, upper_km, charge) values ('b0000000-0000-0000-0000-000000000001', 5, 150) $$,
  '42501', null, 'staff cannot change delivery tiers');
reset role;

-- deactivated staff of branch one
select tests.act_as('a0000000-0000-0000-0000-000000000006');
select set_eq($$ select name_en from public.items $$, array['Chicken Karahi', 'Seekh Kabab'],
  'deactivated staff see only the public menu');
select is(tests.rows_affected($$ update public.items set is_available = true $$), 0,
  'deactivated staff cannot mark items sold out');
reset role;

-- staff of branch two
select tests.act_as('a0000000-0000-0000-0000-000000000004');
select set_eq($$ select name_en from public.items $$, array['Chicken Karahi', 'Seekh Kabab'],
  'staff of another branch do not see branch one''s hidden items');
select is(tests.rows_affected($$ update public.items set is_available = false where branch_id = 'b0000000-0000-0000-0000-000000000001' $$), 0,
  'staff of another branch cannot mark branch one items sold out');
reset role;

-- super_admin
select tests.act_as('a0000000-0000-0000-0000-000000000005');
select is(tests.rows_affected($$ update public.items set base_price = 1900 where id = '1e000000-0000-0000-0000-000000000001' $$), 1,
  'super_admin changes prices');
select lives_ok($$ insert into public.categories (branch_id, name_en) values ('b0000000-0000-0000-0000-000000000001', 'Drinks') $$,
  'super_admin adds categories');
select is(tests.rows_affected($$ update public.branch_settings set min_order_amount = 1000 $$), 2,
  'super_admin changes delivery settings');
reset role;

select is(
  (select changed_by from public.audit_log
   where table_name = 'items' and row_id = '1e000000-0000-0000-0000-000000000001'
     and new_values ->> 'base_price' = '1900'),
  'a0000000-0000-0000-0000-000000000005'::uuid,
  'price change is audited with who made it'
);

-- deactivated super_admin
select tests.act_as('a0000000-0000-0000-0000-000000000007');
select is(tests.rows_affected($$ update public.items set base_price = 1 $$), 0, 'a deactivated super_admin cannot change prices');
select throws_ok($$ insert into public.categories (branch_id, name_en) values ('b0000000-0000-0000-0000-000000000001', 'X') $$,
  '42501', null, 'a deactivated super_admin cannot add categories');
reset role;

select * from finish();
rollback;
