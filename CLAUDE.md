# Shan-e-Lahore — Online Ordering Website

Read this file fully at the start of every session.

The detailed feature specification is `docs/spec.md`. **The spec is the source of truth for features.** This file is the source of truth for stack, security and engineering rules. If they disagree, point out the conflict and ask. If something is unclear or missing in both, ask before guessing. Never invent requirements.

---

## 0. Non-negotiables

1. **Security first.** This site handles customers' names, phone numbers, home addresses and payment confirmations. Treat every input as hostile, every table as private until a policy says otherwise, and the browser as untrusted.
2. **No AI slop.** Minimal, readable code a student team can maintain. No speculative features, no filler, no generic-looking UI (section 14).
3. **Honesty.** Never claim something works without running it. If a test was skipped, a check wasn't done, or something is a shortcut, say so explicitly at the end of the reply. If a requirement or decision in this file looks wrong, insecure or wasteful, say so plainly and propose the alternative before building it.
4. **Free and open source by default.** No paid service, paid API or SMS provider without asking first.
5. **Verify, don't recall.** Supabase and the libraries below change often. Check current docs or `--help` before using a CLI command, config option or API you are not certain about. Never guess CLI commands.

---

## 1. Project summary

Shan-e-Lahore is a desi food restaurant in Lahore, Pakistan. We are building its delivery-only ordering website from scratch:

- Customers browse the menu (English and Urdu), order as guests (no customer accounts at launch), and pay cash on delivery or by bank / JazzCash / Easypaisa transfer.
- Every order is confirmed by a staff member over a phone call before it goes to the kitchen. Transfer payments are verified manually by staff (customer sends a screenshot on WhatsApp; staff check the money actually arrived and record the transaction ID).
- Delivery charge is calculated from distance in km between the branch and the customer's map pin, using km tiers the Super Admin can change at any time.
- The restaurant has its own riders. Staff assign a rider to each order. No rider login at launch.
- One branch at launch, but **every branch-specific record carries a `branch_id` from day one**.

### Team and constraints

- Built by a small team of CS students. No external hires. Code must be understandable by them after launch.
- Free tiers during development (Supabase free, Render free static site). See section 13 for the honest production recommendation.
- Launch target: **Friday 23 October 2026** (moved forward from 9 November on 13 October). Day-by-day plan and open items: `docs/status.md`.

---

## 2. Tech stack

| Layer | Choice | Why |
| --- | --- | --- |
| Language | TypeScript, `strict: true` | Catches bugs early |
| Frontend | React 19 + Vite + React Router | Static output, free hosting |
| Server state | TanStack Query | Caching, retries, loading states without hand-rolled code |
| Forms | react-hook-form + zod | One schema validates client and server |
| Styling | Tailwind CSS with design tokens (section 14) | Small CSS, RTL-friendly logical utilities |
| Admin panel | Same React app under `/admin`, built with the same components. **No admin framework.** | The admin is ~8 screens with nested menu forms; a framework adds abstraction the team must learn and saves little here |
| Database | Supabase Postgres | RLS, free tier |
| Auth | Supabase Auth (section 5), staff and admin only | Free, with CAPTCHA support |
| Bot protection | Cloudflare Turnstile (free) on staff/admin login and checkout | Stops scripted fake orders and brute force |
| Storage | Supabase Storage | Menu photos, banners |
| Live updates | Supabase Realtime | New-order alerts |
| Server logic | Supabase Edge Functions (Deno) | Anything involving money, pricing, status rules or rate limits |
| Maps | Leaflet + react-leaflet + OpenStreetMap tiles | Free, no billing account |
| i18n | react-i18next; `en` and `ur` (RTL) | |
| Image compression | browser-image-compression | Keeps storage and bandwidth inside free limits |
| Spreadsheet export | CSV (UTF-8 with BOM so Excel shows Urdu), no dependency | npm SheetJS has unpatched high advisories |
| Tests | Vitest (frontend logic), Deno test (Edge Function shared logic), pgTAP via `supabase test db` (RLS) | |
| CI | GitHub Actions: typecheck, lint, tests, `supabase db lint`, `npm audit --audit-level=high` | Free |
| Dependency updates | Dependabot | Free |
| Hosting | Render **static site** (does not sleep). Never a free Render web service (sleeps when idle). | |
| Migrations | Supabase CLI, committed in `supabase/migrations/` | |

