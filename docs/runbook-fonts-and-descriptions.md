# Runbook: site fonts and menu descriptions on the hosted (and later production) database

Two migrations, both additive (no DROP, TRUNCATE, DELETE, renames or changes to existing policies, functions, orders, customers or prices):

| File | What it does |
| --- | --- |
| `supabase/migrations/20261022150000_site_settings.sql` | New one-row table `site_settings` with the four font columns, a CHECK on the allowed fonts, RLS (anyone reads the four font columns, only a Super Admin writes), the default row |
| `supabase/migrations/20261022150100_menu_descriptions.sql` | `UPDATE` of `items.description_en` / `description_ur` only where they are still empty |

Rollbacks (never run automatically; by hand after a backup): `supabase/rollbacks/20261022150000_site_settings_rollback.sql` (deletes the table, so saved font choices are lost) and `supabase/rollbacks/20261022150100_menu_descriptions_rollback.sql` (empties only descriptions that still hold the migration's text; edits made since are kept).

Never run `supabase db reset` against a hosted project.

## Steps (a person with access to the Supabase project does them)

1. **Backup.** Dashboard > Database > Backups (free projects have none: take a manual dump). Manual dump (placeholders, never paste the real string into chat or the repo):
   `pg_dump "<CONNECTION_STRING>" --no-owner --format=custom --file=backup-before-fonts.dump`
2. **Link and check for drift.** `supabase link --project-ref <PROJECT_REF>`, then `supabase migration list`. Local and Remote must match except for the two new files. Anything else on the Remote side only means someone applied a change that is not in the repo: stop and sort that out first.
3. **Preview.** `supabase db push --dry-run`. It must list exactly the two files above, in that order, and nothing else.
4. **Count before** (SQL editor), write the numbers down:
   ```sql
   select (select count(*) from public.orders) as orders,
          (select count(*) from public.items) as items,
          (select count(*) from public.customers) as customers,
          (select count(*) from public.items where description_en <> '') as dishes_with_description;
   ```
5. **Apply.** `supabase db push`. (Alternative: paste each file into the SQL editor, one after the other; both files already begin with `begin;` and end with `commit;`.)
6. **Count after.** Run the same query. orders, items and customers must be identical; `dishes_with_description` goes up by the number of dishes that had none (104 on the dev project, where the two deals already had text).
7. **Check the access rules** (SQL editor, one query at a time):
   ```sql
   set role anon;
   select font_body_en from public.site_settings;        -- works
   select * from public.site_settings;                    -- permission denied
   update public.site_settings set font_body_en = 'Lora'; -- permission denied
   reset role;
   ```
   Then in the website, log in as a Super Admin, Settings > Fonts: change a font, Save, and look at the public site in a private window. Log in as order staff: the Fonts section is not shown, and the API refuses the write.
8. **Only then deploy the website** (Render). The code also works if it goes out first (it keeps the built-in fonts until the table exists), but this order avoids a stretch where Settings > Fonts cannot save.
9. **Roll back** if needed: the rollback files above, run by hand in the SQL editor. The site keeps working without the table. If the migration is to be applied again later, use `supabase db push --include-all`.

## Verifying on another device

Open the site on a phone (or any browser that has never visited it) after a Super Admin has saved a non-default font. The headings must show the chosen font; in the browser's developer tools the page should have requested `fonts.googleapis.com`. If a device still shows the old font, clear the site's data once: the first paint uses a remembered name, and the database value replaces it as soon as the page has loaded.

## Notes

- The allowed fonts live in two places that must match: `src/lib/fonts.ts` and the CHECK constraints in the migration. `src/lib/fonts.test.ts` fails when they differ. To allow another font, add a new migration that replaces the constraint and add the font to `fonts.ts`.
- The description migration matches dishes by category and English name, because dish ids are different in every database. A dish whose name an admin has changed is skipped (nothing breaks, it simply stays empty).
- The Urdu descriptions have not been reviewed by a native speaker yet.
