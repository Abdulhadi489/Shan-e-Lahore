begin;
select plan(12);

select is_empty(
  $$ select tablename from pg_tables where schemaname = 'public' and not rowsecurity $$,
  'RLS is enabled on every public table'
);

select set_eq(
  $$ select table_name::text from information_schema.role_table_grants
     where table_schema = 'public' and grantee = 'anon' and privilege_type = 'SELECT' $$,
  array[
    'addon_groups', 'addon_options', 'banners', 'branch_settings', 'branches', 'categories',
    'deal_items', 'delivery_tiers', 'item_addon_groups', 'item_variants', 'items', 'opening_hours'
  ],
  'anon can read public menu data and nothing else'
);

select is_empty(
  $$ select table_name || ':' || privilege_type from information_schema.role_table_grants
     where table_schema = 'public' and grantee = 'anon' and privilege_type <> 'SELECT' $$,
  'anon cannot write any table'
);

select is_empty(
  $$ select table_name || ':' || grantee || ':' || privilege_type from information_schema.role_table_grants
     where table_schema = 'public' and grantee in ('anon', 'authenticated', 'service_role')
       and privilege_type in ('TRUNCATE', 'REFERENCES', 'TRIGGER') $$,
  'no API role has TRUNCATE, REFERENCES or TRIGGER'
);

select is_empty(
  $$ select table_name || ':' || privilege_type from information_schema.role_table_grants
     where table_schema = 'public' and grantee = 'authenticated'
       and table_name in ('orders', 'order_items', 'order_item_addons', 'order_status_log',
                          'audit_log', 'profiles', 'customers')
       and privilege_type in ('INSERT', 'DELETE') $$,
  'logged-in users cannot insert or delete orders, logs, profiles or customers'
);

select is_empty(
  $$ select grantee::text from information_schema.role_table_grants
     where table_schema = 'public' and table_name = 'rate_limits' and grantee in ('anon', 'authenticated') $$,
  'rate_limits is unreachable from the browser'
);

select is_empty(
  $$ select p.proname from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname in ('public', 'private') and p.prosecdef
       and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%') $$,
  'every SECURITY DEFINER function pins search_path'
);

select is_empty(
  $$ select proname from pg_proc where pronamespace = 'public'::regnamespace and prosecdef $$,
  'no SECURITY DEFINER function lives in the exposed public schema'
);

select is_empty(
  $$ select proname from pg_proc
     where pronamespace = 'public'::regnamespace
       and (has_function_privilege('anon', oid, 'execute') or has_function_privilege('authenticated', oid, 'execute')) $$,
  'the browser cannot call any function in public'
);

select is_empty(
  $$ select relname from pg_class
     where relnamespace = 'public'::regnamespace and relkind = 'v'
       and not coalesce('security_invoker=true' = any(reloptions), false) $$,
  'every view uses security_invoker'
);

select set_eq(
  $$ select tablename::text from pg_publication_tables where pubname = 'supabase_realtime' $$,
  array['orders'],
  'only orders is published to Realtime'
);

select results_eq(
  $$ select public, file_size_limit, allowed_mime_types from storage.buckets where id = 'menu-images' $$,
  $$ values (true, 1048576::bigint, array['image/webp', 'image/jpeg', 'image/png']) $$,
  'menu-images is public-read, 1 MB max, webp/jpeg/png only'
);

select * from finish();
rollback;