Note: React Native is for mobile apps. This is a **web** app in React. A future rider or customer mobile app can reuse the same Supabase backend.

**Dependency rule:** before adding any package, check whether the platform, an existing dependency or a few lines of code already do it. Pin exact versions in `package.json`, commit the lockfile, and do not add packages published or updated in the last 14 days. Prefer packages with active maintenance and a large user base. Ask before adding anything large.

---

## 3. Repository structure

Planned layout; folders marked *(Milestone N)* don't exist yet. The detailed map of existing files is in `README.md` (Code map).

```
/
├─ CLAUDE.md
├─ README.md                 # setup, env vars, environments, Edge Functions, deploy, code map, launch checklist
├─ .env.example              # names only, never real values
├─ render.yaml               # static site config, SPA rewrite, security headers (CSP), public VITE_ values
├─ .github/                  # CI workflows (ci.yml, database.yml) and dependabot.yml
├─ .claude/skills/           # design-taste-frontend (reviewed copy; CLAUDE.md wins on conflicts)
├─ docs/
│  ├─ spec.md                # feature specification
│  ├─ decisions.md           # short log of decisions and why (one line each)
│  └─ status.md              # milestone checklists, plan, open items, hosted setup; updated every push
├─ src/
│  ├─ app/                   # routing, layouts, useBranch (branch, hours, tiers)
│  ├─ assets/                # images bundled with the site (menu arches)
│  ├─ features/
│  │  ├─ home/  menu/  checkout/  tracking/
│  │  └─ admin/              # login, layout and one folder per section: orders, availability, menu, delivery, discounts, customers, reports, settings
│  ├─ components/            # shared UI built on the design tokens (Turnstile)
│  ├─ lib/                   # supabase client, whatsapp.ts, money.ts
│  ├─ i18n/                  # en.json, ur.json, typed keys
│  └─ types/                 # generated: supabase gen types
└─ supabase/
   ├─ migrations/            # schema, GRANTs, RLS, functions, triggers
   ├─ tests/                 # pgTAP RLS and rule tests
   ├─ functions/
   │  ├─ deno.json           # import map for local runs and shared tests; each function has its own for deploys
   │  ├─ _shared/            # pure, tested rules also imported by the website: pricing, delivery, discount, opening-hours,
   │  │                      # phone, schemas, order; plus server-only http, db, load, rate-limit, turnstile
   │  ├─ quote-order/  place-order/  get-order-by-token/  cancel-order-by-token/
   │  ├─ edit-order/         # staff change items or address on the call; server re-prices
   │  └─ admin-users/        # create staff, change role or active state, reset staff password; super_admin only
   └─ seed.sql               # dev data: the real printed menu plus placeholders; never real customer data
```

Don't create folders or files before they're needed.

---

## 4. User roles

Two logins (staff and admin). Customers order as guests and never log in.

| Role | Access |
| --- | --- |
| `super_admin` | Everything: menu, prices, delivery pricing, discount codes, reports, staff accounts, riders, settings, all branches |
| `order_staff` | Live orders for **their branch only**: confirm/cancel, log unanswered calls, verify payments, update statuses, assign riders, mark items/variants/add-on options sold out, pause delivery, edit items or address during the confirmation call, print kitchen tickets. **Cannot** change prices, menu structure, delivery pricing, discount codes, staff, or see reports. |
| `customer` | Not a customer login (there are none at launch). It is the no-access default role a new account gets until `super_admin` assigns `order_staff` or `super_admin`. |

