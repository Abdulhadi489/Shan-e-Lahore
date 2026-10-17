# Code map

Every file in the repository, what it is for, and where to make common changes. For setup and commands see `README.md`; for what is done and what is next see `docs/status.md`.

## How to pick up work

1. Read `docs/status.md`: open items are the unticked boxes. Agree in the team group who takes which, so two people don't build the same thing.
2. Get your own copy running: `README.md` > "First-time setup" (needs no keys; Docker runs a private Supabase on your laptop).
3. Make a branch: `git switch -c short-name-of-the-task`.
4. Change code, then run the checks before you commit:
   ```bash
   npm run typecheck && npm run lint && npm test
   ```
   Database changes also need `supabase test db`, `supabase db lint --local` and `supabase db advisors --local`.
5. Push the branch and open a pull request. CI runs the same checks; a teammate reviews; then merge. **Pushing to `main` deploys the live site**, so never push there directly.
6. Tick the item in `docs/status.md` (and add a line to `docs/decisions.md` if you decided something) in the same pull request.
7. Database changes reach the hosted project only when Arslan or Sufyan run `supabase db push` after the merge.

Using an AI assistant? Point it at `AGENTS.md`; it reads `CLAUDE.md`, the project's rules.

## Where to change common things

| I want to change… | Edit |
| --- | --- |
| Any text on the site, English or Urdu | `src/i18n/en.json` and `src/i18n/ur.json` (same keys in both; a test fails if Urdu is missing) |
| Colours, fonts, corner radius | `src/index.css` (design tokens; only these may be used) |
| How the layout adapts to the screen | Fluid rules, no size-specific breakpoints on customer pages: `grid-cols-cards` (as many columns as fit), `clamp()` for text that grows with the window, `flex-wrap` with a basis for side-by-side-or-stacked. Test by sliding the window width, not only at a few sizes |
| The menu, prices, hours, delivery charges, staff, riders | Nothing in code: the admin panel at `/admin` |
| How prices, delivery or discounts are calculated | `supabase/functions/_shared/` (pricing, delivery, discount, order) and their `_test.ts` files |
| Who may read or change a table | A **new** migration in `supabase/migrations/` plus a pgTAP test in `supabase/tests/` |
| A new page on the customer site | `src/features/<area>/`, then a route in `src/app/AppRoutes.tsx` |
| A new staff screen | `src/features/admin/<section>/`, a route in `src/features/admin/AdminApp.tsx`, a link in `StaffLayout.tsx` |
| The WhatsApp messages | `src/lib/whatsapp.ts` (builders) and the `whatsapp` keys in the dictionaries |
| Security headers or the live site's settings | `render.yaml` |

## Top level

| File | What it is |
| --- | --- |
| `README.md` | Setup, commands, environments, deploys, joining the team, troubleshooting |
| `CLAUDE.md` | The project's rules: stack, security, data model, business rules, working agreement. Read it fully once |
| `AGENTS.md` | Short pointer for AI coding assistants to `CLAUDE.md` and `docs/status.md` |
| `package.json` | The website's dependencies (exact versions) and npm scripts (`dev`, `build`, `test`…) |
| `package-lock.json` | The exact installed version of every package; never edit by hand |
| `index.html` | The single HTML page the React app starts in |
| `vite.config.ts` | Build tool settings (React and Tailwind plugins) |
| `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json` | TypeScript settings (strict mode) for the site and for config files |
| `eslint.config.js` | Code style and mistake checks run by `npm run lint` |
| `render.yaml` | Render static-site setup: build command, public `VITE_` values, rewrite for React Router, security headers (CSP and others) |
| `.env.example` | Names of the website's environment variables; copy to `.env.local` (never committed) |
| `.gitignore` | Files git never stores (`.env*`, `node_modules`, `dist`…) |
| `.npmrc` | Makes npm refuse packages less than 14 days old and save exact versions |
| `.nvmrc` | Node version (24) |
| `.githooks/pre-commit` | Runs gitleaks before every commit so no secret is ever committed |
| `.github/workflows/ci.yml` | GitHub checks on every push and pull request: typecheck, lint, tests, build, `npm audit`, secret scan |
| `.github/workflows/database.yml` | Database checks when `supabase/` changes: builds a fresh database, runs the pgTAP tests, lint and Security Advisor |
| `.github/dependabot.yml` | Weekly dependency update pull requests |
| `.claude/skills/design-taste-frontend/` | A reviewed design guide for AI assistants (`CLAUDE.md` wins where they differ) |

