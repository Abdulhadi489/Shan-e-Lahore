begin;
\ir _fixtures.psql
select plan(15);

select is((select count(*)::int from public.site_settings), 1, 'the migration leaves exactly one settings row');

select tests.act_as_anon();
select is((select font_heading_en from public.site_settings), 'Cormorant Garamond', 'visitors can read the font columns, which default to the current fonts');
select throws_ok($$ select * from public.site_settings $$, '42501', null, 'visitors cannot select every column');
select throws_ok($$ update public.site_settings set font_body_en = 'Lora' $$, '42501', null, 'visitors cannot change a font');
reset role;

select tests.act_as('a0000000-0000-0000-0000-000000000001');
select is(tests.rows_affected($$ update public.site_settings set font_body_en = 'Lora' $$), 0, 'a logged-in user without a role cannot change a font');
reset role;

select tests.act_as('a0000000-0000-0000-0000-000000000003');
select is(tests.rows_affected($$ update public.site_settings set font_body_en = 'Lora' $$), 0, 'order staff cannot change a font');
reset role;

select tests.act_as('a0000000-0000-0000-0000-000000000007');
select is(tests.rows_affected($$ update public.site_settings set font_body_en = 'Lora' $$), 0, 'a deactivated Super Admin cannot change a font');
reset role;

select tests.act_as('a0000000-0000-0000-0000-000000000005');
select is(tests.rows_affected($$ update public.site_settings set font_body_en = 'Lora', font_heading_ur = 'Amiri' $$), 1, 'a Super Admin changes fonts');
select is(tests.rows_affected($$ update public.site_settings set font_body_en = 'Lora' where id = true $$), 1, 'the admin screen updates the row by its id');
select throws_ok($$ update public.site_settings set font_body_en = 'x;}body{display:none' $$, '23514', null, 'a name with CSS characters is rejected');
select throws_ok($$ update public.site_settings set font_body_en = 'Comic Sans MS' $$, '23514', null, 'a font that is not on the list is rejected');
select throws_ok($$ update public.site_settings set font_body_ur = 'Lora' $$, '23514', null, 'an English-only font is rejected for Urdu');
select throws_ok($$ insert into public.site_settings (font_body_en) values ('Lora') $$, '23505', null, 'a second settings row cannot be added');
select throws_ok($$ delete from public.site_settings $$, '42501', null, 'nobody can delete the settings row through the API');
reset role;

select tests.act_as_anon();
select is((select font_body_en || '/' || font_heading_ur from public.site_settings), 'Lora/Amiri', 'visitors see the saved fonts');
reset role;

select * from finish();
rollback;