- Role and `branch_id` live in a `profiles` table. **Users must never be able to change their own `role` or `branch_id`.** Enforce with column-level privileges or a trigger, and test it in pgTAP.
- **Never authorise from `user_metadata`** (users can edit it). Read role from `profiles` via the `SECURITY DEFINER` helpers `private.is_super_admin()` and `private.is_staff_of(branch_id)`, defined in the non-exposed `private` schema with `SET search_path = ''`.
- Public signup is off. Accounts are created only by `super_admin`: through the `admin-users` Edge Function, or Dashboard > Authentication > Add user for the first Super Admins (README). The new-user trigger creates a profile with the no-access role `customer`; `super_admin` then sets the role.
- Staff and admin log in with **email + password (minimum 12 characters) + Turnstile**. Every staff member has their own account, never a shared one. Deactivate leavers (`profiles.is_active = false`); inactive profiles get no access. No MFA at launch: risk accepted and recorded in `docs/decisions.md`.
- Email changes are blocked by a trigger on `auth.users`, which also blocks the admin API. To change a staff member's email, create a new account and deactivate the old one.
- Every status change, payment verification, pricing change and staff change records who did it and when.

---

## 5. Authentication

- **No customer accounts at launch.** Every order is a guest order: name, phone, address + landmark, required map pin, notes, payment method, Turnstile check. Customers follow their order through the tracking link (`/track/:token`). Nothing about the customer is stored on their device: localStorage keeps only the language choice and the cart (dish choices and quantities, never name, phone or address).
- **No SMS or OTP** (paid). The confirmation call replaces phone verification.
- Normalise Pakistani numbers to `92XXXXXXXXXX` (accept `03001234567`, `+92 300 1234567`, `3001234567`). `src/lib/phone.ts`, unit tested, and the same rule enforced server-side.
- **Staff and admin:** real email + password, minimum 12 characters. Turnstile CAPTCHA on login (set in Supabase Auth settings) plus Supabase's built-in login rate limits. Public signup off: `[auth] enable_signup = false`. Keep `[auth.email] enable_signup = true`: despite its name it switches email login itself, and turning it off locks everyone out. Email confirmation off.
- **No email sending at launch.** Supabase's built-in email only reaches members of the Supabase organisation, and there is no custom SMTP (a new external service, needs the real domain; ask first). So `super_admin` resets staff passwords through `admin-users`, there are always at least **two** `super_admin` accounts (owner + one developer) so either can reset the other, and the README documents a last-resort dashboard recovery.
- Session handling: use the Supabase client defaults; never store tokens anywhere custom; sign out clears the TanStack Query cache.
- Phase 2 note, if customer accounts are added: a guest's past orders should become visible to a new account only after staff confirm an order placed from it (the call proves the phone; otherwise anyone could sign up with someone else's number and read their addresses).

---

## 6. Data model

Design in SQL migrations. `uuid` primary keys, `created_at`/`updated_at`, `branch_id` where noted. Money is **integer rupees**. Times stored UTC; business logic uses `Asia/Karachi`. Use `CHECK` constraints and `NOT NULL` for invariants (prices ≥ 0, `min_select <= max_select`, valid km values) so the database rejects bad data even if app code is wrong.

**Bilingual text:** customer-visible text has `_en` and `_ur` columns. Empty Urdu falls back to English.

**Branches:** every menu row (categories, items, variants, add-on groups and options, links, deal contents, banners) and every discount code carries `branch_id`; composite foreign keys keep a child in its parent's branch.

Tables (columns indicative):

