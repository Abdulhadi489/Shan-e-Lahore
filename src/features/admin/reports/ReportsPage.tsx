import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Download } from 'lucide-react'
import { formatAmount } from '../../../lib/money'
import { supabase } from '../../../lib/supabase'
import { useStaff } from '../StaffLayout'
import { card, headingClass, inputClass, labelClass, secondaryButton, sectionHeading } from '../ui'
import { buildReport, ordersCsv, type GroupBy, type ReportOrder } from './report'

const lahoreToday = () => new Date(Date.now() + 5 * 3_600_000).toISOString().slice(0, 10)
const daysBefore = (day: string, days: number) => new Date(Date.parse(`${day}T00:00:00Z`) - days * 86_400_000).toISOString().slice(0, 10)
const pageSize = 1000

// The API returns at most 1,000 rows per request, so a long period is read page by page.
async function fetchOrders(branchId: string, from: string, to: string) {
  const orders: ReportOrder[] = []
  for (let page = 0; ; page++) {
    const { data, error } = await supabase
      .from('orders')
      .select(
        `order_number, created_at, status, cancel_reason, payment_method, payment_status, subtotal, delivery_charge,
         discount_amount, total, distance_km, discount_code_id,
         order_items ( name_en, variant_name_en, quantity, line_total )`,
      )
      .eq('branch_id', branchId)
      .gte('created_at', `${from}T00:00:00+05:00`)
      .lt('created_at', `${daysBefore(to, -1)}T00:00:00+05:00`)
      .order('created_at')
      .range(page * pageSize, page * pageSize + pageSize - 1)
    if (error) throw error
    orders.push(...data)
    if (data.length < pageSize) return orders
  }
}

