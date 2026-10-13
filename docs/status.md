# Project status

Updated with every push. Read with `CLAUDE.md` (rules), `docs/spec.md` (features), `docs/decisions.md` (why things are the way they are) and `README.md` (setup, environments, checks, launch checklist).

**Launch: Friday 23 October 2026.** Moved forward from 9 November by the team on 13 October.

## Where things stand (13 October, evening)

| Milestone | State |
| --- | --- |
| 1. Foundation | Done: schema, RLS and pgTAP tests, staff login with Turnstile, i18n (English/Urdu, RTL), design tokens, CI, Render deploy |
| 2. Customer ordering | Nearly done: home, menu, item dialog, cart, checkout with map pin, order tracking and cancel, four order Edge Functions with shared tested rules (26 Deno tests, 157 pgTAP tests). Left: dish photos on cards |
| 3. Admin and order handling | Not started |
| 4. Hardening and launch | Not started |

Live (dev data): https://shan-e-lahore.onrender.com, backed by the hosted dev Supabase project `shan-e-lahore-dev`. Checkout and tracking work on the live site: migration, Edge Functions and their secrets (`TURNSTILE_SECRET_KEY`, `ALLOWED_ORIGINS`) are on the dev project. Staff cannot see orders until the admin panel (Milestone 3).

## Plan to launch

| Days | Work |
| --- | --- |
| 13-14 Oct | Checkout back end: order numbering and atomic order creation (migration + pgTAP), shared distance/delivery, discount and rate-limit rules with tests, Edge Functions `quote-order`, `place-order`, `get-order-by-token`, `cancel-order-by-token` |
| 15 Oct | Checkout page with map pin, tracking page, delivery-area map on home, dish photos on cards (team's photos) |
| 16-19 Oct | Milestone 3: live orders with Realtime and sound, confirmation calls, payment verification, statuses, riders, WhatsApp links, kitchen ticket; menu management with photo upload; delivery settings; discounts; customers; reports; settings, staff and password reset |
| 20-21 Oct | Milestone 4: end-to-end test of every order path, RLS and Security Advisor pass, CSP, mobile/RTL/accessibility review, Lighthouse, backups and a tested restore, production project |
| 22 Oct | Real content entered in production (menu, photos, hours, delivery prices, payment accounts), Urdu fixes, domain |
| 23 Oct | Launch |

## Needed from the restaurant, by date

| By | What |
| --- | --- |
| 15 Oct | Dish photos (team is taking them) |
| 16 Oct | Delivery prices per km tier, minimum order, opening hours, bank/JazzCash/Easypaisa account details, WhatsApp number for screenshots, rider names and phones, staff names and emails |
| 18 Oct | Original logo file (SVG, AI, EPS or PDF) |
| 20 Oct | Urdu speaker to review all site text; decision and payment for Supabase Pro (production backups); domain name bought |
| 21 Oct | Terms, privacy and refund policy text in both languages |

## Known gaps and risks

- Ten days for Milestones 2-4 is tight. Anything not ready by 21 October is listed here and decided with the team, not dropped silently.
- All Urdu written so far was written by Claude and needs review.
- Placeholder data in dev: minimum order, delivery tiers, opening hours, payment accounts, WhatsApp number. The branch pin is real (31.523689, 74.344498).
- The Supabase client library is the biggest download on every page (about 115 KB compressed); review in the Milestone 4 speed pass.
