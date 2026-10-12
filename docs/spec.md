# Shan-e-Lahore Website — Feature Specification

Oct 11, 2026 · @Someone

## Project overview

Shan-e-Lahore gets a delivery-only ordering website for one branch, built so more branches can be added later without rework, with launch targeted about one month from kickoff. Customers browse the menu, order as a guest or with an account, and pay by cash on delivery or by bank, JazzCash or Easypaisa transfer. A staff member calls every customer to confirm the order before the kitchen starts.

Decisions agreed so far:

- **Order types:** delivery only, ordered for right now; no orders scheduled for later, and ordering closes outside opening hours. Every order still stores an order type so takeaway can be added later.
- **Branches:** one now, more later; every order, delivery setting, staff account, rider and menu availability record belongs to a branch from day one.
- **Languages:** the full website in English and Urdu, with a language switch on every page.
- **Delivery coverage:** a delivery radius around the branch, measured from the customer's map pin, with the delivery charge set by kilometre tiers that the Super Admin can change at any time.
- **Delivery fleet:** the restaurant's own riders; staff assign a rider to each order, and no rider login is built at launch.
- **Payments:** cash on delivery, or bank, JazzCash or Easypaisa transfer, all verified manually by staff on WhatsApp during the confirmation call. No payment gateway and no card payments are planned.
- **Confirmation:** every order is confirmed by a phone call before it goes to the kitchen; after three unanswered calls, or if a transfer order is still unpaid at the call, the order is cancelled.
- **Menu:** fully managed by the Super Admin from the admin panel, including photos; deals are fixed bundles.
- **Tax and billing:** menu prices include tax, so no tax line is added at checkout; billing and invoicing stay manual, outside the website.
- **Team and hosting:** built entirely by the in-house student team on free tiers (Supabase, Render); the domain is bought closer to launch.

## User roles and permissions

The three logins are Super Admin, Order Staff and Customer. A separate developer login is not needed: the development team uses a Super Admin account for app settings and server access for everything technical. The person who calls customers to confirm orders becomes the Order Staff role, which is the third login the client actually needs.

| Role | Who | Can do | Cannot do |
| --- | --- | --- | --- |
| Super Admin | Restaurant owner, development team | Everything: menu, prices, delivery pricing, discount codes, reports, staff accounts, riders, settings, all branches | Nothing restricted |
| Order Staff | The person who calls customers, counter or kitchen staff | See incoming orders with a sound alert, call and confirm or cancel, verify bank, JazzCash and Easypaisa payments, move orders through statuses, assign riders, mark items sold out | Change prices, menu structure, delivery fees, discount codes; view sales reports |
| Customer | Anyone ordering | Browse, order as guest or with an account, save addresses, view order history, reorder, track an order | Anything in the admin panel |

Staff accounts are tied to a branch, so when a second branch opens its staff only see that branch's orders. Every status change records which staff member made it, so the owner can see who confirmed or cancelled each order.

Super Admin and Order Staff logins require a second step from an authenticator app (free), because these accounts can see customer phone numbers and addresses. Customers who forget their password call the restaurant, and the Super Admin resets it from the admin panel after confirming the caller's number.

## Customer-facing website

The customer site is mobile-first, because most Lahore food orders come from phones, and needs seven pages at launch.

| Page | What it does |
| --- | --- |
| Home | Hero banner, featured deals, popular items, delivery radius shown on a map, opening hours, call and WhatsApp buttons |
| Menu | Categories with a sticky category bar, item cards with photo, price and a sold-out state; tapping an item opens its variant and add-on choices |
| Cart | Items with chosen options, quantity edits, discount code field, subtotal, delivery fee and total, minimum-order warning |
| Checkout | Name, phone, required map pin ("use my location" or drag the pin), full address and landmark, delivery notes, payment method; delivery charge calculated from the distance in km; pins outside the radius blocked; guest checkout with an optional "create account" box |
| Order placed and tracking | Order number, payment instructions with account numbers and a "send screenshot on WhatsApp" button for transfer orders, status timeline (awaiting call, confirmed, preparing, out for delivery, delivered), restaurant phone number; reachable by link without logging in |
| Account | Login with phone and password, saved addresses, order history, one-tap reorder |
| Static pages | About, contact with map, terms, privacy and refund policy |

The checkout page tells the customer up front that the restaurant will call to confirm the order. That sets expectations and reduces missed calls.

Every page has an English / اردو switch that remembers the customer's choice. Urdu pages use a Nastaliq font and a right-to-left layout, and dish names and descriptions show in the chosen language.

## Menu structure

The menu uses one flexible model that covers simple items, portion sizes, add-ons and deals without custom code per dish. This is the most complex part of the database, so it is designed first.