## `docs/`

| File | What it is |
| --- | --- |
| `spec.md` | The feature specification agreed with the restaurant; the source of truth for features |
| `status.md` | What is done, what is next, the plan to launch, what we wait for from the restaurant, hosted setup. Updated with every push |
| `decisions.md` | One line per decision: date, what, why |
| `code-map.md` | This file |

## `src/` (the website)

| File | What it is |
| --- | --- |
| `main.tsx` | Starts the app: React, the data cache (TanStack Query), the router |
| `index.css` | Tailwind setup, design tokens (colours, fonts, radius), Urdu line heights, map markers, print size for kitchen tickets |
| `assets/menu-arches-800.webp`, `menu-arches-1600.webp` | The three-arches banner from the printed menu, two sizes |
| `types/database.ts` | Generated TypeScript types of every table; regenerate after a migration (`README.md`) |

### `src/app/` (shared by the customer pages)

| File | What it is |
| --- | --- |
| `AppRoutes.tsx` | Every customer address (`/`, `/menu`, `/cart`, `/checkout`, `/track/:token`, info pages) and `/admin` |
| `CustomerLayout.tsx` | Top bar (logo, Menu, Cart, language; full width, stays visible and shares its height as `--header-h`), the page column and its fluid edge `--page-pad`, centred footer links |
| `useBranch.ts` | Loads the restaurant's details, hours and delivery charges |
| `OpeningHoursList.tsx` | The opening-hours table (home and contact pages) |
| `EmptyPage.tsx` | Simple page with a heading, used for "page not found" |

### `src/features/` (customer site)

| File | What it is |
| --- | --- |
| `home/HomePage.tsx` | Home: open/closed status, headline with the hero dish photo, deals, categories, popular dishes, how ordering works, hours, delivery charges, map on request |
| `home/HeroPhoto.tsx` | The photo beside the headline: the first active banner, or the first featured dish photo; opens the linked dish when tapped |
| `menu/useMenu.ts` | Loads the whole menu in one request |
| `menu/MenuPage.tsx` | Menu with the sticky category bar and dish cards |
| `menu/ItemDialog.tsx` | The dish pop-up: size and add-on choices, quantity, add to cart (staff reuse it when editing an order) |
| `menu/SidesRow.tsx` | "Add with your order" one-tap sides (naan, raita…) |
| `checkout/cart.ts` | The cart, kept in the browser (dish choices only, never customer details) |
| `checkout/CartPage.tsx` | Cart: quantities, live prices, unavailable-dish warnings |
| `checkout/CheckoutPage.tsx` | Checkout: map pin, address, name, phone, payment method, discount code, bot check, place order |
| `checkout/LocationPicker.tsx` | The Leaflet map (pick a pin, delivery area); also used by staff screens |
| `checkout/orderApi.ts` | Calls our Edge Functions and turns their error codes into errors the pages show |
| `tracking/TrackingPage.tsx` | `/track/:token`: order progress, payment instructions, rider, cancel while waiting |
| `info/InfoPage.tsx` | About, terms, privacy and refund pages (text from the dictionaries) |
| `info/ContactPage.tsx` | Contact page: address, phone, WhatsApp, hours, map |

### `src/features/admin/` (staff panel at `/admin`)

