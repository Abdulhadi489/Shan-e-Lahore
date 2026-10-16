# Shan-e-Lahore

Delivery-only ordering website for Shan-e-Lahore, Lahore. Customers order as guests; staff and the Super Admin manage orders and the menu under `/admin`. Rules for contributors are in `CLAUDE.md`, features in `docs/spec.md`, and the reasons behind decisions in `docs/decisions.md`.

**Start here:** `docs/status.md` shows what is done, what is next, what is waiting on the restaurant, and where everything is hosted. New to the team? Read "Joining the team" below first.

## Joining the team

Everyone gets their own access. **Never share a password or key, not even inside the team**: if one leaks, only that account is switched off, and the order history keeps showing who did what. Working on your own computer needs no accounts or keys at all.

| What | Who needs it | How to get it |
| --- | --- | --- |
| GitHub repo `Abdulhadi489/Shan-e-Lahore` (private) | Everyone who writes code | Hadi adds you: repo Settings > Collaborators > Add people |
| Tools on your computer | Everyone who writes code | "Tools you need" below. Docker Desktop needs no Docker account |
| Staff login to `/admin` on the dev site | Anyone testing staff screens | A Super Admin creates one with your own email ("Creating a Super Admin" below, with `order_staff`) |
| Supabase dev project (dashboard, `supabase db push`, `supabase functions deploy`) | Only the people who deploy database changes and functions (keep it to two) | An Owner invites you with the Developer role: Supabase Dashboard > Organization > Team. Everyone else sends migrations in a pull request |
| Render and Cloudflare | Nobody else | Render deploys `main` by itself after the checks pass; Cloudflare only holds the Turnstile keys |

How we work:

- **Pushing to `main` deploys the live site.** Work on a branch, push it, open a pull request, let CI pass and a teammate review, then merge. GitHub can't enforce this on a free private repo; with GitHub Pro (free for students through the GitHub Student Developer Pack) Hadi can protect `main`.
- Before merging, update `docs/status.md` (`CLAUDE.md` section 16).
- Each pull request uses Actions minutes from Hadi's free account (2,000 a month; CI takes about a minute, the database tests a few minutes).
- Never paste keys, passwords or customer data into chats or AI tools. The secret keys (Supabase secret key, Turnstile secret, database password) stay in the dashboards.
- Using an AI assistant? Point it at `AGENTS.md`; it reads `CLAUDE.md` from there.

## Tools you need

- Node 24 (`.nvmrc`)
- Docker Desktop, running
- Supabase CLI (`brew install supabase/tap/supabase`)
- gitleaks (`brew install gitleaks`). The pre-commit hook refuses to commit without it.
- Deno 2 (`brew install deno`), for the shared-rule tests

The `brew` commands are for macOS; on Windows or Linux use each tool's own install page.

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
| `supabase functions serve --env-file supabase/functions/.env` | Order Edge Functions at http://127.0.0.1:54321/functions/v1/ |
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

