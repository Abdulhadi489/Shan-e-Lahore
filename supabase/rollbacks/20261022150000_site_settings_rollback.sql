-- ROLLBACK for 20261022150000_site_settings.sql. Not run automatically (it is outside supabase/migrations).
-- Run it only by hand, after a backup. It deletes the table, so the fonts chosen in Settings > Fonts are lost and
-- the website goes back to its built-in fonts. Nothing else depends on this table.
begin;
drop table if exists public.site_settings;
-- Only needed where the migration was applied with the CLI: forget it, so a later "supabase db push" can run it again.
delete from supabase_migrations.schema_migrations where version = '20261022150000';
commit;
