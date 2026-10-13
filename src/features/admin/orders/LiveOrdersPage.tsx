import { Link, useSearchParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { clockLabel } from '../../../lib/format'
import { formatAmount } from '../../../lib/money'
import { useStaff } from '../StaffLayout'
import type { LiveOrder } from './useLiveOrders'

const tabs = {
  new: (o: LiveOrder) => o.status === 'pending_confirmation',
  kitchen: (o: LiveOrder) => o.status === 'confirmed' || o.status === 'preparing',
  onTheWay: (o: LiveOrder) => o.status === 'out_for_delivery',
  done: (o: LiveOrder) => o.status === 'delivered' || o.status === 'cancelled',
  refunds: (o: LiveOrder) => o.payment_status === 'refund_due',
}
type Tab = keyof typeof tabs
const isTab = (value: string | null): value is Tab => value !== null && value in tabs

export function LiveOrdersPage() {
  const { t } = useTranslation(undefined, { lng: 'en' })
  const { branch, orders } = useStaff()
  const [params, setParams] = useSearchParams()
  const tabParam = params.get('tab')
  const tab: Tab = isTab(tabParam) ? tabParam : 'new'
  const all = orders.data ?? []
  const shown = all.filter(tabs[tab])

  return (
    <>
      <h1 className="font-heading text-3xl font-bold">{t('admin.liveOrders')}</h1>
      <nav aria-label={t('admin.orders.tabsLabel')} className="mt-4 flex flex-wrap gap-2">
        {(Object.keys(tabs) as Tab[]).map((key) => (
          <button
            key={key}
            type="button"
            aria-pressed={key === tab}
            onClick={() => setParams({ tab: key }, { replace: true })}
            className="rounded-control border border-ink-muted bg-raised px-3 py-2 font-bold aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-raised"
          >
            {t(`admin.orders.tabs.${key}`)} ({all.filter(tabs[key]).length})
          </button>
        ))}
      </nav>

      {orders.isError && <p role="alert" className="mt-4 text-danger">{t('admin.orders.loadError')}</p>}
      {orders.isPending ? (
        <p className="mt-4">{t('admin.loading')}</p>
      ) : shown.length === 0 ? (
        <p className="mt-4 text-ink-muted">{t('admin.orders.empty')}</p>
      ) : (
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((o) => {
            const missedCalls = o.call_attempts[0]?.count ?? 0
            return (
              <li key={o.id}>
                <Link
                  to={`orders/${o.id}`}
                  className="flex flex-col gap-1 rounded-card border border-line bg-raised p-4 hover:border-brand-deep"
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-heading text-xl font-bold">
                      {branch.order_prefix}-{o.order_number}
                    </span>
                    <span className="text-sm text-ink-muted">{clockLabel('en', o.created_at)}</span>
                  </span>
                  <span>{o.customer_name}</span>
                  <span className="font-bold">
                    {t('price', { amount: formatAmount(o.total) })} · {t(`payment.${o.payment_method}`)}
                    {o.payment_method !== 'cod' && ` · ${t(`admin.orders.paymentStatus.${o.payment_status}`)}`}
                  </span>
                  <span className={o.status === 'cancelled' ? 'text-danger' : 'text-ink-muted'}>
                    {t(`admin.orders.status.${o.status}`)}
                    {o.riders && ` · ${o.riders.name}`}
                  </span>
                  {o.status === 'pending_confirmation' && missedCalls > 0 && (
                    <span className="font-bold text-danger">{t('admin.orders.missedCalls', { count: missedCalls })}</span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </>
  )
}
