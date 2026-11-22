import { useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { formatAmount } from '../../../lib/money'
import { supabase } from '../../../lib/supabase'
import { Constants, type Enums } from '../../../types/database'
import { card, inputClass, labelClass, secondaryButton, sectionHeading } from '../ui'

const PAGE = 10
const dateTime = (iso: string) => new Date(iso).toLocaleString('en-GB', { timeZone: 'Asia/Karachi', dateStyle: 'medium', timeStyle: 'short' })
// A Lahore day as UTC bounds (UTC+5, no daylight saving).
const dayStart = (day: string) => new Date(`${day}T00:00:00+05:00`).toISOString()
const dayEnd = (day: string) => new Date(new Date(`${day}T00:00:00+05:00`).getTime() + 86_400_000).toISOString()

// One customer's orders, newest first, with filters and pages. Each order opens to the items, prices and delivery
// details that were saved when it was placed. Cancelled orders are included. Customer text is rendered as plain text.
export function CustomerOrders({ customerId }: { customerId: string }) {
  const { t } = useTranslation(undefined, { lng: 'en' })
  const [filters, setFilters] = useState<{ status: Enums<'order_status'> | ''; from: string; to: string }>({ status: '', from: '', to: '' })
  const [page, setPage] = useState(0)

  const orders = useQuery({
    queryKey: ['customer-orders', customerId, filters, page],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select(
          `id, order_number, created_at, status, payment_method, subtotal, delivery_charge, discount_amount, total, notes, address_text, landmark,
           customer_name, cancel_reason, branches ( order_prefix ),
           order_items ( id, name_en, variant_name_en, quantity, unit_price, line_total, order_item_addons ( id, name_en ) )`,
          { count: 'exact' },
        )
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false })
        .range(page * PAGE, page * PAGE + PAGE - 1)
      if (filters.status) query = query.eq('status', filters.status)
      if (filters.from) query = query.gte('created_at', dayStart(filters.from))
      if (filters.to) query = query.lt('created_at', dayEnd(filters.to))
      const { data, error, count } = await query
      if (error) throw error
      return { rows: data, count: count ?? data.length }
    },
    placeholderData: keepPreviousData,
  })
  const price = (amount: number) => t('price', { amount: formatAmount(amount) })
  const last = Math.max(0, Math.ceil((orders.data?.count ?? 0) / PAGE) - 1)
  const change = (next: Partial<typeof filters>) => {
    setFilters({ ...filters, ...next })
    setPage(0)
  }

  return (
    <section className={`${card} mt-4`}>
      <h2 className={sectionHeading}>{t('admin.customers.history')}</h2>
      <div className="mt-2 grid gap-3 sm:grid-cols-3">
        <label className={labelClass}>
          {t('admin.customers.filterStatus')}
          <select value={filters.status} onChange={(event) => change({ status: event.target.value as Enums<'order_status'> | '' })} className={`${inputClass} min-h-11`}>
            <option value="">{t('admin.customers.allStatuses')}</option>
            {Constants.public.Enums.order_status.map((status) => (
              <option key={status} value={status}>
                {t(`admin.orders.status.${status}`)}
              </option>
            ))}
          </select>
        </label>
        <label className={labelClass}>
          {t('admin.customers.filterFrom')}
          <input type="date" value={filters.from} max={filters.to || undefined} onChange={(event) => change({ from: event.target.value })} className={`${inputClass} min-h-11`} />
        </label>
        <label className={labelClass}>
          {t('admin.customers.filterTo')}
          <input type="date" value={filters.to} min={filters.from || undefined} onChange={(event) => change({ to: event.target.value })} className={`${inputClass} min-h-11`} />
        </label>
      </div>

      {orders.isPending && <p className="mt-3">{t('admin.loading')}</p>}
      {orders.isError && <p role="alert" className="mt-3 text-danger">{t('admin.errors.loadFailed')}</p>}
      {orders.data?.rows.length === 0 && <p className="mt-3 text-ink-muted">{t('admin.customers.noOrders')}</p>}
      <ul className="mt-3 flex flex-col gap-2">
        {orders.data?.rows.map((order) => (
          <li key={order.id} className="rounded-control border border-line bg-surface">
            <details>
              <summary className="flex min-h-11 cursor-pointer flex-wrap items-center justify-between gap-2 p-3">
                <span>
                  <span className="font-bold">
                    {order.branches?.order_prefix}-{order.order_number}
                  </span>{' '}
                  · {dateTime(order.created_at)} ·{' '}
                  <span className={order.status === 'cancelled' ? 'font-bold text-danger' : ''}>
                    {t(`admin.orders.status.${order.status}`)}
                    {order.cancel_reason && `: ${t(`admin.orders.reasons.${order.cancel_reason}`)}`}
                  </span>
                </span>
                <span className="font-bold">{price(order.total)}</span>
              </summary>
              <div className="flex flex-col gap-2 border-t border-line p-3">
                <ul className="flex flex-col gap-1">
                  {order.order_items.map((item) => (
                    <li key={item.id} className="flex justify-between gap-3">
                      <span className="min-w-0">
                        <span className="font-bold">{item.quantity} ×</span> {item.name_en}
                        {item.variant_name_en && ` (${item.variant_name_en})`}
                        {item.order_item_addons.length > 0 && (
                          <span className="block text-sm text-ink-muted">{item.order_item_addons.map((addon) => addon.name_en).join(', ')}</span>
                        )}
                      </span>
                      <span className="shrink-0">{price(item.line_total)}</span>
                    </li>
                  ))}
                </ul>
                <dl className="border-t border-line pt-2 text-sm">
                  <div className="flex justify-between"><dt>{t('cart.subtotal')}</dt><dd>{price(order.subtotal)}</dd></div>
                  <div className="flex justify-between"><dt>{t('checkout.delivery')}</dt><dd>{price(order.delivery_charge)}</dd></div>
                  {order.discount_amount > 0 && (
                    <div className="flex justify-between"><dt>{t('checkout.discount')}</dt><dd>− {price(order.discount_amount)}</dd></div>
                  )}
                  <div className="flex justify-between font-bold"><dt>{t('checkout.total')}</dt><dd>{price(order.total)}</dd></div>
                </dl>
                <p className="text-sm text-ink-muted">
                  {t(`payment.${order.payment_method}`)} · {order.customer_name} · <span className="whitespace-pre-line">{order.address_text}</span>
                  {order.landmark && ` (${order.landmark})`}
                </p>
                {order.notes && <p className="text-sm whitespace-pre-line">{t('admin.orders.notes')}: {order.notes}</p>}
              </div>
            </details>
          </li>
        ))}
      </ul>
      {orders.data && orders.data.count > PAGE && (
        <nav aria-label={t('admin.customers.pages')} className="mt-3 flex flex-wrap items-center gap-3">
          <button type="button" disabled={page === 0} onClick={() => setPage(page - 1)} className={`${secondaryButton} min-h-11`}>{t('admin.customers.previous')}</button>
          <span className="text-sm text-ink-muted">{t('admin.customers.pageOf', { page: page + 1, pages: last + 1, count: orders.data.count })}</span>
          <button type="button" disabled={page >= last} onClick={() => setPage(page + 1)} className={`${secondaryButton} min-h-11`}>{t('admin.customers.next')}</button>
        </nav>
      )}
    </section>
  )
}