export function ReportsPage() {
  const { t } = useTranslation(undefined, { lng: 'en' })
  const { branch } = useStaff()
  const [period, setPeriod] = useState({ from: daysBefore(lahoreToday(), 6), to: lahoreToday(), groupBy: 'day' as GroupBy })
  const data = useQuery({
    queryKey: ['admin-report', branch.id, period.from, period.to],
    queryFn: async () => {
      const [orders, tiers, codes] = await Promise.all([
        fetchOrders(branch.id, period.from, period.to),
        supabase.from('delivery_tiers').select('upper_km').eq('branch_id', branch.id),
        supabase.from('discount_codes').select('id, code').eq('branch_id', branch.id),
      ])
      if (tiers.error) throw tiers.error
      if (codes.error) throw codes.error
      return { orders, tierLimits: tiers.data.map((tier) => tier.upper_km), codeNames: new Map(codes.data.map((c) => [c.id, c.code])) }
    },
  })
  const price = (amount: number) => t('price', { amount: formatAmount(amount) })
  const report = data.data && buildReport(data.data.orders, period.groupBy, data.data.tierLimits, data.data.codeNames)

  function download() {
    if (!data.data) return
    const url = URL.createObjectURL(new Blob([ordersCsv(data.data.orders, branch.order_prefix)], { type: 'text/csv;charset=utf-8' }))
    const link = Object.assign(document.createElement('a'), { href: url, download: `orders-${period.from}-to-${period.to}.csv` })
    link.click()
    URL.revokeObjectURL(url)
  }

  const table = (heading: string, columns: string[], rows: (string | number)[][]) => (
    <section className={card}>
      <h2 className={sectionHeading}>{heading}</h2>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-start">
          <thead>
            <tr className="border-b border-line text-sm text-ink-muted">
              {columns.map((column, index) => (
                <th key={column} scope="col" className={`py-1 font-bold ${index === 0 ? 'text-start' : 'text-end'}`}>
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={String(row[0])} className="border-b border-line last:border-0">
                {row.map((value, index) => (
                  <td key={index} className={`py-1 ${index === 0 ? '' : 'text-end tabular-nums'}`}>
                    {value}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )

  return (
    <>
      <title>{`${t('admin.reports.heading')} · ${t('brand')}`}</title>
      <h1 className={headingClass}>{t('admin.reports.heading')}</h1>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          const form = new FormData(event.currentTarget)
          setPeriod({ from: String(form.get('from')), to: String(form.get('to')), groupBy: form.get('groupBy') as GroupBy })
        }}
        className="mt-3 flex flex-wrap items-end gap-3"
      >
        <label className={labelClass}>
          {t('admin.reports.from')}
          <input name="from" type="date" required defaultValue={period.from} max={lahoreToday()} className={inputClass} />
        </label>
        <label className={labelClass}>
          {t('admin.reports.to')}
          <input name="to" type="date" required defaultValue={period.to} max={lahoreToday()} className={inputClass} />
        </label>
        <label className={labelClass}>
          {t('admin.reports.groupBy')}
          <select name="groupBy" defaultValue={period.groupBy} className={inputClass}>
            {(['day', 'week', 'month'] as const).map((group) => (
              <option key={group} value={group}>
                {t(`admin.reports.groups.${group}`)}
              </option>
            ))}
          </select>
        </label>
        <button type="submit" className={secondaryButton}>
          {t('admin.reports.show')}
        </button>
      </form>

      {data.isPending && <p className="mt-4">{t('admin.loading')}</p>}
      {data.isError && <p role="alert" className="mt-4">{t('admin.errors.loadFailed')}</p>}
      {report && report.totals.orders === 0 && <p className="mt-4 text-ink-muted">{t('admin.reports.empty')}</p>}
      {report && report.totals.orders > 0 && (
        <div className="mt-4 flex flex-col gap-4">
          <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {(
              [
                ['orders', report.totals.orders],
                ['delivered', report.totals.delivered],
                ['cancelled', report.totals.cancelled],
                ['cancellationRate', `${report.totals.cancellationRate}%`],
                ['open', report.totals.open],
                ['revenue', price(report.totals.revenue)],
                ['averageOrder', price(report.totals.averageOrder)],
                ['deliveryCharges', price(report.totals.deliveryCharges)],
                ['discounts', price(report.totals.discounts)],
              ] as const
            ).map(([key, value]) => (
              <div key={key} className={card}>
                <dt className="text-sm text-ink-muted">{t(`admin.reports.totals.${key}`)}</dt>
                <dd className="font-heading text-2xl font-bold tabular-nums">{value}</dd>
              </div>
            ))}
          </dl>

          <div>
            <button type="button" onClick={download} className={secondaryButton}>
              <Download aria-hidden className="size-5" />
              {t('admin.reports.export')}
            </button>
            <p className="mt-1 text-sm text-ink-muted">{t('admin.reports.exportHelp')}</p>
          </div>

          {table(
            t('admin.reports.sales'),
            [t('admin.reports.period'), t('admin.reports.totals.orders'), t('admin.reports.totals.delivered'), t('admin.reports.totals.revenue')],
            report.periods.map((row) => [row.period, row.orders, row.delivered, price(row.revenue)]),
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {table(
              t('admin.reports.statuses'),
              ['', t('admin.reports.count')],
              [...report.statuses].map(([status, count]) => [t(`admin.orders.status.${status as 'delivered'}`), count]),
            )}
            {table(
              t('admin.reports.cancelReasons'),
              ['', t('admin.reports.count')],
              [...report.cancelReasons].map(([reason, count]) => [t(`admin.orders.reasons.${reason as 'other'}`), count]),
            )}
            {table(
              t('admin.reports.payments'),
              ['', t('admin.reports.count'), t('admin.reports.amount')],
              report.paymentMethods.map((row) => [t(`payment.${row.method as 'cod'}`), row.orders, price(row.amount)]),
            )}
            {table(
              t('admin.reports.distance'),
              ['', t('admin.reports.count')],
              report.distanceTiers.map(([tier, count]) => [tier, count]),
            )}
          </div>
          {table(
            t('admin.reports.topItems'),
            ['', t('admin.reports.quantity'), t('admin.reports.amount')],
            report.topItems.map((row) => [row.name, row.quantity, price(row.revenue)]),
          )}
          {report.discountCodes.length > 0 &&
            table(
              t('admin.reports.discountCodes'),
              ['', t('admin.reports.uses'), t('admin.reports.amount')],
              report.discountCodes.map((row) => [row.code, row.uses, price(row.amount)]),
            )}
        </div>
      )}
    </>
  )
}
