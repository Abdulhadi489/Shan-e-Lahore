# Project status

The single place to see what is done, what is next and what is waiting on someone. **Update it with every push.**

New to the project? Read in this order: this file, `CLAUDE.md` (rules, stack, security), `docs/spec.md` (features), `docs/decisions.md` (why things are the way they are), `README.md` (setup, environments, how to run and deploy), `docs/code-map.md` (every file and where to change what).

**Launch: Friday 23 October 2026.** Moved forward from 9 November by the team on 13 October.

Live (dev data): https://shan-e-lahore.onrender.com, backed by the hosted dev Supabase project `shan-e-lahore-dev`.

## Summary (21 October)

19-21 Oct: the customer site's heritage redesign is on branch `Khan-Branch` with an open pull request into `main` (CI green on the 19 Oct push, waiting for review). The 21 Oct changes below are not committed or pushed yet. Not merged or deployed.

| Milestone | State |
| --- | --- |
| 1. Foundation | Done |
| 2. Customer ordering | Done and live, static pages drafted. Left: real dish photos (upload screen built; team is taking them), restaurant approval of the page texts |
| 3. Admin and order handling | **Done and live on dev (17 Oct)**: Live Orders, availability, settings and staff accounts, menu with photos and banners, delivery, customers, discount codes, reports, editing orders. Tested locally; next the team clicks through on dev with real logins and enters the restaurant's real content |
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

- [x] Home: video hero (three-arch banner until 21 Oct), open/closed status, Order and Call buttons, deals, category strip, popular dishes, how ordering works, hours, delivery charges, delivery-area map on request
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
- [x] Fluid, responsive layout (17 Oct): no size-specific rules on customer pages. Grids add columns as space allows, headline and text grow smoothly with the window, the hero photo sits beside the headline when both fit and below it when not, the page fills the window up to about 2,000 px. The top bar spans the window and stays visible while scrolling; the footer is centred. Checked by sliding the width from 320 to 2,600 px (what zooming does), English and Urdu: no sideways scrolling, nothing disappears
- [x] ~~Home hero photo (Home banner or featured dish)~~ and the Menu > Home banners admin page removed 28 Oct (team request; banners showed nowhere after the redesign). The `banners` table and its migrations stay, unused
- [x] Heritage redesign of the customer site (19-21 Oct, Talha, branch `Khan-Branch`, pull request open). Look only; no logic, database or Edge Function changes. Every text is the site's own. As it stands on 21 Oct:
  - Orange top bar: the logo's round emblem (redrawn in SVG) and a signboard-style wordmark with a fork-and-spoon "O" (Jost 800), Home, Menu and Cart pills, language button, phone pill (hidden on phones). Under it a folk-art flower-and-bird border (`src/assets/lace-folk-band.webp`, one true repeat, so no seams). Orange footer band with a gold dotted edge
  - Faint gold Badshahi Masjid sketch behind every customer page (`src/assets/lahore-sketch.svg`, drawn by `scripts/lahore-sketch.ts`)
  - Home: the shop video (`src/assets/topvideo.mp4`) fills a full-width hero right under the border, with the open-now pill, headline, text and buttons centred on a dark wash (poster is the featured dish photo; reduced-motion visitors see the poster). The three-arch band and the `menu-arches-*.webp` images were removed on 21 Oct. The Find us / hours / delivery row sits in an off-white panel with dividers
  - Page titles show the Urdu page name beside the English one; Menu cards have arch-topped photos; Cart and Checkout columns sit in off-white panels next to an espresso summary card; Tracking shows numbered steps; the Contact map sits in the arch frame
  - Floating "View cart" bar (count and subtotal) on every customer page except cart, checkout and tracking
  - One palette for the whole site, staff screens included (21 Oct): orange #E5680F, off-white #FBF4E8; dark orange #A8480A only for small text on cream
  - Urdu spacing fixed (21 Oct): titles no longer overlap the text below, small Urdu text is one size larger, hours line up with their days, buttons fit their labels
  - Fonts Cormorant Garamond (headings) and Jost (text), self-hosted; Urdu stays Noto Nastaliq. Sideways rows hide their scrollbar
  - Checked: typecheck, lint, tests and build; Home, Menu, Cart, Checkout and Contact in English and Urdu at desktop and 375 px (no sideways scroll, tap targets 44 px+). **Not checked:** the Tracking page with a real order, and a real phone