To log in locally, create accounts in the local dashboard (http://127.0.0.1:54323) with the same steps as "Creating a Super Admin" below. `supabase functions serve` needs the dev server's address in `ALLOWED_ORIGINS` in `supabase/functions/.env`. Don't use the emails the database tests create (`admin@`, `staff.one@`, `staff.two@`, `left.admin@`, `left.staff@` and `no.role@example.test`), or `supabase test db` fails. The seed adds two placeholder riders so orders can be sent out for delivery.

## Environments

| | Local | Dev (hosted) | Production (hosted) |
| --- | --- | --- | --- |
| Supabase | Docker on your laptop (`supabase start`) | Project `shan-e-lahore-dev` (Mumbai, free plan) | Not created yet; created before launch (Milestone 4), Supabase Pro recommended for daily backups |
| Data | `supabase/seed.sql`, rebuilt with `supabase db reset` | Test data only, never real customers | Real menu and real orders |
| Website | `npm run dev` | https://shan-e-lahore.onrender.com (for now) | Same Render site, switched to the production project, then the real domain |
| Who may change it | Anyone, freely | The team, after asking in the group | Only through migrations and the Super Admin panel; no AI or agent tooling (CLAUDE.md section 7) |

Schema changes always go local first, then `supabase db push` to dev, then to production. Data is never copied from production to the other two.

## Edge Functions

Customers never write to the database directly. Four Edge Functions in `supabase/functions/` handle orders, and two do the staff jobs that need the secret key; the rules they share (pricing, delivery charge, discounts, opening hours, input schemas) live in `supabase/functions/_shared/` and are imported by the website too, so the price shown is the price charged.

| Function | Does |
| --- | --- |
| `quote-order` | Prices a cart for a map pin: subtotal, distance, delivery, discount, total, and every reason it can't be ordered |
| `place-order` | Validates, rate-limits (10 per IP per hour, 3 per phone per 10 minutes), checks Turnstile, re-prices from the database and creates the order with `public.create_order()` |
| `get-order-by-token` | The tracking page's data, masked (first name, masked phone, no address) |
| `cancel-order-by-token` | Cancels only while the order waits for the confirmation call |
| `edit-order` | Staff only: changes an order's dishes or address on the confirmation call, re-prices it like `place-order` and saves it with `public.replace_order_contents()` |
| `admin-users` | Super Admins only: creates staff logins, changes a role or active state (`public.set_staff_access()`, which keeps two active Super Admins) and resets passwords |

The staff functions check the caller's login themselves, and the two database functions they call can't be reached from the browser; both act as the staff member, so the audit log records who made the change.

Run them locally (needs `supabase start` first):

```bash
cp supabase/functions/.env.example supabase/functions/.env
supabase functions serve --env-file supabase/functions/.env
```

Shared-rule tests: `deno test --config supabase/functions/deno.json supabase/functions/_shared/`.

Deploying to a hosted project: `supabase db push` (migrations), then `supabase functions deploy`, then set the two secrets in Dashboard > Edge Functions > Secrets (or `supabase secrets set NAME=value`): `TURNSTILE_SECRET_KEY` (the widget's **secret** key) and `ALLOWED_ORIGINS` (comma-separated site origins, e.g. `https://shan-e-lahore.onrender.com,http://localhost:5173`).

## Code map

How a customer order flows through the code:

1. `src/features/menu/` loads the menu (`useMenu.ts`, one query) and shows dishes; `ItemDialog.tsx` enforces size and add-on rules with `supabase/functions/_shared/pricing.ts`; `SidesRow.tsx` adds one-tap sides.
2. `src/features/checkout/cart.ts` keeps the cart (dish choices only) in localStorage; `CartPage.tsx` re-prices it from the live menu.
3. `CheckoutPage.tsx` takes the map pin (`LocationPicker.tsx`, Leaflet) and the customer's details, asks `quote-order` for the price, then calls `place-order` (`orderApi.ts` wraps all four functions).
4. `supabase/functions/place-order/` validates (`_shared/schemas.ts`), rate-limits (`_shared/rate-limit.ts` → `public.hit_rate_limit`), checks Turnstile (`_shared/turnstile.ts`), loads the menu and branch (`_shared/load.ts`), prices everything (`_shared/order.ts`) and saves it with `public.create_order` (migration `20261013081612`).
5. The customer lands on `src/features/tracking/TrackingPage.tsx`, which polls `get-order-by-token` and can call `cancel-order-by-token`.
6. Staff work the order in `src/features/admin/orders/`: `useLiveOrders.ts` loads open orders, today's orders and refunds due in one query and refetches when Realtime reports a change (and every 30 seconds as a backup); `useNewOrderAlarm.ts` rings, shows a notification and keeps the screen awake; `LiveOrdersPage.tsx` is the list, `OrderPage.tsx` the call screen, `KitchenTicket.tsx` the print view. The prepared WhatsApp messages come from `src/lib/whatsapp.ts`.
7. Status, payment and rider changes are direct updates to the `orders` table; the rules live in the database trigger `private.enforce_order_rules` (migration `20261012105428`), the third missed call in `call_attempts` cancels the order, and every status change is logged in `order_status_log` with who made it.

Staff screens are in `src/features/admin/`, one folder per section: `orders/` (above, plus `OrderEditor.tsx`), `availability/` (sold out, pause delivery), `menu/` (categories, dishes, add-ons, banners; `photos.ts` compresses and uploads), `delivery/`, `discounts/`, `customers/` (reads the `customer_summaries` view), `reports/` (`report.ts` does the sums and the CSV, tested) and `settings/`. `StaffLayout.tsx` holds the menu bar, the alarm banner and the Super Admin gate; `ui.tsx` the shared styles, form helpers and save helper. Staff screens write straight to the tables; RLS, column grants, triggers and CHECK constraints decide what each role may change.

Other pieces: `src/app/` (routes, customer layout, `useBranch.ts` for hours and delivery tiers), `src/features/home/HomePage.tsx`, `src/features/admin/LoginPage.tsx` (login with Turnstile), `src/i18n/` (all text; Urdu in `ur.json`), `src/index.css` (design tokens).

## Checks and deploys

GitHub Actions runs on every push to `main` and every pull request:

- **CI:** typecheck, lint, unit tests and build; `npm audit`; gitleaks over the whole git history.
- **Database** (only when `supabase/` changes): the pgTAP access tests, `supabase db lint` and the Security Advisor, failing on any warning.

Dependabot opens weekly update pull requests, waiting 14 days after a release (security fixes come straight away).

The website is a Render static site described in `render.yaml`: build command, the public `VITE_` values, the rewrite that lets React Router handle every address, and the security headers. Render deploys a commit on `main` only after its checks pass, so **pushing to `main` is deploying**.

- **First-time setup:** Render Dashboard > New > Blueprint > choose this repo (the repo owner approves Render's GitHub app) > Apply. Then add the site's `onrender.com` address to the Turnstile widget's hostnames in Cloudflare.
- **Switching Supabase projects** (for example to production): change `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` and the Supabase URL in the Content-Security-Policy in `render.yaml` (three places: `https://` and `wss://` in `connect-src`, `https://` in `img-src`), in the same commit.
- **Adding an outside service** (map tiles, images from Storage, Realtime): add its address to the matching CSP directive, or the browser blocks it. Check the browser console for "violates the following Content Security Policy directive".

## Creating a Super Admin

Public signup is off, so accounts are created by hand. Keep **at least two** Super Admins (the owner and one developer) so either can reset the other's password. Repeat these steps for each one:

1. Supabase dashboard > **Authentication** > **Users** > **Add user** > **Create new user**. Enter their real email and a password of at least 12 characters, and tick **Auto Confirm User**.
2. Copy the new user's **User UID** from the users list.
3. Dashboard > **SQL Editor**, run:
   ```sql
   update public.profiles set role = 'super_admin' where user_id = '<User UID>';
   ```

Until step 3, the new account can log in but sees nothing: every new account starts with the no-access role.

Once two Super Admins exist, every other account is created in the admin panel: Settings > Staff accounts.

## Last-resort recovery

If no Super Admin can log in (both passwords lost), a developer with access to the Supabase dashboard:

1. Creates a fresh Super Admin with the three steps above.
2. Deactivates the locked-out account, from Settings > Staff accounts, or in the SQL Editor:
   ```sql
   update public.profiles set is_active = false where user_id = '<locked-out User UID>';
   ```

Never share one account between people. Changing someone's email is not possible (a database trigger blocks it); create a new account and deactivate the old one instead.

## Setting up the order station

New orders ring on the staff screen only while the Live orders page is open. The restaurant's order station is a laptop:

1. Use Chrome or Edge, with the laptop plugged in and the volume up. Set the laptop not to sleep while plugged in.
2. Open `/admin`, log in and tap **Turn on alerts**. Browsers allow sound only after a tap, so this is needed again after every reload. Allow notifications when the browser asks.
3. Keep the Live orders tab open, ideally in its own window. While it is on screen the page keeps the screen awake.
4. Chrome: Settings > Performance > "Always keep these sites active" > add the site, so Memory Saver never closes the tab.
5. The WhatsApp buttons open WhatsApp on the same device, so log WhatsApp Desktop (or web.whatsapp.com) into the restaurant's WhatsApp Business number, never a personal one.

Phones can handle orders too, but only ring while their screen is on and the page is open. Pop-up notifications work on laptops only (Android needs a service worker and iPhone a home-screen install; neither is built).

## Before launch

The launch checklist is the Milestone 4 list in `docs/status.md`.

## Troubleshooting

**Staff login says "The bot check failed. Try again."** Supabase has the wrong Turnstile key. Dashboard > Authentication > Attack Protection needs the widget's **Secret key** from Cloudflare, not its Site key (the public one in `VITE_TURNSTILE_SITE_KEY`). To check without logging in, send a request with a fake token:

```bash
curl -s -X POST '<project URL>/auth/v1/token?grant_type=password' -H 'apikey: <publishable key>' -H 'Content-Type: application/json' -d '{"email":"nobody@example.invalid","password":"x","gotrue_meta_security":{"captcha_token":"fake"}}'
```

`invalid-input-secret` means the saved secret is wrong; `invalid-input-response` means the secret is right (only the fake token was rejected). Changes take about a minute to apply.

**The bot check fails with a 600xxx code.** Cloudflare decided the browser is automated. This always happens in Claude's built-in browser panel; use a normal browser.
