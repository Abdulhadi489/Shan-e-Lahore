import { useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { normalisePakistaniMobile } from '../../../../supabase/functions/_shared/phone'
import { supabase } from '../../../lib/supabase'
import { phoneLabel } from '../../../lib/format'
import { useStaff } from '../StaffLayout'
import { card, headingClass, inputClass, labelClass, optional, primaryButton, sectionHeading, submitted, text, useDbMutation } from '../ui'
import { AuditList } from './AuditList'
import { PasswordDialog } from './PeopleDialogs'
import { errorKey, usePeopleCall, useRiderList, useStaffList } from './people'

type Row = {
  key: string
  to: string
  name: string
  kind: 'super_admin' | 'order_staff' | 'rider'
  active: boolean
  phone: string | null
  email: string | null
  updatedAt: string
}

const dateLabel = (iso: string) => new Date(iso).toLocaleDateString('en-GB', { timeZone: 'Asia/Karachi', day: 'numeric', month: 'short', year: 'numeric' })

// Staff and riders in one place, for Super Admins only (the route sits behind SuperAdminOnly, and the database and the
// admin-users function refuse everyone else anyway). Cards instead of a table, so nothing overflows on a phone.
export function PeoplePage() {
  const { t, i18n } = useTranslation()
  const { branch } = useStaff()
  const staff = useStaffList()
  const riders = useRiderList()
  const call = usePeopleCall<{ email: string; temporaryPassword: string }>()
  const addRider = useDbMutation(['people-riders'], ['branch'])
  const [search, setSearch] = useState('')
  const [role, setRole] = useState('all')
  const [status, setStatus] = useState('all')
  const [login, setLogin] = useState<{ email: string; password: string } | null>(null)
  const [phoneInvalid, setPhoneInvalid] = useState(false)

  const rows: Row[] = [
    ...(staff.data ?? []).map((person) => ({
      key: person.userId,
      to: `/admin/people/staff/${person.userId}`,
      name: person.fullName,
      kind: person.role,
      active: person.active,
      phone: person.phone,
      email: person.email,
      updatedAt: person.updatedAt,
    })),
    ...(riders.data ?? []).map((rider) => ({
      key: rider.id,
      to: `/admin/people/rider/${rider.id}`,
      name: rider.name,
      kind: 'rider' as const,
      active: rider.is_active,
      phone: rider.phone,
      email: null,
      updatedAt: rider.updated_at,
    })),
  ]
    .filter((row) => (role === 'all' || row.kind === role) && (status === 'all' || row.active === (status === 'active')))
    .filter((row) => `${row.name} ${row.phone ?? ''} ${row.email ?? ''}`.toLowerCase().includes(search.trim().toLowerCase()))
    .sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name))

  return (
    <div lang={i18n.language} dir={i18n.dir()}>
      <title>{`${t('admin.people.heading')} · ${t('brand')}`}</title>
      <h1 className={headingClass}>{t('admin.people.heading')}</h1>
      <p className="mt-1 text-ink-muted">{t('admin.people.help')}</p>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <details className={card}>
          <summary className="min-h-11 cursor-pointer py-2 font-bold text-brand-deep">{t('admin.people.addStaff')}</summary>
          <form
            className="mt-2 grid gap-3 sm:grid-cols-2"
            onSubmit={(event) => {
              const form = submitted(event)
              const element = event.currentTarget
              call.mutate(
                {
                  action: 'create',
                  email: text(form, 'email'),
                  fullName: text(form, 'fullName'),
                  phone: text(form, 'phone'),
                  role: text(form, 'role'),
                  // shortcut: one branch, so Order Staff always belong to it; add a branch choice for a second branch.
                  branchId: text(form, 'role') === 'order_staff' ? branch.id : null,
                },
                {
                  onSuccess: (result) => {
                    element.reset()
                    setLogin({ email: result.email, password: result.temporaryPassword })
                  },
                },
              )
            }}
          >
            <label className={labelClass}>
              {t('admin.people.fullName')}
              <input name="fullName" required maxLength={60} autoComplete="off" className={`${inputClass} min-h-11`} />
            </label>
            <label className={labelClass}>
              {t('admin.people.email')}
              <input name="email" type="email" inputMode="email" required maxLength={254} autoComplete="off" autoCapitalize="none" dir="ltr" className={`${inputClass} min-h-11`} />
            </label>
            <label className={labelClass}>
              {t('admin.people.phone')} <span className="text-sm text-ink-muted">({t('admin.people.optional')})</span>
              <input name="phone" type="tel" inputMode="tel" maxLength={20} autoComplete="off" dir="ltr" placeholder="0300 1234567" className={`${inputClass} min-h-11`} />
            </label>
            <label className={labelClass}>
              {t('admin.people.role')}
              <select name="role" defaultValue="order_staff" className={`${inputClass} min-h-11`}>
                <option value="order_staff">{t('admin.people.roles.order_staff')}</option>
                <option value="super_admin">{t('admin.people.roles.super_admin')}</option>
              </select>
            </label>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <button type="submit" disabled={call.isPending} className={`${primaryButton} min-h-11 w-fit`}>{t('admin.people.create')}</button>
              <p className="text-sm text-ink-muted">{t('admin.people.createNote')}</p>
              {call.isError && call.variables?.action === 'create' && <p role="alert" className="text-danger">{t(`admin.people.errors.${errorKey(call.error)}`)}</p>}
            </div>
          </form>
        </details>

        <details className={card}>
          <summary className="min-h-11 cursor-pointer py-2 font-bold text-brand-deep">{t('admin.people.addRider')}</summary>
          <form
            className="mt-2 grid gap-3 sm:grid-cols-2"
            onSubmit={(event) => {
              const form = submitted(event)
              const element = event.currentTarget
              const phone = normalisePakistaniMobile(text(form, 'phone'))
              setPhoneInvalid(!phone)
              if (!phone) return
              addRider.mutate(
                supabase.from('riders').insert({
                  branch_id: branch.id,
                  name: text(form, 'name'),
                  phone,
                  vehicle_type: optional(form, 'vehicleType'),
                  vehicle_number: optional(form, 'vehicleNumber'),
                }),
                { onSuccess: () => element.reset() },
              )
            }}
          >
            <label className={labelClass}>
              {t('admin.people.fullName')}
              <input name="name" required maxLength={60} autoComplete="off" className={`${inputClass} min-h-11`} />
            </label>
            <label className={labelClass}>
              {t('admin.people.phone')}
              <input name="phone" type="tel" inputMode="tel" required maxLength={20} autoComplete="off" dir="ltr" placeholder="0300 1234567" className={`${inputClass} min-h-11`} />
              {phoneInvalid && <span className="text-danger">{t('admin.people.errors.phone')}</span>}
            </label>
            <label className={labelClass}>
              {t('admin.people.vehicleType')} <span className="text-sm text-ink-muted">({t('admin.people.optional')})</span>
              <input name="vehicleType" maxLength={30} autoComplete="off" className={`${inputClass} min-h-11`} />
            </label>
            <label className={labelClass}>
              {t('admin.people.vehicleNumber')} <span className="text-sm text-ink-muted">({t('admin.people.optional')})</span>
              <input name="vehicleNumber" maxLength={20} autoComplete="off" dir="ltr" className={`${inputClass} min-h-11`} />
            </label>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <button type="submit" disabled={addRider.isPending} className={`${primaryButton} min-h-11 w-fit`}>{t('admin.people.createRider')}</button>
              {addRider.isSuccess && <p role="status" className="text-success">{t('admin.people.riderAdded')}</p>}
              {addRider.isError && <p role="alert" className="text-danger">{t('admin.people.errors.other')}</p>}
            </div>
          </form>
        </details>
      </div>

      <section className={`${card} mt-4`}>
        <h2 className={sectionHeading}>{t('admin.people.listHeading')}</h2>
        <div className="mt-2 grid gap-3 sm:grid-cols-3">
          <label className={labelClass}>
            {t('admin.people.search')}
            <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} autoComplete="off" className={`${inputClass} min-h-11`} />
          </label>
          <label className={labelClass}>
            {t('admin.people.role')}
            <select value={role} onChange={(event) => setRole(event.target.value)} className={`${inputClass} min-h-11`}>
              <option value="all">{t('admin.people.all')}</option>
              <option value="super_admin">{t('admin.people.roles.super_admin')}</option>
              <option value="order_staff">{t('admin.people.roles.order_staff')}</option>
              <option value="rider">{t('admin.people.roles.rider')}</option>
            </select>
          </label>
          <label className={labelClass}>
            {t('admin.people.status')}
            <select value={status} onChange={(event) => setStatus(event.target.value)} className={`${inputClass} min-h-11`}>
              <option value="all">{t('admin.people.all')}</option>
              <option value="active">{t('admin.people.active')}</option>
              <option value="inactive">{t('admin.people.inactive')}</option>
            </select>
          </label>
        </div>

        {(staff.isError || riders.isError) && <p role="alert" className="mt-3 text-danger">{t('admin.people.errors.load')}</p>}
        {(staff.isPending || riders.isPending) && <p className="mt-3">{t('admin.loading', { lng: 'en' })}</p>}
        {staff.isSuccess && riders.isSuccess && rows.length === 0 && <p className="mt-3 text-ink-muted">{t('admin.people.none')}</p>}
        <ul className="mt-3 grid gap-3 md:grid-cols-2">
          {rows.map((row) => (
            <li key={row.key}>
              <Link
                to={row.to}
                className="flex min-h-11 flex-col gap-1 rounded-control border border-line bg-surface p-3 hover:border-brand-deep"
              >
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <span className={`font-bold ${row.active ? '' : 'text-ink-muted line-through'}`}>{row.name}</span>
                  <span className={`rounded-full px-2 py-0.5 text-sm font-medium ${row.active ? 'bg-peach text-ink' : 'bg-line/40 text-ink-muted'}`}>
                    {row.active ? t('admin.people.active') : t('admin.people.inactive')}
                  </span>
                </span>
                <span className="text-sm text-ink-muted">{t(`admin.people.roles.${row.kind}`)}</span>
                {row.phone && <span dir="ltr" className="text-start text-sm">{phoneLabel(row.phone)}</span>}
                {row.email && <span dir="ltr" className="text-start text-sm break-all">{row.email}</span>}
                <span className="text-sm text-ink-muted">{t('admin.people.updated', { date: dateLabel(row.updatedAt) })}</span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-4">
        <AuditList />
      </div>
      <PasswordDialog login={login} onClose={() => setLogin(null)} />
    </div>
  )
}
