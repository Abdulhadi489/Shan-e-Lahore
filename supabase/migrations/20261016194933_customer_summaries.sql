-- Customers screen: one row per guest phone with their order totals.
-- security_invoker, so the RLS on customers (Super Admin only) and orders applies to whoever reads it.
create view public.customer_summaries with (security_invoker = true) as
select
  c.id,
  c.phone,
  c.name,
  c.is_blocked,
  count(o.id)::integer as order_count,
  (count(o.id) filter (where o.status = 'cancelled'))::integer as cancelled_count,
  coalesce(sum(o.total) filter (where o.status = 'delivered'), 0)::integer as delivered_spend,
  max(o.created_at) as last_order_at
from public.customers c
left join public.orders o on o.customer_id = c.id
group by c.id;

grant select on public.customer_summaries to authenticated;
