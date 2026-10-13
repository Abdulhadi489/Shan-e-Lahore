import { Outlet, useOutletContext } from 'react-router'
import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { BellRing } from 'lucide-react'
import { supabase } from '../../lib/supabase'
import { useStaffBranch, type StaffBranch } from './useStaffBranch'
import { useLiveOrders, type LiveOrder } from './orders/useLiveOrders'
import { useNewOrderAlarm } from './orders/useNewOrderAlarm'

type StaffContext = { branch: StaffBranch; orders: UseQueryResult<LiveOrder[]> }
export const useStaff = () => useOutletContext<StaffContext>()

// Wraps every staff screen, so the new-order alarm keeps ringing whichever screen is open.
export function StaffLayout({ userId }: { userId: string }) {
  const { t } = useTranslation(undefined, { lng: 'en' })
  const profile = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, role, is_active, branch_id')
        .eq('user_id', userId)
        .single()
      if (error) throw error
      return data
    },
  })
  const hasAccess = profile.data?.is_active && profile.data.role !== 'customer'
  const branch = useStaffBranch(hasAccess ? profile.data?.branch_id : undefined)
  const orders = useLiveOrders(branch.data?.id)
  const alarm = useNewOrderAlarm(orders.data, (order) =>
    t('admin.alerts.notification', { number: `${branch.data?.order_prefix}-${order.order_number}` }),
  )

  let content
  if (profile.isPending) {
    content = <p>{t('admin.loading')}</p>
  } else if (profile.isError || branch.isError) {
    content = <p role="alert">{t('admin.profileError')}</p>
  } else if (!profile.data.is_active) {
    content = <p role="alert">{t('admin.deactivated')}</p>
  } else if (profile.data.role === 'customer') {
    content = <p role="alert">{t('admin.noRole')}</p>
  } else if (!branch.data) {
    content = <p>{t('admin.loading')}</p>
  } else {
    content = <Outlet context={{ branch: branch.data, orders } satisfies StaffContext} />
  }

  return (
    <div className="min-h-dvh">
      <title>{`${t('admin.title')} · ${t('brand')}`}</title>
      <header className="border-b border-line bg-raised print:hidden">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
          <p className="font-heading text-xl font-bold text-brand-deep">
            {t('brand')} <span className="text-ink-muted">{t('admin.title')}</span>
          </p>
          {profile.data && (
            <p className="text-sm text-ink-muted">
              {t('admin.signedInAs', { name: profile.data.full_name, role: t(`admin.roles.${profile.data.role}`) })}
            </p>
          )}
          {alarm.on && <p className="text-sm font-bold text-success">{t('admin.alerts.on')}</p>}
          <button
            type="button"
            onClick={() => void supabase.auth.signOut()}
            className="ms-auto rounded-control border border-ink-muted px-3 py-1 hover:border-brand-deep"
          >
            {t('admin.signOut')}
          </button>
        </div>
      </header>
      {branch.data && !alarm.on && (
        <div className="bg-peach print:hidden">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-3 px-4 py-3">
            <p className="font-bold">{t('admin.alerts.off')}</p>
            <button type="button" onClick={alarm.turnOn} className="rounded-control bg-brand px-4 py-2 font-bold text-ink">
              {t('admin.alerts.turnOn')}
            </button>
          </div>
        </div>
      )}
      <div role="alert" className="print:hidden">
        {alarm.unseen.length > 0 && (
          <button
            type="button"
            onClick={alarm.acknowledge}
            className="flex w-full items-center justify-center gap-3 bg-brand px-4 py-4 text-lg font-bold text-ink"
          >
            <BellRing aria-hidden className="size-6 shrink-0" />
            {t('admin.alerts.ringing', {
              count: alarm.unseen.length,
              numbers: alarm.unseen.map((o) => `${branch.data?.order_prefix}-${o.order_number}`).join(', '),
            })}
          </button>
        )}
      </div>
      <main className="mx-auto max-w-5xl px-4 py-6 print:p-0">{content}</main>
    </div>
  )
}