| File | What it is |
| --- | --- |
| `AdminApp.tsx` | Staff routes and login check |
| `LoginPage.tsx` | Staff login (email, password, bot check) |
| `StaffLayout.tsx` | Staff header, menu bar (Order Staff see two sections, Super Admins eight), new-order alarm banner, Super Admin gate |
| `useStaffBranch.ts` | Loads the staff member's branch, payment details and riders |
| `ui.tsx` | Shared button and input styles, the save helper, error and "Saved" messages, form helpers |
| `orders/useLiveOrders.ts` | Today's and open orders, updated instantly by Realtime (30-second backup check) |
| `orders/useNewOrderAlarm.ts` | Alarm sound, browser notification, keeping the screen awake |
| `orders/LiveOrdersPage.tsx` | Order list with tabs (New, Kitchen, On the way, Done today, Refund due) |
| `orders/OrderPage.tsx` | One order: call, WhatsApp, missed calls, mark paid, confirm, rider, statuses, cancel, refund |
| `orders/OrderEditor.tsx` | Change dishes or address during the call (server re-prices) |
| `orders/KitchenTicket.tsx` | 80 mm printable kitchen ticket |
| `availability/AvailabilityPage.tsx` | Pause delivery; mark dishes, sizes and add-ons sold out |
| `menu/MenuAdminPage.tsx` | Categories and their dishes; the Menu sub-menu |
| `menu/ItemEditor.tsx` | Add or edit a dish: details, photo, sizes, add-on groups |
| `menu/AddonGroupsPage.tsx` | Add-on groups and their choices |
| `menu/BannersPage.tsx` | Home banners, each optionally linked to a dish |
| `menu/photos.ts` | Shrinks photos in the browser and uploads them (two sizes) |
| `delivery/DeliveryPage.tsx` | Distance charges, delivery rules, restaurant pin, change log |
| `customers/CustomersPage.tsx` | Customer list, search, order history, block a number |
| `discounts/DiscountsPage.tsx` | Discount codes |
| `reports/report.ts` | Report sums and the Excel (CSV) file; tested in `report.test.ts` |
| `reports/ReportsPage.tsx` | Reports screen and download |
| `settings/SettingsPage.tsx` | Restaurant details, payments and WhatsApp, opening hours |
| `settings/RidersSection.tsx` | Riders |
| `settings/StaffSection.tsx` | Staff accounts (through the `admin-users` function) |

### `src/lib/` and `src/i18n/`

| File | What it is |
| --- | --- |
| `lib/supabase.ts` | The one Supabase connection the website uses |
| `lib/format.ts` | Times, days, phone numbers, Lahore date conversions (tested in `format.test.ts`) |
| `lib/money.ts` | Rupee amounts with thousands separators |
| `lib/images.ts` | Address of a menu photo (large or card size) |
| `lib/whatsapp.ts` | WhatsApp links and the prepared messages (tested in `whatsapp.test.ts`) |
| `i18n/en.json`, `i18n/ur.json` | All text in English and Urdu |
| `i18n/index.ts` | Language setup, Urdu right-to-left switch, remembers the choice |
| `i18n/i18next.d.ts` | Makes a missing text key a TypeScript error |
| `i18n/dictionaries.test.ts` | Fails if a customer text has no Urdu |
| `components/Turnstile.tsx` | The Cloudflare bot check widget (compact when there is less than 300 px) |

## `supabase/` (database and server)

| File | What it is |
| --- | --- |
| `config.toml` | Settings for the local Supabase (Docker) and each function's login check |
| `seed.sql` | Test data for local copies: the real printed menu, branch, hours, placeholder delivery charges and riders. Never real customers |
| `.gitignore` | Keeps local Supabase files out of git |

### `supabase/migrations/` (every database change, in order)

Run in order by `supabase db reset` (local) and `supabase db push` (hosted). Never edit one that was pushed; add a new one.

