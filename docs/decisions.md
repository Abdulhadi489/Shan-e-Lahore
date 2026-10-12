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
- 2026-10-12: Guest orders become visible to an account only after staff confirm an order from that account. No SMS means signup does not prove phone ownership.
- 2026-10-12: Tracking tokens stored as-is, not hashed. Staff need the link for WhatsApp messages; a hash adds nothing once the database itself is exposed.
- 2026-10-12: Status, payment and call rules live in the `orders` and `call_attempts` triggers only. The three staff Edge Functions are dropped: one copy of the rules cannot drift.
- 2026-10-12: Synthetic signup email is `<phone>@phone.invalid` (reserved TLD, never deliverable, independent of the domain we buy later). Email changes are blocked by a trigger on `auth.users`.
- 2026-10-12: One `audit_log` table filled by a trigger replaces `pricing_change_log`; it also covers staff role changes and opening hours.
- 2026-10-12: Every menu row and discount code carries `branch_id`, with composite foreign keys so a child stays in its parent's branch.
- 2026-10-12: Dropped redundant columns: `addon_groups.is_required` (= min_select >= 1), `call_attempts.outcome` (a row is a missed call), `profiles.phone`. Discount usage is counted from orders, not stored.
- 2026-10-12: Added `items.is_featured` for the home page's featured deals and popular items, chosen by the Super Admin.
- 2026-10-12: Default privileges revoked for postgres-created objects, including EXECUTE on new functions from PUBLIC. Anything new needs an explicit GRANT.
- 2026-10-12: Customer and rider phones must be mobiles (`^923\d{9}$`) because they receive WhatsApp messages; branch phones also allow landlines and UAN numbers.