- `branches` — name_en/ur, address_en/ur, phone, lat, lng, order_prefix, last_order_number, is_active
- `branch_settings` — branch_id, delivery_enabled, min_order_amount, free_delivery_threshold (nullable), road_distance_factor (default 1.3), payment account details (bank, JazzCash, Easypaisa), whatsapp_number, estimated_delivery_minutes
- `delivery_tiers` — branch_id, upper_km, charge. Highest upper_km = max delivery radius.
- `opening_hours` — branch_id, weekday, open_time, close_time, is_closed. **Must support closing after midnight** (e.g. 12:00–02:00).
- `audit_log` — table, row, old and new values, who, when. Written by trigger on prices, delivery settings, opening hours, discount codes and profiles
- `profiles` — user_id, role, branch_id, full_name, is_active
- `customers` — normalised phone (unique), name, is_blocked. One row per guest phone, for blocking and reports
- `riders` — branch_id, name, phone, is_active
- `categories` — branch_id, name_en/ur, sort_order, is_active
- `items` — category_id, name_en/ur, description_en/ur, base_price, image_path, is_available, is_hidden, is_deal, is_featured, sort_order
- `item_variants` — item_id, name_en/ur, price, is_available, sort_order
- `addon_groups` — name_en/ur, min_select, max_select (required when min_select ≥ 1)
- `addon_options` — group_id, name_en/ur, extra_price, is_available
- `item_addon_groups` — item_id, group_id, sort_order
- `deal_items` — deal item_id, contained item/variant, quantity. **Deals are fixed bundles only.**
- `banners` — image_path, title_en/ur, sort_order, is_active
- `discount_codes` — code, type (percent | fixed), value, min_order, starts_at, ends_at, usage_limit, one_per_phone, first_order_only, is_active. Usage is counted from non-cancelled orders, not stored
- `orders` — branch_id, order_number (sequential per branch, e.g. `SL-1042`), tracking_token (≥ 32 random bytes, URL-safe; stored as-is so staff can send the link, readable only by branch staff), customer_id, name/phone snapshot, address_text, landmark, lat, lng, distance_km, order_type (`delivery`), status, payment_method, payment_status, transaction_id, payment_verified_by, payment_verified_at, subtotal, delivery_charge, discount_amount, total, discount_code_id, language, notes, rider_id, confirmed_by, cancel_reason, per-status timestamps
- `order_items` — **snapshot** of names and unit price, quantity, line_total
- `order_item_addons` — snapshot name and price
- `call_attempts` — order_id, staff_id, created_at (each row is one unanswered call)
- `order_status_log` — order_id, from_status, to_status, changed_by, note, created_at
- `rate_limits` — key (hashed IP or phone + action), window_start, count

**Enums:** `order_status` (`pending_confirmation`, `confirmed`, `preparing`, `out_for_delivery`, `delivered`, `cancelled`), `payment_method` (`cod`, `bank_transfer`, `jazzcash`, `easypaisa`), `payment_status` (`unpaid`, `paid`, `refund_due`, `refunded`), `cancel_reason` (`customer_request`, `unreachable`, `unpaid_transfer`, `out_of_stock`, `other`).

---

## 7. Database security (Supabase)

- **Explicit GRANTs are required.** New Supabase projects no longer expose `public` tables to the Data API automatically. Every migration that creates a table must, in the same file: create the table, `GRANT` only the privileges each role actually needs, `ENABLE ROW LEVEL SECURITY`, and add policies. Check current Supabase docs for this behaviour.
- **RLS on every table**, no exceptions. Default is no access. `anon` gets `SELECT` only on public menu data (active categories, visible items, variants, add-ons, banners, opening hours, delivery tiers) and nothing else.
- Browsers never `INSERT` into `orders` directly. Orders are created only by the `place-order` Edge Function.
- No open `SELECT` on `orders`. The tracking page uses `get-order-by-token`, which returns a minimal, masked payload (first name, masked phone, items, totals, status, payment instructions).
- Views must use `security_invoker = true`. `SECURITY DEFINER` functions must set `search_path = ''`, live in a non-exposed schema where possible, and check the caller's role inside.
- Realtime: staff subscriptions must be filtered by branch and protected by RLS; test that anon and non-staff users cannot receive orders.
- Storage: `menu-images` bucket is public-read; only `super_admin` can write. Set the bucket's allowed MIME types (`image/webp`, `image/jpeg`, `image/png`) and a file size limit (1 MB). No SVG uploads.
- The `service_role` key exists only in Edge Function secrets. Never in frontend code, `.env` files committed to git, logs or prompts.
- Run Supabase **Security Advisor** and `supabase db lint` after every migration and fix every warning or explain why not.
- **pgTAP tests** in `supabase/tests/` prove, for every table: what `anon`, a logged-in user with no role, staff of the same and another branch, deactivated staff and `super_admin` can and cannot read and write. These tests are required, not optional.
- Never run the Supabase MCP server or any agent tooling against the production project. Development project only.

