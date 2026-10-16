begin;
\ir _fixtures.psql
select plan(3);

select tests.act_as('a0000000-0000-0000-0000-000000000003');
select is(tests.rows_affected($$ update public.branches set lat = 31.6 where id = 'b0000000-0000-0000-0000-000000000001' $$), 0,
  'order staff cannot move the restaurant pin');
reset role;

select tests.act_as('a0000000-0000-0000-0000-000000000005');
select is(tests.rows_affected($$ update public.branches set lat = 31.6 where id = 'b0000000-0000-0000-0000-000000000001' $$), 1,
  'a Super Admin moves the restaurant pin');
reset role;

select ok(exists (
  select 1 from public.audit_log
  where table_name = 'branches' and row_id = 'b0000000-0000-0000-0000-000000000001'
    and changed_by = 'a0000000-0000-0000-0000-000000000005' and new_values ->> 'lat' = '31.600000'
), 'moving the pin is audited with who did it');

select * from finish();
rollback;
