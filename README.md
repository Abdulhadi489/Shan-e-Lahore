# Shan-e-Lahore

Delivery-only ordering website for Shan-e-Lahore, Lahore. Customers order as guests; staff and the Super Admin manage orders and the menu under `/admin`. Rules for contributors are in `CLAUDE.md`, features in `docs/spec.md`, and the reasons behind decisions in `docs/decisions.md`.

## Tools you need

- Node 24 (`.nvmrc`)
- Docker Desktop, running
- Supabase CLI (`brew install supabase/tap/supabase`)
- gitleaks (`brew install gitleaks`). The pre-commit hook refuses to commit without it.

## First-time setup

```bash
npm install
supabase start
```

`npm install` also switches on the secret-scanning pre-commit hook. `supabase start` runs the database, auth and storage locally in Docker and loads the placeholder menu from `supabase/seed.sql`. The local dashboard (Studio) is at http://127.0.0.1:54323.

## Everyday commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Website at http://localhost:5173 |
| `npm run typecheck` / `npm run lint` / `npm test` | TypeScript, lint and unit tests |
| `supabase db reset` | Rebuild the local database from `supabase/migrations/` and the seed |
| `supabase test db` | Run the pgTAP access tests in `supabase/tests/` |
| `supabase db advisors --local` and `supabase db lint --local` | Supabase's security and schema checks |
| `supabase gen types typescript --local > src/types/database.ts` | Regenerate database types after a migration |

## Environment variables

Names are in `.env.example`. Copy it to `.env.local` (git ignores it) and fill it in, then restart `npm run dev`:

| | Local Supabase (`supabase start`) | Hosted dev project |
| --- | --- | --- |
| `VITE_SUPABASE_URL` | `API_URL` from `supabase status` | Dashboard > Project Settings > API |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `PUBLISHABLE_KEY` from `supabase status` | Dashboard > Project Settings > API Keys |
| `VITE_TURNSTILE_SITE_KEY` | `1x00000000000000000000AA` (Cloudflare's always-pass test key) | The real site key; the widget must list `localhost` under its hostnames |

Local Supabase does not check the bot-check token, so the test key is enough there. The hosted project does.

Only public values go in the frontend. The Supabase secret key and the Turnstile secret never go in any file in this repository: they live in Supabase's dashboard (Edge Function secrets, Authentication > Attack Protection).

To log in locally, create accounts in the local dashboard (http://127.0.0.1:54323) with the same steps as "Creating a Super Admin" below.

## Creating a Super Admin

Public signup is off, so accounts are created by hand. Keep **at least two** Super Admins (the owner and one developer) so either can reset the other's password. Repeat these steps for each one:

1. Supabase dashboard > **Authentication** > **Users** > **Add user** > **Create new user**. Enter their real email and a password of at least 12 characters, and tick **Auto Confirm User**.
2. Copy the new user's **User UID** from the users list.
3. Dashboard > **SQL Editor**, run:
   ```sql
   update public.profiles set role = 'super_admin' where user_id = '<User UID>';
   ```

Until step 3, the new account can log in but sees nothing: every new account starts with the no-access role.

Order Staff accounts will be created by a Super Admin from the admin panel (Settings > Staff, built in Milestone 3). Until then, use the same steps with `role = 'order_staff', branch_id = '<branch id>'`.

## Last-resort recovery

If no Super Admin can log in (both passwords lost), a developer with access to the Supabase dashboard:

1. Creates a fresh Super Admin with the three steps above.
2. Deactivates the locked-out account, from Settings > Staff once it exists, or in the SQL Editor:
   ```sql
   update public.profiles set is_active = false where user_id = '<locked-out User UID>';
   ```

Never share one account between people. Changing someone's email is not possible (a database trigger blocks it); create a new account and deactivate the old one instead.