| File | What it adds |
| --- | --- |
| `…105421_foundation.sql` | Locks everything by default, the `private` helper schema, enums (order status, payment…), the audit log |
| `…105423_branches_profiles.sql` | Branches, staff profiles and roles, branch settings, delivery tiers, opening hours, and the "who may do what" helpers |
| `…105424_menu.sql` | Categories, dishes, sizes, add-ons, deals, banners, with their access rules |
| `…105426_customers_riders_discounts.sql` | Customers, riders, discount codes |
| `…105428_orders.sql` | Orders, order lines, missed calls, status log, and the trigger that enforces every order rule |
| `…105429_rate_limits_storage.sql` | Rate-limit table and the photo storage bucket |
| `…134047_staff_email_login_guest_only.sql` | Guest-only ordering; staff log in with email |
| `…081612_order_creation_and_rate_limits.sql` | `create_order` (saves an order in one step) and the rate-limit counter |
| `…085648_category_sides.sql` | The "sides" switch on categories |
| `…193031_staff_access.sql` | `set_staff_access`: role and active changes, keeps two Super Admins |
| `…194545_audit_branches.sql` | Logs changes to the restaurant pin |
| `…194933_customer_summaries.sql` | The customer totals view for the Customers screen |
| `…195618_edit_order.sql` | `replace_order_contents`: saves an edited order |
| `…165652_banner_dish_link.sql` | `banners.item_id`: the dish a banner opens (same branch; cleared if the dish is deleted) |

### `supabase/tests/` (pgTAP: proves who can and can't do what)

| File | What it checks |
| --- | --- |
| `_fixtures.psql` | Shared test data: two branches, staff of each, a Super Admin, deactivated accounts, guests, orders |
| `00_security_baseline_test.sql` | Every table locked, nothing public except the menu, no unsafe functions |
| `01_menu_test.sql` … `09_category_sides_test.sql` | Menu, accounts, customers, order access, order rules (statuses, payments, missed calls), admin tables, photo storage, order creation, sides |
| `10_staff_access_test.sql` … `14_banner_dish_link_test.sql` | Staff role changes, pin audit, customer view, order editing, banner dish link |

### `supabase/functions/` (server code, Deno)

| File | What it is |
| --- | --- |
| `quote-order/` | Prices a cart for a map pin (shown live at checkout) |
| `place-order/` | Checks everything (bot check, rate limits, hours, prices) and saves the order |
| `get-order-by-token/` | The tracking page's data, with the phone masked and no address |
| `cancel-order-by-token/` | Customer cancels while the order waits for the call |
| `edit-order/` | Staff change dishes or address on the call; re-priced |
| `admin-users/` | Super Admins create logins, change access, reset passwords |
| `deno.json`, `deno.lock` | Shared imports and exact versions for running the shared tests |
| `<function>/deno.json` | Each function's imports for deploying |
| `.env.example` | Local function settings (test bot-check key, allowed sites); copy to `.env` |

### `supabase/functions/_shared/` (rules used by the server **and** the website, so the price shown is the price charged)

| File | What it is |
| --- | --- |
| `pricing.ts` | One dish's price with its size and add-ons; add-on rules |
| `delivery.ts` | Distance from the restaurant and the delivery charge |
| `discount.ts` | Discount code rules |
| `opening-hours.ts` | Open now? Next opening time? (after-midnight aware) |
| `order.ts` | Prices a whole order and lists every problem |
| `phone.ts` | Turns any way of typing a Pakistani number into `92…` |
| `schemas.ts` | Input checks for every function (zod) |
| `*_test.ts` | Deno tests for the files above |
| `http.ts` | Request handling: allowed sites only, error codes instead of crashes |
| `db.ts` | The server's privileged database connection (server only) |
| `load.ts` | Loads branch, menu and discount data for pricing (server only) |
| `rate-limit.ts` | Limits orders per phone and per IP (server only) |
| `turnstile.ts` | Checks the bot-check answer with Cloudflare (server only) |
