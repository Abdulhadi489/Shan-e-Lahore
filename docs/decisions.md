# Decisions

One line each: date, decision, why.

- 2026-10-11: React 19 instead of 18. react-leaflet 5 requires it and React 18 gets no new features.
- 2026-10-11: Self-host fonts (@fontsource) instead of Google Fonts. Faster, no visitor IPs sent to Google, smaller CSP.
- 2026-10-11: CSV export instead of SheetJS. The npm `xlsx` package has unpatched high-severity advisories that fail `npm audit`.
- 2026-10-11: Node 24 LTS, pinned via `.nvmrc` and `engines`.
- 2026-10-11: `.npmrc` sets `min-release-age=14` and `save-exact` so npm itself enforces the dependency rule.
- 2026-10-11: fsevents install script denied (`allowScripts`). It ships a prebuilt binary; the script only rebuilds it.
- 2026-10-11: Local Supabase uses `auto_expose_new_tables = false` to match new cloud projects; every table needs explicit GRANTs.
- 2026-10-11: gitleaks runs as a pre-commit hook via `core.hooksPath=.githooks`, set by `npm install` (`prepare` script).
- 2026-10-12: `docs/specs.md` renamed to `docs/spec.md` to match CLAUDE.md.
- 2026-10-12: Staff may edit items or the address during the confirmation call (Milestone 3, `edit-order` Edge Function re-prices server-side).
- 2026-10-12: Order Staff may pause delivery (`branch_settings.delivery_enabled` only; a trigger blocks other columns).
- 2026-10-12: Guest orders become visible to an account only after staff confirm an order from that account. No SMS means signup does not prove phone ownership. **Superseded 2026-10-12:** no customer accounts at launch; kept as the phase 2 design.
- 2026-10-12: Tracking tokens stored as-is, not hashed. Staff need the link for WhatsApp messages; a hash adds nothing once the database itself is exposed.
- 2026-10-12: Status, payment and call rules live in the `orders` and `call_attempts` triggers only. The three staff Edge Functions are dropped: one copy of the rules cannot drift.
- 2026-10-12: Synthetic signup email is `<phone>@phone.invalid` (reserved TLD, never deliverable, independent of the domain we buy later). Email changes are blocked by a trigger on `auth.users`. **Superseded 2026-10-12:** staff log in with real emails; no phone logins.
- 2026-10-12: One `audit_log` table filled by a trigger replaces `pricing_change_log`; it also covers staff role changes and opening hours.
- 2026-10-12: Every menu row and discount code carries `branch_id`, with composite foreign keys so a child stays in its parent's branch.
- 2026-10-12: Dropped redundant columns: `addon_groups.is_required` (= min_select >= 1), `call_attempts.outcome` (a row is a missed call), `profiles.phone`. Discount usage is counted from orders, not stored.
- 2026-10-12: Added `items.is_featured` for the home page's featured deals and popular items, chosen by the Super Admin.
- 2026-10-12: Default privileges revoked for postgres-created objects, including EXECUTE on new functions from PUBLIC. Anything new needs an explicit GRANT.
- 2026-10-12: Customer and rider phones must be mobiles (`^923\d{9}$`) because they receive WhatsApp messages; branch phones also allow landlines and UAN numbers.
- 2026-10-12: Dev project `shan-e-lahore-dev` (Mumbai) created and linked. Migrations applied; email confirmation off, 8-character passwords, Turnstile CAPTCHA on (secret set in the dashboard only, never in git). Local email-OTP settings matched to the hosted defaults so `config push` changes only what we intend. **Partly superseded 2026-10-12:** passwords are now at least 12 characters and public signup is off.
- 2026-10-12: **No customer accounts at launch; guest checkout only** (approved by the client). Customers never sign up or log in; they follow orders through the tracking link. No "remember me on this device": nothing about the customer is stored on their phone except the language choice. Why: without free one-time codes (no SMS) customer login would mean phone + password with resets done by the owner over the phone (workload and social-engineering risk); anyone could squat someone else's number; a public signup endpoint is an attack surface; it saves about 4-5 days of the 4-week plan; customers here are used to guest checkout (for example Goga Naqibia's Shopify checkout). Customer accounts move to phase 2 if customers ask.
- 2026-10-12: **Staff and Super Admin log in with real email + password only; no MFA (no authenticator app).** Why: keep the project simple for an unpaid student team. **Risk accepted by the team:** these accounts can read customers' names, phones and home addresses, and the login page is public, so a leaked or guessed password exposes that data. Mitigations: minimum 12-character passwords, Turnstile on login, Supabase's built-in login rate limits, individual accounts (never shared), leavers deactivated. Supabase MFA is free and can be switched on later in about half a day.
- 2026-10-12: Public signup off (`[auth] enable_signup = false`). `[auth.email] enable_signup` stays `true` because it switches email login itself (supabase/cli#7055: turning it off locks everyone out). Accounts are created only by `super_admin`.
- 2026-10-12: No email sending at launch (Supabase's built-in email only reaches organisation members; custom SMTP would be a new service needing the real domain). `super_admin` resets staff passwords through `admin-users`; there are always at least two `super_admin` accounts; README has a last-resort dashboard recovery.
- 2026-10-12: `admin-users` scope is exactly: create staff, deactivate staff, reset staff password.
- 2026-10-12: The trigger blocking email changes on `auth.users` stays. It also blocks the admin API, so changing a staff email means creating a new account and deactivating the old one. Keeps the audit trail tied to one identity per account.
- 2026-10-12: Removed the customer-account pieces from the database (the `addresses` table, `customers.user_id`, `phone_verified_at`, `preferred_language`, `orders.user_id`, `private.current_customer_id()`, customers-read-own policies, phone verification on confirm). No dead code and a smaller attack surface; phase 2 can restore them from git history. The `customers` table stays: one row per guest phone, for blocking and reports.
- 2026-10-12: New users get the no-access role `customer` from the trigger; their display name falls back to the part of the email before "@" so Dashboard > Add user works without metadata.