### Milestone 3: Admin and order handling

- [x] Staff pages share the customer site's top bar and footer (18 Oct): the bar stays visible while scrolling and the ringing alarm sits in it
- [x] **Live Orders**: Realtime list for the staff member's branch (tabs New, Kitchen, On the way, Done today, Refund due); alarm repeating until tapped and a browser notification on laptops; screen kept awake; tap-to-call. Order station setup is in README ("Setting up the order station")
- [x] Call-attempt button (the third missed call auto-cancels; enforced by the database)
- [x] Verify transfer payment with transaction ID; confirm; cancel with reason; status buttons; rider assignment (`out_for_delivery` needs a rider; enforced by the database)
- [x] WhatsApp message builders in `src/lib/whatsapp.ts` (English and Urdu by the order's language): order received with payment instructions, confirmed, out for delivery with rider, cancelled with refund note, and the rider message with address and Google Maps link. Unit tested
- [x] Kitchen ticket print view (80 mm `@page`, browser print dialog; prints to any printer or PDF). Not yet printed on paper
- [x] Refund-due list (cancelled paid orders; staff mark refunded)
- [x] `edit-order` Edge Function: staff change dishes or the address during the confirmation call (only while it waits for the call); the server re-prices and `public.replace_order_contents()` saves and audits it
- [x] Availability screen (Order Staff and Super Admin): sold-out switches for dishes, sizes and add-on choices; pause/resume delivery
- [x] Menu management (Super Admin): categories (including the "sides" switch), items, variants, add-on groups, deals, photo upload compressed in the browser to WebP as two files (`<name>.webp` up to 1200 px and `<name>-card.webp` at 320 px, see `docs/decisions.md`), ordering, sold-out and hide switches, English and Urdu side by side
- [x] Delivery settings: branch pin on a map (moving it is now audited), km tiers, road factor, minimum order (Rs 600 on dev since 18 Oct), free-delivery threshold, change log; the delivery switch is on Availability
- [x] Discount codes: add, edit, switch off, delete unused; usage count
- [x] Customers: list with order count, cancellations, delivered spend and last order (`customer_summaries` view); search; order history; block switch
- [x] Reports (Super Admin only): sales by period, status and cancel reasons, payment method, top items, distance tier, discount usage; CSV export (UTF-8 with BOM)
- [x] Settings: restaurant info, opening hours, payment accounts, WhatsApp number, riders; staff accounts through the `admin-users` Edge Function (create, change role or active state, reset password; two active Super Admins always kept)
- [x] Pushed and deployed to dev (17 Oct, approved by Arslan): migrations `20261016193031_staff_access`, `20261016194545_audit_branches`, `20261016194933_customer_summaries`, `20261016195618_edit_order`; functions `admin-users`, `edit-order` (both keep verify_jwt on and check the login themselves) and `place-order` (shared code moved). Security Advisor on dev: only the two accepted warnings
- [x] Checked on dev with Arslan's real login (17 Oct, live site and CSP): every staff screen loads; photo upload saves both sizes and deleting the dish removes them; report and CSV download (BOM present); a discount code created and deleted; `admin-users` and `edit-order` answer with the real login; the Live orders page holds a branch-filtered Realtime subscription. Test data was removed
- [x] Fonts of the customer site chosen in Settings > Fonts (22 Oct, **local database only so far**): migration `20261022150000_site_settings` (one-row `site_settings` table, fonts limited to the allowed lists by CHECK constraints, public read of the four font columns, Super Admin write), pgTAP `15_site_settings_test.sql`, rollback in `supabase/rollbacks/`. Until it is pushed to the hosted dev project the site simply keeps the built-in fonts and Settings > Fonts cannot save. Non-default fonts load from Google Fonts (CSP updated in `render.yaml`); the Privacy text does not mention Google yet. Steps to push: `docs/runbook-fonts-and-descriptions.md`
- [x] One-line English and Urdu descriptions for all 104 dishes without one (the 2 deals keep theirs): data migration `20261022150100_menu_descriptions` (local only so far; the Urdu lines need a native speaker's review). Cards show them, clamped to two lines on phones
- [x] Banners on all six pages from the restaurant's own photos (22 Oct; `src/assets/banners/`, two sizes each, five photos from the zip are shared by crops; the Pexels photos and `IMAGE_CREDITS.md` are gone); closing time moved to 23:00 in the seed (hosted rows are changed in Settings > Opening hours)
- [ ] Still to try on dev during opening hours (04:00 to 03:00 once the hosted hours are updated): place a test order, edit it on the call, take it to delivered; the alarm on the order-station laptop

### Milestone 4: Hardening and launch

- [ ] End-to-end test of every path: COD; each transfer method; unpaid transfer; three missed calls; customer cancel; out of radius; closed hours including after midnight; sold-out item; invalid discount; rate limit; blocked number
- [ ] Full RLS and Security Advisor pass on production; CSP check on the live domain, including photo upload and the reports download
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
| 16-17 Oct | Rest of Milestone 3 built and tested locally: availability, settings and staff accounts, menu with photos and banners, delivery, customers, discount codes, reports, editing orders |
| 17 Oct | Pushed and deployed to dev |
| 17-19 Oct | Team tests every screen on dev with real logins; restaurant's real content goes in (menu, photos, prices, accounts, riders, staff) |
| 19 Oct | Heritage redesign of the customer site (pull request from `Khan-Branch`); next: the staff login page in the same look |
| 21 Oct | Video hero, folk-art border, logo emblem, View cart bar, one site-wide palette, Urdu spacing fixes (on `Khan-Branch`, not pushed yet) |
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
| Supabase dev | Project `shan-e-lahore-dev` (ref `gdjvulhrumxwjmnaywnn`, Mumbai, free plan): 14 migrations (latest 17 Oct: banner dish link), 6 Edge Functions (4 for customers, `admin-users` and `edit-order` for staff) | Super Admins on dev: Arslan and Sufyan. Edge Function secrets: `TURNSTILE_SECRET_KEY`, `ALLOWED_ORIGINS` (Render URL, localhost:5173, 127.0.0.1:5173) |
| Supabase production | Not created yet (Milestone 4) | |
| Supabase organisation | "Shan-e-Lahore" (free plan), holds the dev project | Members (16 Oct): Arslan, Sufyan (joined); Hadi, Talha, Umair (invited). All five are Owners for now; recommended: Arslan and Sufyan Owners, the rest Developers (README "Joining the team"). MFA is off for every member; each should switch it on |
| Cloudflare Turnstile | Widget "Shan-e-Lahore", site key `0x4AAAAAAFUjrlxajrhVCE3G`; hostnames `localhost` and `shan-e-lahore.onrender.com` | Arslan's Cloudflare account. The secret key is set in Supabase Auth (Attack Protection) and as the `TURNSTILE_SECRET_KEY` function secret |
| Domain | Not bought yet | Restaurant |

## Data in the dev project

- Real: menu (106 dishes, from the printed menu of 2026-08-29), branch address, phone and map pin (31.523689, 74.344498), opening hours: the restaurant's real hours since 25 Oct are 04:00 to 03:00 every day (the hour in between is the switch from the main menu to nashta). The seed has them; **the hosted dev project still has 05:00 to 23:00 until a Super Admin changes Settings > Opening hours** (or a deployer runs the SQL below).
- Real delivery charges (restaurant, 25 Oct): Rs 70 up to 1 km, then Rs 30 more for each started km (2 km Rs 100, 3 km Rs 130), delivering in the whole of Lahore. Stored as 45 tiers (1 to 45 km by road, about 35 km in a straight line with the 1.3 road factor). The seed has them; **the hosted dev project still has the old 3/5/7 km placeholder tiers** until a deployer runs the SQL below in the dashboard SQL editor (typing 45 tiers in Delivery is possible but slow). Road factor 1.3. Minimum order is Rs 600 (set on 18 Oct in the Supabase dashboard, so the change log has no name; kept by the team on 19 Oct). The local seed still has no minimum. Change settings from the admin panel (Delivery), not the dashboard, so the log records who did it.

  ```sql
  -- Hosted dev project only, run once in Dashboard > SQL editor. Replaces the delivery tiers and hours of the active branch.
  begin;
  delete from public.delivery_tiers where branch_id = (select id from public.branches where is_active limit 1);
  insert into public.delivery_tiers (branch_id, upper_km, charge)
  select (select id from public.branches where is_active limit 1), km, 70 + 30 * (km - 1) from generate_series(1, 45) km;
  update public.opening_hours set open_time = '04:00', close_time = '03:00', is_closed = false
  where branch_id = (select id from public.branches where is_active limit 1);
  commit;
  ```
- Empty: payment accounts, WhatsApp number, riders, discount codes, banners, photos. While payment accounts are empty, the tracking page and the WhatsApp messages say the details come on the confirmation call. With no riders, orders can't be sent out for delivery on dev until someone adds riders in Settings > Riders. The local seed has two placeholder riders.

## Known gaps and risks

- **Redeploy all six Edge Functions after this merges** (Arslan or Sufyan): zod was raised to 4.6.6 on 25 Oct for a high security advisory, and the hosted functions keep the old zod until redeployed. vitest goes to 5.0.5 (moderate advisory, tests only) once it is 14 days old on 29 Oct. See `docs/decisions.md`.
- Ten days for Milestones 3 and 4 is tight. Anything not ready by 21 October is listed here and decided with the team, not dropped silently.
- All Urdu so far was written by Claude (except dish names, which are the restaurant's own) and needs review, including the customer WhatsApp messages (`whatsapp.*` in `src/i18n/ur.json`).
- New-order alerts work only while the Live orders page is open and on a device that is awake; a locked phone never rings (no web push). See README "Setting up the order station".
- Realtime sends anonymous subscribers an empty "401" notice when an order changes (no order data). Accepted, see `docs/decisions.md`.
- On dev, placing and editing an order haven't been tried yet (it was after closing time); everything else in Milestone 3 was checked on dev with a real login.
- Leaving a map makes the browser log 8 blocked `img-src data:` requests: Leaflet swaps unfinished tiles for a blank data image. Harmless; the CSP is not loosened for it.
- Upload menu photos from Chrome or Edge: Safari can't make WebP files, so its uploads are larger PNGs (they still display).
- The staff screens are English only, and the dish pop-up used when editing an order follows the language last chosen on the customer site.
- Redesign (19 Oct) page weight: the hero video is 2.9 MB and downloads in full on every home visit (autoplay ignores `preload`); compress it to under 1 MB before launch. English pages now also load the Urdu font (about 156 KB) for the Urdu page names, and the skyline sketch is a 288 KB SVG (about 53 KB compressed).
- The redesign added the Urdu words "ہوم" (`nav.home`) and "کارٹ دیکھیں" (`cart.viewCart`); they need the Urdu review with the rest.
- Open review points on the redesign (21 Oct), not fixed yet: dish cards without a photo show a large empty arch, making the menu much longer on phones; the sticky top bar is two rows plus the border on phones; the video autoplays on phones (team to choose: tap-to-play on phones, skip on data-saver, or load after the page); the admin Home banner now sits below the hero (needs Arslan's decision); the unused `@supabase/ssr` package is still in `package.json`; staff screens share the colours but not yet the fonts.
- The folk-art border comes from an image the team supplied; confirm the restaurant may use it.
- Local Supabase on Windows: start it with `supabase start -x logflare,vector` (the analytics container fails health checks on Windows); see README.
