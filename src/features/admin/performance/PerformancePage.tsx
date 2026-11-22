import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { openingStatus } from '../../../../supabase/functions/_shared/opening-hours'
import { supabase } from '../../../lib/supabase'
import { useStaff } from '../StaffLayout'
import { card, headingClass, inputClass, labelClass, secondaryButton, sectionHeading } from '../ui'
import { buildPerformance, performanceCsv, type Stats } from './performance'

const MAX_ORDERS = 2000
// Dates are Lahore days (UTC+5, no daylight saving).
const karachiDay = (offsetDays: number) => new Date(Date.now() + 5 * 3_600_000 - offsetDays * 86_400_000).toISOString().slice(0, 10)
const startOf = (day: string) => new Date(`${day}T00:00:00+05:00`).toISOString()
const endOf = (day: string) => new Date(new Date(`${day}T00:00:00+05:00`).getTime() + 86_400_000).toISOString()
const chunks = <T,>(list: T[], size: number) => Array.from({ length: Math.ceil(list.length / size) }, (_, i) => list.slice(i * size, (i + 1) * size))

// Staff and rider performance for Super Admins. Times come from the order status log (set by the database).
export function PerformancePage() {
  const { t, i18n } = useTranslation()
  const { branch } = useStaff()
  const [range, setRange] = useState({ from: karachiDay(6), to: karachiDay(0) })

  const data = useQuery({
    queryKey: ['performance', range],
    queryFn: async () => {
      const { data: orders, error } = await supabase
        .from('orders')
        .select('id, status, rider_id')
        .gte('created_at', startOf(range.from))
        .lt('created_at', endOf(range.to))
        .order('created_at', { ascending: false })
        .limit(MAX_ORDERS)
      if (error) throw error
      const events = (
        await Promise.all(
          chunks(orders.map((order) => order.id), 100).map(async (ids) => {
            const { data: rows, error: logError } = await supabase.from('order_status_log').select('order_id, to_status, changed_by, created_at').in('order_id', ids)
            if (logError) throw logError
            return rows
          }),
        )
      ).flat()
      const [hours, people] = await Promise.all([
        supabase.from('opening_hours').select('weekday, open_time, close_time, is_closed').eq('branch_id', branch.id),
        supabase.from('profiles').select('user_id, full_name'),
      ])
      const opening = hours.data ?? []
      const result = buildPerformance(events, orders, (iso) => opening.length === 0 || openingStatus(opening, new Date(iso)).open)
      const names = new Map([
        ...(people.data ?? []).map((person) => [person.user_id, person.full_name] as const),
        ...branch.riders.map((rider) => [rider.id, rider.name] as const),
      ])
      return { result, names, truncated: orders.length === MAX_ORDERS }
    },
  })

  const minutes = (seconds: number) => t('admin.performance.minutes', { value: (seconds / 60).toFixed(1) })
  const name = (id: string) => data.data?.names.get(id) ?? t('admin.performance.unknown')
  const statLines = (label: string, s: Stats | null) => (
    <div className="flex flex-col gap-0.5 border-b border-line py-2">
      <dt className="font-medium">{label}</dt>
      <dd className="text-sm text-ink-muted">
        {s
          ? t('admin.performance.statLine', { count: s.count, avg: minutes(s.avg), median: minutes(s.median), max: minutes(s.max) })
          : t('admin.performance.noData')}
      </dd>
    </div>
  )
  const overall = data.data?.result.overall
  const bars = overall && [
    { key: 'confirm', stats: overall.confirm },
    { key: 'toKitchen', stats: overall.toKitchen },
    { key: 'kitchen', stats: overall.kitchen },
    { key: 'delivery', stats: overall.delivery },
  ] as const
  const widest = Math.max(1, ...(bars ?? []).map((bar) => bar.stats?.avg ?? 0))

  return (
    <div lang={i18n.language} dir={i18n.dir()}>
      <title>{`${t('admin.performance.heading')} · ${t('brand')}`}</title>
      <h1 className={headingClass}>{t('admin.performance.heading')}</h1>
      <p className="mt-1 text-ink-muted">{t('admin.performance.help')}</p>

      <form className={`${card} mt-4 flex flex-wrap items-end gap-3`} onSubmit={(event) => event.preventDefault()}>
        <label className={labelClass}>
          {t('admin.performance.from')}
          <input type="date" value={range.from} max={range.to} onChange={(event) => event.target.value && setRange({ ...range, from: event.target.value })} className={`${inputClass} min-h-11`} />
        </label>
        <label className={labelClass}>
          {t('admin.performance.to')}
          <input type="date" value={range.to} min={range.from} max={karachiDay(0)} onChange={(event) => event.target.value && setRange({ ...range, to: event.target.value })} className={`${inputClass} min-h-11`} />
        </label>
        <button
          type="button"
          disabled={!data.data}
          onClick={() => {
            if (!data.data) return
            const csv = performanceCsv(data.data.result, name)
            const link = document.createElement('a')
            link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
            link.download = `performance-${range.from}-to-${range.to}.csv`
            link.click()
            URL.revokeObjectURL(link.href)
          }}
          className={`${secondaryButton} min-h-11`}
        >
          {t('admin.performance.csv')}
        </button>
      </form>

      {data.isPending && <p className="mt-4">{t('admin.loading', { lng: 'en' })}</p>}
      {data.isError && <p role="alert" className="mt-4 text-danger">{t('admin.performance.error')}</p>}
      {data.data && overall && bars && (
        <>
          <p className="mt-4 text-sm text-ink-muted">
            {t('admin.performance.notes', { outside: overall.outsideHours, cancelled: overall.customerCancelled })}
            {data.data.truncated && ` ${t('admin.performance.truncated', { count: MAX_ORDERS })}`}
          </p>

          <section className={`${card} mt-4`}>
            <h2 className={sectionHeading}>{t('admin.performance.shop')}</h2>
            <ul className="mt-2 flex flex-col gap-3">
              {bars.map(({ key, stats }) => (
                <li key={key}>
                  <p className="font-medium">{t(`admin.performance.steps.${key}`)}</p>
                  <div className="mt-1 h-3 rounded-full bg-line/40" aria-hidden>
                    <div className="h-3 rounded-full bg-brand" style={{ width: `${Math.round(((stats?.avg ?? 0) / widest) * 100)}%` }} />
                  </div>
                  <p className="text-sm text-ink-muted">
                    {stats
                      ? t('admin.performance.statLine', { count: stats.count, avg: minutes(stats.avg), median: minutes(stats.median), max: minutes(stats.max) })
                      : t('admin.performance.noData')}
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <section className={`${card} mt-4`}>
            <h2 className={sectionHeading}>{t('admin.performance.staff')}</h2>
            <p className="text-sm text-ink-muted">{t('admin.performance.staffHelp')}</p>
            {data.data.result.staff.length === 0 && <p className="mt-2 text-ink-muted">{t('admin.performance.noData')}</p>}
            <ul className="mt-2 grid gap-3 md:grid-cols-2">
              {data.data.result.staff.toSorted((a, b) => name(a.id).localeCompare(name(b.id))).map((person) => (
                <li key={person.id} className="rounded-control border border-line bg-surface p-3">
                  <p className="font-bold">{name(person.id)}</p>
                  <dl>
                    {statLines(t('admin.performance.steps.confirm'), person.confirm)}
                    {statLines(t('admin.performance.steps.toKitchen'), person.toKitchen)}
                    <div className="flex flex-col gap-0.5 py-2">
                      <dt className="font-medium">{t('admin.performance.handled')}</dt>
                      <dd className="text-sm text-ink-muted">{t('admin.performance.handledLine', { handled: person.handled, cancelled: person.cancelled })}</dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          </section>

          <section className={`${card} mt-4`}>
            <h2 className={sectionHeading}>{t('admin.performance.riders')}</h2>
            {data.data.result.riders.length === 0 && <p className="mt-2 text-ink-muted">{t('admin.performance.noData')}</p>}
            <ul className="mt-2 grid gap-3 md:grid-cols-2">
              {data.data.result.riders.toSorted((a, b) => name(a.id).localeCompare(name(b.id))).map((rider) => (
                <li key={rider.id} className="rounded-control border border-line bg-surface p-3">
                  <p className="font-bold">{name(rider.id)}</p>
                  <dl>{statLines(t('admin.performance.steps.delivery'), rider.delivery)}</dl>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
    </div>
  )
}
