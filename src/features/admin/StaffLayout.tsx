import { Link, Navigate, NavLink, Outlet, useOutletContext } from 'react-router'
import { useQuery, type UseQueryResult } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { BellRing } from 'lucide-react'
import { navLinkClass } from '../../app/CustomerLayout'
import { useHeaderHeight } from '../../app/useHeaderHeight'
import { supabase } from '../../lib/supabase'
import { useStaffBranch, type StaffBranch } from './useStaffBranch'
import { useLiveOrders, type LiveOrder } from './orders/useLiveOrders'
import { useNewOrderAlarm } from './orders/useNewOrderAlarm'

type StaffContext = { branch: StaffBranch; orders: UseQueryResult<LiveOrder[]>; isSuperAdmin: boolean; userId: string }
export const useStaff = () => useOutletContext<StaffContext>()

// Hides Super Admin screens from Order Staff. The database's RLS policies are what actually protect the data.
export function SuperAdminOnly() {
  const context = useStaff()
  return context.isSuperAdmin ? <Outlet context={context} /> : <Navigate to="/admin" replace />
}

const staffSections = [
  { to: '/admin', key: 'liveOrders', superAdmin: false },
  { to: '/admin/availability', key: 'availability', superAdmin: false },
  { to: '/admin/menu', key: 'menu', superAdmin: true },
  { to: '/admin/delivery', key: 'delivery', superAdmin: true },
  { to: '/admin/discounts', key: 'discounts', superAdmin: true },
  { to: '/admin/customers', key: 'customers', superAdmin: true },
  { to: '/admin/reports', key: 'reports', superAdmin: true },
  { to: '/admin/settings', key: 'settings', superAdmin: true },
] as const

// Wraps every staff screen, so the new-order alarm keeps ringing whichever screen is open.
export function StaffLayout({ userId }: { userId: string }) {
  const { t } = useTranslation(undefined, { lng: 'en' })
  const header = useHeaderHeight()
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
  const isSuperAdmin = profile.data?.role === 'super_admin'
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
    content = <Outlet context={{ branch: branch.data, orders, isSuperAdmin, userId } satisfies StaffContext} />
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <title>{`${t('admin.title')} · ${t('brand')}`}</title>
      {/* The customer site's top bar. A ringing alarm sits inside it so it shows wherever staff have scrolled. */}
      <header ref={header} className="sticky top-0 z-20 border-b border-line bg-raised print:hidden">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-(--page-pad) py-3">
          <Link to="/admin" className="inline-flex min-h-11 items-center font-heading text-2xl font-bold text-brand-deep">
            {t('brand')} <span className="text-ink-muted">{t('admin.title')}</span>
          </Link>
          <button
            type="button"
            onClick={() => void supabase.auth.signOut()}
            className="ms-auto min-h-11 rounded-control border border-line px-3 py-1 hover:border-brand-deep"
          >
            {t('admin.signOut')}
          </button>
        </div>
        {hasAccess && (
          // One scrolling line on phones, like the menu's category bar, so the bar stays short.
          <nav aria-label={t('admin.nav.label')} className="flex gap-x-5 overflow-x-auto whitespace-nowrap px-(--page-pad) pb-3">
            {staffSections
              .filter((section) => isSuperAdmin || !section.superAdmin)
              .map((section) => (
                <NavLink key={section.key} to={section.to} end={section.key === 'liveOrders'} className={(state) => `${navLinkClass(state)} inline-flex min-h-11 items-center`}>
                  {t(`admin.nav.${section.key}`)}
                </NavLink>
              ))}
          </nav>
        )}
        <div role="alert">
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
      </header>
      {branch.data && !alarm.on && (
        <div className="flex flex-wrap items-center gap-3 bg-peach px-(--page-pad) py-3 print:hidden">
          <p className="font-bold">{t('admin.alerts.off')}</p>
          <button type="button" onClick={alarm.turnOn} className="rounded-control bg-brand px-4 py-2 font-bold text-ink">
            {t('admin.alerts.turnOn')}
          </button>
        </div>
      )}

      <main className="mx-auto w-full max-w-[120rem] flex-1 px-(--page-pad) py-6 print:p-0">{content}</main>

      <footer className="border-t border-line bg-peach print:hidden">
        <div className="mx-auto flex max-w-[120rem] flex-wrap justify-center gap-x-6 gap-y-2 px-(--page-pad) py-6">
          {profile.data && (
            <p>{t('admin.signedInAs', { name: profile.data.full_name, role: t(`admin.roles.${profile.data.role}`) })}</p>
          )}
          {alarm.on && <p className="font-bold text-success">{t('admin.alerts.on')}</p>}
          {/* A new tab, because leaving the staff pages would stop the new-order alarm. */}
          <a href="/" target="_blank" rel="noopener" className="hover:text-brand-deep">
            {t('admin.customerSite')}
          </a>
        </div>
      </footer>
    </div>
  )
}
