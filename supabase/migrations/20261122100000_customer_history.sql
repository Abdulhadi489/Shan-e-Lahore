-- Customer history and the order timeline: two indexes and one view. Additive only; safe to run twice.
-- Nothing here changes orders, the status log, prices or tracking links, and no policy is added or widened:
-- the view is security_invoker, so the existing Row Level Security of customers and orders decides who sees what
-- (today only a Super Admin reads customers; Order Staff read the orders of their branch).
begin;

-- One customer's orders, newest first, and a date range over the status log, stay fast with many orders.
create index if not exists orders_customer_created_idx on public.orders (customer_id, created_at desc);
create index if not exists order_status_log_created_idx on public.order_status_log (created_at);

-- First order and total spent for the customer page (customer_summaries only has the last order and delivered spend).
create or replace view public.customer_order_totals with (security_invoker = true) as
select
  c.id as customer_id,
  min(o.created_at) as first_order_at,
  max(o.created_at) as last_order_at,
  coalesce(sum(o.total) filter (where o.status <> 'cancelled'), 0)::integer as spent_total,
  (count(o.id) filter (where o.status = 'cancelled'))::integer as cancelled_count
from public.customers c
left join public.orders o on o.customer_id = c.id
group by c.id;

revoke all on public.customer_order_totals from anon;
grant select on public.customer_order_totals to authenticated;

commit;