---

## 8. Application security

- **Server recalculates everything.** Prices, delivery charge, discounts and totals are computed in Edge Functions from database values. Ignore any price sent by the browser.
- **Validate every Edge Function input with zod.** Reject unknown fields. Limit string lengths (name 60, address 300, notes 300). Validate lat/lng ranges and phone format.
- **Rate limiting** in `_shared/rate-limit.ts` using the `rate_limits` table: e.g. `place-order` max 3 per phone per 10 minutes and 10 per IP per hour; `quote-order` and token lookups also limited. Return 429 with a translatable error code.
- **Turnstile** token verified server-side in `place-order` (secret in function secrets).
- **Blocked numbers:** `customers.is_blocked` (set by `super_admin`) stops ordering.
- **CORS:** Edge Functions allow only our site's origins (production domain, Render URL, localhost in dev). No `*`.
- **XSS:** never use `dangerouslySetInnerHTML`. All menu text and customer notes render as plain text. Encode every value put into `wa.me` and `tel:` links.
- **Security headers** in `render.yaml` for all routes: `Content-Security-Policy` (allow only self, our Supabase URL, OpenStreetMap tiles, Turnstile; fonts are self-hosted; no `unsafe-eval`), `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` (geolocation=self only, camera/microphone off), `frame-ancestors 'none'`. Test the CSP in production build; don't loosen it to make errors go away without saying so.
- **Error handling:** return error codes, never stack traces or SQL errors, to the browser. Log server-side without full phone numbers or addresses.
- **Privacy:** collect only what the spec needs. Tracking pages show masked data. Staff see only their branch.
- **Secrets hygiene:** `.env` in `.gitignore`; add a pre-commit secret scan (gitleaks, open source) and run it in CI.

---

## 9. Business rules (server-side, pure functions in `_shared/`, unit tested)

### Delivery charge

1. Haversine distance from branch lat/lng to customer pin.
2. Multiply by `road_distance_factor`; round **up** to 0.1 km → `distance_km`.
3. First tier where `distance_km <= upper_km` gives the charge.
4. Beyond the highest tier → reject (`OUTSIDE_DELIVERY_AREA`).
5. Item subtotal ≥ `free_delivery_threshold` (if set) → charge 0.
6. Pricing changes affect new orders only. Log every change.

### `place-order` rejects when

Branch closed now (`Asia/Karachi`, past-midnight aware; **no scheduled orders**), delivery off, pin outside area, any item/variant/add-on unavailable or mismatched, add-on group rules broken, subtotal below minimum, discount invalid (expired, used up, one-per-phone, first-order-only), number blocked, rate limit hit, Turnstile failed.

Totals: subtotal = Σ (base or variant price + add-ons) × qty; discount never exceeds subtotal; total = subtotal − discount + delivery charge. **Prices are tax-inclusive. No tax line, no invoices.**

### Order lifecycle

```
pending_confirmation → confirmed → preparing → out_for_delivery → delivered
pending_confirmation → cancelled
confirmed / preparing → cancelled (staff only, with reason)
```

- Staff change status, payment and rider with direct updates, limited by RLS and column grants. Allowed transitions and payment rules are enforced in one place, the `orders` trigger, and every change is logged.
- Third unanswered call in `call_attempts` → auto-cancel with `unreachable`.
- Transfer orders cannot be confirmed until staff mark them paid with a transaction ID. **Unpaid at the call → cancelled** with `unpaid_transfer`.
- COD becomes `paid` when marked `delivered`.
- Cancelling a paid order → `refund_due`; staff mark `refunded` after sending it manually.
- Customers cancel online only while `pending_confirmation`.
- `out_for_delivery` requires an assigned rider.

---

## 10. Customer website

