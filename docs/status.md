# Project status

The single place to see what is done, what is next and what is waiting on someone. **Update it with every push.**

New to the project? Read in this order: this file, `CLAUDE.md` (rules, stack, security), `docs/spec.md` (features), `docs/decisions.md` (why things are the way they are), `README.md` (setup, environments, how to run and deploy, code map).

**Launch: Friday 23 October 2026.** Moved forward from 9 November by the team on 13 October.

Live (dev data): https://shan-e-lahore.onrender.com, backed by the hosted dev Supabase project `shan-e-lahore-dev`.

## Summary (14 October, early morning)

| Milestone | State |
| --- | --- |
| 1. Foundation | Done |
| 2. Customer ordering | Core done and live, static pages drafted. Left: real dish photos (display code done; team is taking them), admin-managed home banners (with Milestone 3), restaurant approval of the page texts |
| 3. Admin and order handling | Live Orders live on the Render site (14 Oct); tested locally, not yet on dev with a real staff login. Next: staff switches, settings, menu management. Reports, discount codes and edit-order may slip to the week after launch (team decision) |
| 4. Hardening and launch | Not started |

## Milestone checklists

Tick items as they land. Items come from `CLAUDE.md` section 15 and `docs/spec.md`.

### Milestone 1: Foundation (done)

- [x] Vite + React 19 + TypeScript (strict) + Tailwind 4 + React Router
- [x] English/Urdu with react-i18next, RTL for Urdu, Noto Nastaliq Urdu self-hosted, language kept in localStorage
- [x] Design tokens from the logo and printed menu (`src/index.css`)
- [x] Supabase dev project linked; schema, GRANTs, RLS, helper functions, triggers and constraints (`supabase/migrations/`)
- [x] pgTAP access tests for every table (`supabase/tests/`)
- [x] Generated database types (`src/types/database.ts`)
- [x] Dev seed with the real printed menu (`supabase/seed.sql`)
- [x] Staff/admin login: email + password (12+ characters) + Turnstile; public signup off; roles from `profiles`
- [x] `/admin` route protection and sign-out that clears the TanStack Query cache
- [x] CI (GitHub Actions) and Dependabot
- [x] `render.yaml` with SPA rewrite and security headers; deployed to Render

### Milestone 2: Customer ordering

