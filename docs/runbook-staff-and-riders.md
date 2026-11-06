# Runbook: Staff and riders screen (hosted dev, later production)

Needs these, in this order: two migrations, the `CREDENTIAL_KEY` secret, the `admin-users` Edge Function, then the website. The migrations are additive (new columns, three functions, one trigger; nothing is dropped, deleted or renamed, and orders, customers, prices and tracking links are untouched).

| File | What it does |
| --- | --- |
| `supabase/migrations/20261106100000_staff_and_riders.sql` | `profiles`: phone, created_by, must_change_password, deleted_at. `riders`: created_by, vehicle_type, vehicle_number, deleted_at, plus the audit trigger. Functions for the Edge Function only: `remove_account`, `remove_rider`, `end_sessions` |
| `supabase/migrations/20261106140000_staff_credentials.sql` | New table `staff_credentials` (encrypted copy of each issued password); no API role can read or write it |
| `supabase/functions/admin-users/index.ts` | list, create, update, resetPassword, remove, removeRider; rate limited; passwords generated here and shown once |
| `supabase/rollbacks/20261106100000_staff_and_riders_rollback.sql` | Undo, by hand. Loses staff phone numbers, "created by", rider vehicle details and the removed/anonymised markers |

Never run `supabase db reset` against a hosted project.

1. **Backup** (free projects have none): `pg_dump "<CONNECTION_STRING>" --no-owner --format=custom --file=backup-before-staff.dump`.
2. `supabase link --project-ref <PROJECT_REF>`, `supabase migration list` (only the new file may be missing on the remote side), `supabase db push --dry-run` (exactly that one file).
3. **Counts before** (SQL editor): `select (select count(*) from public.orders), (select count(*) from public.customers), (select count(*) from public.profiles), (select count(*) from public.riders);`
4. `supabase db push`. Make the key and set it as a function secret (the value goes only into the secret, never into chat or the repo): `openssl rand -base64 32`, then `supabase secrets set CREDENTIAL_KEY=<the value>`. Then `supabase functions deploy admin-users`. Keep a copy of the key in your password manager: without it the stored passwords cannot be shown (resetting issues new ones).
5. **Counts after**: orders, customers, profiles and riders must be unchanged.
6. **Check**: log in as a Super Admin, open Staff and riders, add a test staff account and a test rider, reset the password, deactivate, then delete both. Log in as Order Staff: the Staff and riders item must not appear.
7. **Only then deploy the website.** If it goes out first, the new screen shows a load error until the function is deployed (the old function has no list action), and the old Settings > Staff and Riders sections are gone.
8. Roll back: the rollback file, then redeploy the previous `admin-users`.

## The first Super Admin

Unchanged: README "Creating a Super Admin" (create the login in the dashboard, then set its role with one SQL statement you run yourself). Keep at least two active Super Admins.

## Facts to know

- A Super Admin can show a staff password again (Staff and riders > person > Show password). Supabase itself stores only a hash, so the screen keeps its own AES-256-GCM encrypted copy of the password it issued; each look is audited. Anyone with the Super Admin login can view them, and anyone with `CREDENTIAL_KEY` plus the database can read all of them. Staff do not choose their own password; if one changes it outside the screen, the stored copy is stale until the next reset.
- Existing accounts have no stored password: reset one to issue it.
- Removing a person who still appears on orders keeps a blank record ("Deleted staff member" / "Deleted rider") so the history keeps working. A staff login's email cannot be changed or removed in that case (a database trigger forbids email changes), so the locked login keeps its email.
- Turn on multi-factor authentication for Super Admins: Supabase dashboard > Authentication > Sign In / Providers > Multi-Factor, enable TOTP. It is not forced; the login screen would need an extra step first, which is a separate change.
- The Privacy page does not mention that staff and rider names and phone numbers are stored. You may want a line about it.
