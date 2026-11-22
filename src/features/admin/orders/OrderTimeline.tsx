import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../../lib/supabase'
import type { Enums } from '../../../types/database'
import { card } from '../ui'
import { buildTimeline, durationParts } from './timeline'

// Every step the order went through, from the status log (times set by the database, shown in Lahore time), who did
// it, and how long each step took. A step with no recorded event says "Not recorded" instead of guessing.
export function OrderTimeline({ orderId, cancelReason }: { orderId: string; cancelReason: Enums<'cancel_reason'> | null }) {
  const { t } = useTranslation(undefined, { lng: 'en' })
  const log = useQuery({
    queryKey: ['order-timeline', orderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('order_status_log')
        .select('to_status, changed_by, created_at')
        .eq('order_id', orderId)
        .order('created_at')
      if (error) throw error
      // Staff names: Order Staff can read only their own profile, so others show as "Staff member".
      const ids = [...new Set(data.map((event) => event.changed_by).filter((id): id is string => id !== null))]
      const names = new Map<string, string>()
      if (ids.length > 0) {
        const { data: people } = await supabase.from('profiles').select('user_id, full_name').in('user_id', ids)
        for (const person of people ?? []) names.set(person.user_id, person.full_name)
      }
      return { events: data, names }
    },
  })
  // Without the log (an older database) the order page simply has no timeline.
  if (!log.data) return null
  const { steps, totalSeconds } = buildTimeline(log.data.events)

  const duration = (seconds: number) => {
    const { hours, minutes } = durationParts(seconds)
    if (hours === 0 && minutes === 0) return t('admin.orders.timeline.underMinute')
    return hours > 0 ? t('admin.orders.timeline.hoursMinutes', { hours, minutes }) : t('admin.orders.timeline.minutes', { minutes })
  }
  const who = (status: string, changedBy: string | null) => {
    if (changedBy) return log.data.names.get(changedBy) ?? t('admin.orders.timeline.staff')
    return status === 'pending_confirmation' || status === 'cancelled' ? t('admin.orders.timeline.customer') : t('admin.orders.timeline.system')
  }

  return (
    <section className={card}>
      <h2 className="font-heading text-2xl font-bold">{t('admin.orders.timeline.heading')}</h2>
      <ol className="mt-2 flex flex-col divide-y divide-line">
        {steps.map((step) => (
          <li key={step.status} className="flex flex-col gap-0.5 py-2">
            <span className="font-bold">
              {step.status === 'pending_confirmation' ? t('admin.orders.timeline.placed') : t(`admin.orders.status.${step.status}`)}
              {step.status === 'cancelled' && cancelReason && `: ${t(`admin.orders.reasons.${cancelReason}`)}`}
            </span>
            {step.event ? (
              <span className="text-sm text-ink-muted">
                {new Date(step.event.created_at).toLocaleString('en-GB', { timeZone: 'Asia/Karachi', dateStyle: 'medium', timeStyle: 'short' })}
                {' · '}
                {t('admin.orders.timeline.by', { name: who(step.status, step.event.changed_by) })}
                {step.secondsSincePrevious !== null && ` · ${t('admin.orders.timeline.afterPrevious', { duration: duration(step.secondsSincePrevious) })}`}
              </span>
            ) : (
              <span className="text-sm text-ink-muted">{t('admin.orders.timeline.notRecorded')}</span>
            )}
          </li>
        ))}
      </ol>
      {totalSeconds !== null && (
        <p className="mt-2 border-t border-line pt-2 font-bold">{t('admin.orders.timeline.total', { duration: duration(totalSeconds) })}</p>
      )}
    </section>
  )
}