- [x] Home: three-arch banner, open/closed status, Order and Call buttons, deals, category strip, popular dishes, how ordering works, hours, delivery charges, delivery-area map on request
- [x] Menu: sticky category bar, dish cards, sold-out state, item dialog enforcing size and add-on rules
- [x] Cart: quantities, re-pricing from the live menu, unavailable-dish warnings, kept in localStorage
- [x] "Add with your order" one-tap sides (breads, raita/salad; drinks once listed)
- [x] Checkout: map pin (tap, drag, use my location, pin at centre), address, landmark, name, phone, notes, payment method, discount code, Turnstile, server quote as the pin moves
- [x] Tracking page: status timeline, call notice, payment instructions, WhatsApp screenshot link, rider when out for delivery, cancel while pending
- [x] Shared rules with Deno tests (`supabase/functions/_shared/`): pricing, delivery charge, discounts, opening hours (past midnight), phone numbers, input schemas, whole-order pricing
- [x] Edge Functions `quote-order`, `place-order`, `get-order-by-token`, `cancel-order-by-token`; order creation and rate limits in SQL (`create_order`, `hit_rate_limit`)
- [x] Dish photos: display on cards (small 320 px file) and in the dish pop-up (large file); empty space when a dish has none. Tested locally with a test image
- [ ] First batch of real dish photos uploaded to dev (waiting on the team's photos)
- [x] Static pages: about, contact (address, phone, hours and map from the database), terms, privacy, refund policy. **Draft text** written from facts we know (no invented promises such as refund deadlines); the restaurant must approve it
- [ ] Home-page banners from the `banners` table (spec: managed by the Super Admin). The home page shows the fixed three-arch strip for now; build the display together with banner upload in Milestone 3

### Milestone 3: Admin and order handling

- [x] **Live Orders**: Realtime list for the staff member's branch (tabs New, Kitchen, On the way, Done today, Refund due); alarm repeating until tapped and a browser notification on laptops; screen kept awake; tap-to-call. Order station setup is in README ("Setting up the order station")
- [x] Call-attempt button (the third missed call auto-cancels; enforced by the database)
- [x] Verify transfer payment with transaction ID; confirm; cancel with reason; status buttons; rider assignment (`out_for_delivery` needs a rider; enforced by the database)
- [x] WhatsApp message builders in `src/lib/whatsapp.ts` (English and Urdu by the order's language): order received with payment instructions, confirmed, out for delivery with rider, cancelled with refund note, and the rider message with address and Google Maps link. Unit tested
- [x] Kitchen ticket print view (80 mm `@page`, browser print dialog; prints to any printer or PDF). Not yet printed on paper
- [x] Refund-due list (cancelled paid orders; staff mark refunded)
- [ ] `edit-order` Edge Function: staff change items or address during the confirmation call; the server re-prices. **May come after launch** (team, 14 Oct): until then staff cancel and the customer orders again
- [ ] Staff-only controls: sold-out switches for items, variants and add-on options; delivery on/off switch
- [ ] Menu management (Super Admin): categories (including the "sides" switch), items, variants, add-on groups, deals, photo upload compressed in the browser to WebP as two files (`<name>.webp` up to 1200 px and `<name>-card.webp` at 320 px, see `docs/decisions.md`), banners, ordering, sold-out and hide switches, English and Urdu side by side
- [ ] Delivery settings: branch pin on a map, km tiers, road factor, minimum order (currently 0, off), free-delivery threshold, delivery switch, change log
- [ ] Discount codes. **May come after launch** (team, 14 Oct)
- [ ] Customers: list with order count, spend and last order; order history; block switch
- [ ] **May come after launch** (team, 14 Oct). Reports (Super Admin only): sales by period, status and cancel reasons, payment method, top items, distance tier, discount usage; CSV export (UTF-8 with BOM)
- [ ] Settings: restaurant info, opening hours, payment accounts, WhatsApp number, riders; staff accounts through an `admin-users` Edge Function (create, deactivate, reset password)

### Milestone 4: Hardening and launch

- [ ] End-to-end test of every path: COD; each transfer method; unpaid transfer; three missed calls; customer cancel; out of radius; closed hours including after midnight; sold-out item; invalid discount; rate limit; blocked number
- [ ] Full RLS and Security Advisor pass on production; CSP check on the live domain
- [ ] Mobile, RTL and accessibility review (keyboard-only walkthrough, screen reader spot checks)
- [ ] Order station test on the restaurant's own laptop: alarm sound, notification, sleep settings, Chrome Memory Saver, WhatsApp Desktop on the restaurant number (README "Setting up the order station"); one kitchen ticket printed
- [ ] Lighthouse and speed: the Supabase client library is the biggest download on every page (about 115 KB compressed)
- [ ] Daily encrypted backup (GitHub Actions + `age`) and one tested restore (`CLAUDE.md` section 13)
- [ ] Production Supabase project (Pro plan recommended): migrations, Super Admins, Turnstile, leaked password protection, Edge Functions and secrets
- [ ] Point `render.yaml` at production (`VITE_` values and CSP together); connect the domain; add it to Turnstile and `ALLOWED_ORIGINS`
- [ ] Remove `localhost` from the Turnstile widget
- [ ] Real content in production: menu, photos, hours, delivery prices, payment accounts, WhatsApp number, riders, staff accounts; no placeholder data left
- [ ] Urdu text reviewed by an Urdu speaker
- [ ] README and this file brought up to date for handover

## Plan to launch

| Days | Work |
| --- | --- |
| 13 Oct | Done ahead of plan: checkout back end and front end, tracking, sides |
| 14 Oct | Live Orders (done, pushed) |
| 15-16 Oct | Staff switches (sold out, pause delivery); Settings (riders, payment accounts, WhatsApp number, hours, staff accounts); first dish photos |
| 17-18 Oct | Menu management, photo upload, home banners |
| 19 Oct | Delivery settings; Customers list with block switch; edit-order, discount codes and reports if time allows |
| 20-21 Oct | Milestone 4 |
| 22 Oct | Real content in production, Urdu fixes, domain |
| 23 Oct | Launch |

## Waiting on the restaurant

| By | What |
| --- | --- |
| 15 Oct | Dish photos (team is taking them) |
| 16 Oct | Drinks list with prices (for the sides row), delivery prices per km tier, bank/JazzCash/Easypaisa account details, WhatsApp number for screenshots, rider names and phones, staff names and emails |
| 18 Oct | Original logo file (SVG, AI, EPS or PDF) |
| 20 Oct | The order-station laptop with Chrome, and WhatsApp Desktop logged into the restaurant's WhatsApp Business number (README "Setting up the order station") |
| 20 Oct | Urdu speaker to review all site text; decision and payment for Supabase Pro (production backups); domain name bought |
| 21 Oct | Approve or correct the draft about, terms, privacy and refund policy pages (both languages); say how fast refunds are sent and what happens with wrong or missing items |

## Hosted setup and accounts (no secrets here)

| Service | What | Owner / access |
| --- | --- | --- |
| GitHub | Private repo `Abdulhadi489/Shan-e-Lahore`, default branch `main` | Hadi owns it; Arslan has push access. CI minutes come from Hadi's free account (2,000 a month) |
| Render | Blueprint `shan-e-lahore`, static site https://shan-e-lahore.onrender.com, deploys `main` after CI passes | Arslan's Render workspace; Hadi installed Render's GitHub app on his account for this repo only |
| Supabase dev | Project `shan-e-lahore-dev` (ref `gdjvulhrumxwjmnaywnn`, Mumbai, free plan): 9 migrations, 4 Edge Functions | Super Admins on dev: Arslan and Sufyan. Edge Function secrets: `TURNSTILE_SECRET_KEY`, `ALLOWED_ORIGINS` (Render URL, localhost:5173, 127.0.0.1:5173) |
| Supabase production | Not created yet (Milestone 4) | |
| Cloudflare Turnstile | Widget "Shan-e-Lahore", site key `0x4AAAAAAFUjrlxajrhVCE3G`; hostnames `localhost` and `shan-e-lahore.onrender.com` | Arslan's Cloudflare account. The secret key is set in Supabase Auth (Attack Protection) and as the `TURNSTILE_SECRET_KEY` function secret |
| Domain | Not bought yet | Restaurant |

## Data in the dev project

- Real: menu (106 dishes, from the printed menu of 2026-08-29), branch address, phone and map pin (31.523689, 74.344498), opening hours (05:00 to midnight daily).
- Placeholder: delivery tiers (3/5/7 km at Rs 100/150/200), road factor 1.3. Minimum order is 0 (off, team decision).
- Empty: payment accounts, WhatsApp number, riders, discount codes, banners, photos. While payment accounts are empty, the tracking page and the WhatsApp messages say the details come on the confirmation call. With no riders, orders can't be sent out for delivery on dev until the Riders screen lands (15-16 Oct; team chose to wait rather than add riders by SQL). The local seed has two placeholder riders.

## Known gaps and risks

- Ten days for Milestones 3 and 4 is tight. Anything not ready by 21 October is listed here and decided with the team, not dropped silently.
- All Urdu so far was written by Claude (except dish names, which are the restaurant's own) and needs review, including the customer WhatsApp messages (`whatsapp.*` in `src/i18n/ur.json`).
- New-order alerts work only while the Live orders page is open and on a device that is awake; a locked phone never rings (no web push). See README "Setting up the order station".
- Realtime sends anonymous subscribers an empty "401" notice when an order changes (no order data). Accepted, see `docs/decisions.md`.