| Building block | What it is | Example |
| --- | --- | --- |
| Category | A menu section, with display order and an on/off switch | BBQ, Karahi, Handi, Breads, Drinks |
| Item | A dish with English and Urdu name and description, photo and base price | Chicken Karahi |
| Variant | A size or portion with its own price; an item has zero or more | Half / Full, ½ kg / 1 kg |
| Add-on group | A set of choices with rules: required or optional, minimum and maximum picks | "Choose bread: required, pick 1"; "Extras: optional, up to 5" |
| Add-on option | One choice inside a group, free or with an extra price | Extra raita (+Rs), Roghni naan (+Rs), Spice level: mild / medium / hot |
| Deal | A fixed bundle of items at one set price, with no choices | Family Deal: 1 kg karahi, 4 naan, 1.5 L drink |

Add-on groups are created once and attached to many items, so "Choose bread" is set up a single time. Order Staff can mark any item or single variant as sold out, which hides the add-to-cart button without deleting anything. Each order line saves the item name, chosen options and prices at the moment of ordering, so later price changes never alter old orders or reports.

Nothing on the menu is hard-coded. The site ships with an empty menu structure, and the Super Admin adds categories, dishes, prices, variants, add-ons, deals and photos from the admin panel; new dishes appear on the site immediately. Photos are uploaded through the panel and automatically resized and cropped to the card format, and any item without a photo shows a branded placeholder image. Empty categories are hidden, so the site never shows a blank section. Homepage banners and featured deals are managed the same way.

## Order flow and confirmation

Every order waits in "Awaiting call" until a staff member phones the customer and confirms it; only then does the kitchen ticket print. Each status change is logged with the staff member and time, and the dashboard prepares the matching WhatsApp message for staff to send.

&#91;embedded content: order flow · payment, confirmation call, delivery\]

Rules for the confirmation step:

- Bank, JazzCash and Easypaisa orders show "payment pending"; during the call, staff check the customer's WhatsApp screenshot against the account and mark the order paid before confirming. If the customer has not paid by the time of the call, the order is cancelled.
- On the call, staff confirm items, address and total, and can edit items or the address; the total recalculates automatically.
- Customers can cancel online only before confirmation; after that they call the restaurant.
- Staff log each unanswered call; after the third, the order is cancelled automatically and the customer gets a cancellation message.

## Delivery coverage

Coverage is a delivery radius around the branch. At checkout the customer drops a map pin or taps "use my location", the site measures the distance from the branch, and pins outside the radius cannot place an order.

Delivery charges depend on one measure only: the distance in kilometres from the branch to the customer's pin. The Super Admin sets the pricing and can change it at any time from the admin panel; changes apply to new orders only, and each order keeps the charge it was placed with. Settings per branch:

- Branch location, which distances are measured from
- Distance tiers, each an upper limit in km and a charge in rupees; the last tier's limit is the maximum delivery radius
- Road distance factor (see below)
- Minimum order amount, one value for all distances
- Free-delivery threshold, optional
- Delivery on/off switch, so staff can pause delivery during rain or a rush

Example tiers (placeholder prices, not actual rates):

| Distance from branch | Delivery charge |
| --- | --- |
| Up to 3 km | Rs 100 |
| 3 to 5 km | Rs 150 |
| 5 to 7 km | Rs 200 |
| Over 7 km | Outside delivery area |

Recommendations:

- **Use tiers rather than a pure per-km rate.** Tiers give round, predictable charges that can be listed on the website, while a per-km rate produces odd amounts like Rs 117. If the client prefers per-km, the same screen can offer a base charge for the first few km plus a rate per extra km, rounded to the nearest Rs 10.
- **Correct for road distance.** Distance is measured in a straight line, but riders drive further. A road distance factor (for example 1.3) multiplies the straight-line distance before the tier is picked; the Super Admin can tune it after a few weeks of real deliveries.
- **Show the charge early.** The checkout shows the distance and charge as soon as the pin is dropped, not only at the final step.
- **Log pricing changes.** Every change to tiers or the factor records who made it and when.

The map pin is required because typed Lahore addresses are often too informal to locate automatically; the customer still types the full address and a landmark for the rider. The map uses Leaflet with OpenStreetMap, which is free, and distance is measured as a straight line from the branch, also free. The road distance factor covers the gap between straight-line and driving distance.

Deliveries are made by the restaurant's own riders. The Super Admin keeps a rider list with names and phone numbers; when an order is ready, staff assign a rider, and one tap sends the rider the order details, address and map pin link on WhatsApp. The customer's "out for delivery" message includes the rider's name and phone. A rider login or app can be added in phase 2 on top of the same order statuses.