Mobile-first, fast on Pakistani mobile data, accessible (semantic HTML, labels, focus states, 4.5:1 contrast, works with keyboard).

- **Home:** banners, featured deals, popular items, delivery area map, opening hours, call and WhatsApp buttons, "Closed now, opens at …" when closed.
- **Menu:** sticky category bar, item cards (placeholder image if none), sold-out state, item modal enforcing variant and add-on rules.
- **Cart:** quantities, options, discount code, subtotal / delivery / total, minimum-order warning.
- **Checkout:** name, phone, **required map pin** ("use my location" or drag), address + landmark, notes, payment method. Distance and charge appear as soon as the pin is set (`quote-order`). Pins outside the radius blocked. Guest checkout only. Tell the customer the restaurant will call to confirm.
- **Tracking** (`/track/:token`): order number, status timeline, items, total; for transfer orders, account details and a "Send screenshot on WhatsApp" button; cancel while `pending_confirmation`.
- **Static pages:** about, contact, terms, privacy, refund policy.

**Bilingual:** switch on every page, remembered in localStorage and saved on the order. Urdu: `dir="rtl"` on `<html>`, Noto Nastaliq Urdu, larger line-height, logical CSS properties so layouts flip. No hard-coded UI strings. Western digits for prices and phones.

---

## 11. Admin panel (`/admin`)

Order Staff see only Live Orders, sold-out toggles and the delivery switch; Super Admin sees everything.

- **Live Orders:** Realtime list for the staff member's branch; sound alert + browser notification (requires the staff device to keep the tab open; document this); status filters; tap-to-call; call-attempt button (third auto-cancels); verify payment with transaction ID; confirm/cancel with reason; status buttons; rider assignment; WhatsApp buttons; kitchen ticket print view (80 mm thermal CSS; printing goes through the browser print dialog); refund-due list.
- **Menu:** categories, items, variants, add-on groups, fixed deals, photos, banners, ordering, sold-out and hide switches; English and Urdu fields side by side. **Menu changes never need code changes.**
- **Photo upload:** compress in browser to ≤ 1200 px WebP before upload; server-side bucket limits still apply.
- **Delivery:** branch location on map, km tiers, road factor, minimum order, free-delivery threshold, delivery switch (Order Staff may use this switch too), change log.
- **Discount codes, Customers** (with block switch), **Reports** (sales by period, status and cancel reasons, payment method, top items, distance tier, discount usage; CSV export (opens in Excel); `super_admin` only), **Settings** (restaurant info, opening hours, payment accounts, WhatsApp number, staff accounts, riders, staff password reset).

---

## 12. WhatsApp (no paid API)

Prefilled `https://wa.me/<number>?text=<encoded>` links that staff send from the WhatsApp Business app. Builders in `src/lib/whatsapp.ts`, English and Urdu by the order's language: order received (+ payment instructions for transfers), confirmed, out for delivery (rider name/phone), cancelled (reason, refund note), and to the rider (order number, customer name/phone, address, landmark, amount to collect, `https://maps.google.com/?q=<lat>,<lng>`). Customer messages include the tracking link.

---

## 13. Free tier: honest limits

- Supabase free projects **have no automatic backups** and pause after about a week with too little database activity. Development can stay free. **For production with real orders, recommend the client pays for Supabase Pro** (daily backups, no pausing). Until then: a GitHub Actions workflow runs a daily `supabase db dump`, **encrypts it** (e.g. `age`, open source) and stores it outside the repo; document restore steps and test a restore once before launch.
- Storage is limited: compress every image.
- OpenStreetMap's public tile servers allow light use with attribution and a valid referrer. Show the attribution. If traffic grows, move to a tile provider's free tier.

---

## 14. No AI slop

