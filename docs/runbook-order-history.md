# Runbook: customer history, order timeline and performance screen

One small migration, no function and no secret. The screens work without it (the customer page leaves the extra totals out), so the website can go out before or after.

| File | What it does |
| --- | --- |
| `supabase/migrations/20261122100000_customer_history.sql` | Two indexes (`orders (customer_id, created_at desc)`, `order_status_log (created_at)`) and the view `customer_order_totals` (security_invoker, so existing Row Level Security decides who sees it) |
| `supabase/rollbacks/20261122100000_customer_history_rollback.sql` | Drops only those three objects. No data is lost |

Never run `supabase db reset` against a hosted project.

1. **Backup**: `pg_dump "<CONNECTION_STRING>" --no-owner --format=custom --file=backup-before-history.dump` (or `supabase db dump --linked`, which writes files you keep outside the repo).
2. `supabase migration list` (only the new file missing on the remote side), then `supabase db push --dry-run` (exactly that file).
3. **Counts before**: `select (select count(*) from public.orders), (select count(*) from public.order_items), (select count(*) from public.customers), (select count(*) from public.order_status_log);`
4. `supabase db push`.
5. **Counts after**: all four numbers unchanged.
6. **Check**: as a Super Admin open Customers, a customer (first order and total spent show), an order (the timeline shows), and Performance. As Order Staff the Customers and Performance items are not shown.
7. Deploy the website on Render.

## Facts to know

- Status times already come from the database: `order_status_log` is filled by a trigger using `now()` and the logged-in account, and no API role can write, edit or delete it. Existing orders therefore already have their events; a step that was never recorded shows "Not recorded".
- The existing trigger `enforce_order_rules` stays the single path for status changes (allowed moves, paid-before-confirm, rider-before-dispatch, closed orders locked). Two people changing the same order cannot both succeed: the second sees the new status and is refused, and the log trigger fires only on a real change.
- Riders have no logins, so a rider's numbers are the orders assigned to them (dispatch to delivered). Staff mark deliveries.
- Customers (and so the Customers screen and Performance) are Super Admin only. Order Staff still see the customer's name, phone and address on each order of their branch.
- Orders sitting too long in one status could be flagged with a simple "older than N minutes and still pending" list on Live orders. Not built; say if you want it.
- The Privacy page does not mention keeping and showing customer order history to staff. You may want a line about it.
- The public tracking page is unchanged. It could show "out for delivery since 7:42 pm" from the status log; not done until you decide.