## Payments

Every payment is verified manually by staff, so no payment gateway is integrated at launch and no merchant approval can delay it. Customers choose cash on delivery or transfer to the restaurant's bank, JazzCash or Easypaisa account, then send the payment screenshot on WhatsApp.

| Method | Shown to the customer at checkout and on WhatsApp | How staff verify |
| --- | --- | --- |
| Cash on delivery | Amount to pay the rider | Order marked paid when delivered |
| Bank transfer | Account title, account number, IBAN | Match the screenshot against the bank app during the call |
| JazzCash | Account title and JazzCash number | Match the screenshot against the JazzCash app during the call |
| Easypaisa | Account title and Easypaisa number | Match the screenshot against the Easypaisa app during the call |

Staff must confirm the money actually arrived in the account, not just look at the screenshot, because edited screenshots are a common fraud. The person confirming orders therefore needs access to the bank and wallet apps, or their incoming-payment SMS alerts. Each order records the payment method, a transaction ID typed in by staff, and who verified it, so payments can be reconciled at day's end.

If a prepaid order is cancelled, the admin panel shows it as "refund due" and staff send the refund manually. Card payments are out of scope at launch; they would need a payment gateway and can be added in phase 2 if the client wants them.

## Notifications

Customers get a WhatsApp message at each order status, sent free from the WhatsApp Business app on the restaurant's dedicated number. The staff dashboard prepares each message, so staff send it with one tap instead of typing. Every message links to the order tracking page.

Messages at launch:

- Order received: order number, total, "we will call you shortly to confirm", tracking link; for transfer payments, the bank or wallet account details and a request to send the payment screenshot in this chat
- Order confirmed: estimated delivery time
- Out for delivery: rider name and phone
- Order cancelled: reason, and refund note for paid orders

Fully automatic messages through the WhatsApp Business API need Meta verification and are charged per conversation, so they are a phase 2 option, not a launch dependency. Staff get a sound alert and a browser notification on the dashboard for every new order, through Supabase Realtime, so they never depend on WhatsApp or email to notice orders.

One-time code verification at checkout is not needed, because the confirmation call already filters out fake orders. That saves cost and checkout friction.

## Admin panel

The admin panel has six modules; Order Staff see only the first, and Super Admin sees all six.

| Module | Features | Access |
| --- | --- | --- |
| Live orders | New-order alert, list by status, customer phone with tap-to-call, confirm or cancel with a reason, log unanswered calls (the third cancels the order), "mark paid" with transaction ID for transfers verified on the call, one-tap WhatsApp chat with the customer, status updates, assign a rider from the rider list, printable kitchen ticket | Staff, Admin |
| Menu | Categories, items, variants, add-on groups, deals, photo upload with auto-resize and placeholder image, homepage banners and featured deals, display order, sold-out and hide switches | Admin (sold-out: Staff too) |
| Delivery radius | Branch location, km tiers with charges, road distance factor, minimum order, free-delivery threshold, delivery on/off switch, pricing change log | Admin |
| Discount codes | Percentage or fixed amount, minimum order, start and end date, total usage limit, one use per phone number option, first-order-only option | Admin |
| Customers | List with phone, order count, total spend and last order date; full order history per customer; guest orders linked by phone number | Admin |
| Reports | Sales by day, week and month; orders by status, including cancellation rate; revenue by payment method; top-selling items; orders by distance tier; discount usage; export to Excel | Admin |

Settings (restaurant info, opening hours, bank, JazzCash and Easypaisa account details and the WhatsApp number for screenshots, staff accounts, rider list with names and phone numbers, customer password resets, blocked phone numbers) sit under Super Admin. Even though opening hours were not requested as a feature, the site should stop taking orders outside opening hours, or customers will order at 3 a.m. and nobody will call them.

## Tech stack and data model

The stack is React for the website and admin panel, Supabase for the database, logins, photo storage and live order alerts, and Render for hosting, all on free tiers until real orders justify paying. React talks to Supabase directly, so there is no separate always-on backend server to build, host or keep awake. React Native is for mobile apps, not websites; if a rider or customer app is built later, it can reuse the same Supabase backend unchanged.