**Code**
- Write the least code that correctly does the job. Reuse what exists before adding anything. Use platform features first (native inputs, CSS, database constraints).
- No speculative abstractions, wrappers, generic "service" layers, factories or config for things that have one use.
- No dead code, commented-out code, unused exports, placeholder `TODO`s presented as done, or mock data in production paths.
- Comments explain *why*, never restate *what*. No banner comments, no emoji in code or commits.
- Names are specific (`deliveryChargeForDistance`, not `calculate` or `handleData`).
- Business logic lives in pure, tested functions, not in components.
- Never cut: input validation, error handling, security, accessibility, tests for money and permissions.

**Design**
- A distinctive, warm identity grounded in Lahori food culture, from the restaurant's real logo and colours. Define design tokens (colours, type scale, spacing, radius) once and use only those.
- Avoid the generic AI look: no purple/blue gradients, glassmorphism, gradient text, emoji as icons, stock "hero with blurred blob" layouts, random drop shadows, or ten different border radii.
- Real food photography is the hero. Typography and spacing do the rest. One icon set (e.g. Lucide), used sparingly.
- Every state is designed: loading, empty, error, sold out, closed, outside delivery area.

**Copy**
- Plain, specific, short. No marketing filler ("Embark on a culinary journey", "Experience the magic"). Real dish names, real prices, real hours.
- Urdu copy is written by a person, not machine-translated and shipped unchecked. Flag any Urdu you generated as needing human review.

---

## 15. Milestones

One milestone at a time. Before coding: a short plan and questions. After: what was built, how to test it, what was **not** done or checked, known risks. Then stop for review.

1. **Foundation:** Vite + React + TS + Tailwind + Router + i18n with RTL; design tokens; Supabase project link; full schema with GRANTs, RLS, helper functions, triggers and constraints; pgTAP RLS tests; generated types; dev seed with placeholder menu; auth (staff/admin email + password, roles, Turnstile; public signup off); route protection; CI; `render.yaml` with SPA rewrite and security headers; deploy.
2. **Customer ordering:** home, menu, item modal, cart, checkout with map pin; `_shared` pricing/distance/opening-hours/rate-limit logic with tests; `quote-order`, `place-order`, `get-order-by-token`, `cancel-order-by-token`; guest flow in both languages.
3. **Admin and order handling:** Live Orders with Realtime, call attempts, payment verification, transitions, riders, WhatsApp links, kitchen ticket; menu management with uploads; delivery settings; discounts; customers; reports; settings and staff management; staff password reset.
4. **Hardening and launch:** end-to-end test of every path (COD; each transfer method; unpaid transfer; three missed calls; customer cancel; out of radius; closed hours including past midnight; sold-out item; invalid discount; rate limit; blocked number); full RLS and Security Advisor pass; CSP check; mobile, RTL and accessibility review; Lighthouse; backup and **tested restore**; README; placeholder content removed; domain connected.

---

## 16. Working agreement

- Plan first, then code. Small, focused commits with clear messages.
- Commit locally in small steps, but **never push to GitHub, open a pull request, or deploy without asking first**, every time. Approval for one push does not cover the next.
- Run typecheck, lint and tests before saying something is done. Paste the result summary.
- Keep `.env.example`, `README.md`, `docs/decisions.md` and migrations current.
- **Before every push, update `docs/status.md`:** tick finished checklist items, add new tasks, update what is waiting on the restaurant, the hosted setup table (services, secrets by name only, who owns what) and the dev data notes. Several developers and their AI assistants work on this repo; `docs/status.md` is how they know where things stand. Personal assistant memory is not shared, so anything others need goes in the repo.
- Hosted changes (migrations pushed, functions deployed, secrets set, dashboard settings) are recorded in `docs/status.md` in the same push.
- Every reply that changes code ends with: what changed, what was tested, what was not tested, and any risk or shortcut.
- If you think a decision here is wrong, say so directly with the reason and the better option. Don't silently work around it.

## 17. Explicitly out of scope

Payment gateways and cards; SMS/OTP; WhatsApp Business API; scheduled orders, takeaway, dine-in; rider login or app; tax lines, invoices, FBR/PRA integration; multi-branch selection on the customer site (but keep `branch_id`); customer accounts (phase 2); any paid service. If a task seems to need one, stop and ask.