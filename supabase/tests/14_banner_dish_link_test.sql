begin;
\ir _fixtures.psql
select plan(5);

select tests.act_as('a0000000-0000-0000-0000-000000000005');
select is(tests.rows_affected($$ update public.banners set item_id = '1e000000-0000-0000-0000-000000000001' where image_path = 'banners/live.webp' $$), 1,
  'a Super Admin links a banner to a dish of the same branch');
select throws_ok($$ update public.banners set item_id = '1e000000-0000-0000-0000-000000000004' where image_path = 'banners/live.webp' $$,
  '23503', null, 'a banner cannot open a dish of another branch');
reset role;

select tests.act_as('a0000000-0000-0000-0000-000000000003');
select is(tests.rows_affected($$ update public.banners set item_id = null where image_path = 'banners/live.webp' $$), 0,
  'order staff cannot change banners');
reset role;

select tests.act_as_anon();
select is((select item_id from public.banners where image_path = 'banners/live.webp'), '1e000000-0000-0000-0000-000000000001'::uuid,
  'customers can read which dish a banner opens');
reset role;

delete from public.order_items where item_id = '1e000000-0000-0000-0000-000000000001';
delete from public.items where id = '1e000000-0000-0000-0000-000000000001';
select is((select item_id from public.banners where image_path = 'banners/live.webp'), null,
  'deleting the dish clears the link and keeps the banner');

select * from finish();
rollback;