| Layer | Choice | Notes |
| --- | --- | --- |
| Website and admin panel | React with Vite, one app with protected admin routes | Built as a static site |
| Admin screens | Same React app and shared components, plus Tailwind CSS; no admin framework | The admin is about eight screens with nested menu forms; plain React is less to learn and easier for the team to own |
| Database | Supabase Postgres | Row-level security rules decide what each role can read and write |
| Logins | Supabase Auth, with each user's role in a profiles table | Phone number as login ID with password; skip SMS codes, which cost money per message |
| Menu photos | Supabase Storage | Compress images in the browser before upload to stay within free storage |
| New-order alerts | Supabase Realtime | Staff dashboard updates the instant an order is placed |
| Server-side rules | Supabase Edge Functions | Order total, radius check and the three-call rule run on the server, so customers cannot change prices |
| Hosting | Render free static site | Static sites do not sleep; a free Render web service sleeps when idle and makes first loads slow, so avoid one |
| Maps | Leaflet with OpenStreetMap | Free; no billing account or card needed |
| English and Urdu | react-i18next, Noto Nastaliq Urdu font, right-to-left layout | Every interface text lives in translation files |

Free tiers have limits to plan around. Supabase's free plan pauses projects that sit inactive and does not include automatic backups, so export the database weekly; check its current database and storage limits before launch. Move Supabase to a paid plan once the site carries real orders, because backups protect the restaurant's order history.

Main tables: branches, delivery settings, delivery tiers, profiles (role and branch for each login), riders, customers, addresses, categories, items, variants, add-on groups, add-on options, deals, deal items, orders, order items, order item add-ons, payments, call attempts, order status log and discount codes. Every menu text field is stored in both languages (name\_en and name\_ur, and so on). Orders store branch, map pin coordinates and distance, order type, status, payment method, payment status, transaction ID, subtotal, delivery fee, discount, total (tax-inclusive, so no separate tax field), confirming staff member and assigned rider.

## One-month plan

A one-month launch is tight for a student team building in two languages; it works only if everything outside the core ordering flow waits for phase 2 and the client delivers menu content on time. The proposed plan starts Monday Oct 12 and launches Monday Nov 9.

&#91;embedded content: proposed build plan · 4 weeks\]

What each week delivers:

1. **Spec and design:** client signs off this spec; wireframes and visual design in both languages; Supabase tables, roles and security rules; React project with translation setup deployed to Render.
2. **Menu, cart, checkout:** customer pages in English and Urdu, menu model with variants, add-ons and fixed deals, map-pin checkout with radius check, guest and account ordering.
3. **Admin, orders, payments:** live orders dashboard with realtime alerts, confirmation call and three-call rule, manual payment verification, rider assignment, all admin modules, discount codes and reports.
4. **Content, WhatsApp, testing:** Super Admin enters the real menu and photos in both languages, prefilled WhatsApp messages, staff training, end-to-end test orders, fixes, domain connected.

**In the launch:** everything in this spec except the items below.

**Phase 2, after launch:** automatic WhatsApp messages through the Business API; a rider login or app; takeaway orders; second-branch selection on the customer site; paid Supabase plan with automatic backups.

Because the menu is entered through the admin panel, missing menu content never blocks development, but the site cannot go live until the Super Admin has entered the real menu and photos in week 4.

If Urdu falls behind, launch in English on Nov 9 and switch Urdu on once translations are complete; the language switch and the Urdu database fields are built from week 1 either way.

## Client action items and open questions

The first six items are needed before week 3, when payments, delivery and order handling are built; the menu, photos and policy text are needed by week 4.

- [ ] Set up the WhatsApp Business app on a dedicated number for order messages and payment screenshots
- [ ] Send the account details to show customers: bank account title, number and IBAN; JazzCash number and title; Easypaisa number and title
- [ ] Decide who verifies payments, and give them access to the bank and wallet apps or their incoming-payment SMS alerts
- [ ] Send the branch's exact location pin, the starting km tiers with their delivery charges, and the minimum order amount
- [ ] Send opening hours
- [ ] Send the rider list with names and phone numbers, and name the Order Staff members and the Super Admin who need logins
- [ ] Prepare the full menu in English and Urdu (categories, items, descriptions, tax-inclusive prices, sizes, add-ons, fixed deals) for the Super Admin to enter in week 4
- [ ] Send dish photos, or book a food shoot (photos strongly affect orders)
- [ ] Send logo, brand colours and any existing designs
- [ ] Write or approve the terms, privacy and refund policy text in both languages
- [ ] Choose the domain name, to be bought before launch

Open questions to settle before week 2:

- Who translates the menu and site text into Urdu: the client, or your team?
- How quickly are refunds sent for cancelled prepaid orders, and who sends them?
- Is there free delivery above an order amount, on top of the km-based charges?
- Should phone numbers with repeated unanswered or unpaid orders be blocked from ordering?
- Who pays for the domain, and for the paid Supabase plan once real orders start: the client directly, or your team billed monthly?
- After launch, who maintains the site and fixes problems, and is that a paid monthly arrangement?
