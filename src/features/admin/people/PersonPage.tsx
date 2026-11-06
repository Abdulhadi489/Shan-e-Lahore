import { useState } from 'react'
import { Link, Navigate, useNavigate, useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { normalisePakistaniMobile } from '../../../../supabase/functions/_shared/phone'
import { supabase } from '../../../lib/supabase'
import { localPhone, phoneLabel } from '../../../lib/format'
import { useStaff } from '../StaffLayout'
import { card, dangerButton, headingClass, inputClass, labelClass, optional, primaryButton, SavedOrError, secondaryButton, sectionHeading, submitted, text, useDbMutation } from '../ui'
import { AuditList } from './AuditList'
import { DeleteDialog, PasswordDialog } from './PeopleDialogs'
import { errorKey, usePeopleCall, useRiderList, useStaffList, type Rider, type StaffPerson } from './people'

const dateTime = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-GB', { timeZone: 'Asia/Karachi' }) : '—')

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5 border-b border-line py-2 sm:flex-row sm:gap-4">
      <dt className="text-ink-muted sm:w-48 sm:shrink-0">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  )
}

function StaffDetails({ person }: { person: StaffPerson }) {
  const { t } = useTranslation()
  const { branch, userId } = useStaff()
  const navigate = useNavigate()
  const staff = useStaffList()
  const call = usePeopleCall<{ temporaryPassword?: string; password?: string }>()
  const selfSave = useDbMutation(['people-staff'])
  const [login, setLogin] = useState<{ email: string; password: string } | null>(null)
  const [askDelete, setAskDelete] = useState(false)
  const [phoneInvalid, setPhoneInvalid] = useState(false)
  const self = person.userId === userId
  const creator = staff.data?.find((other) => other.userId === person.createdBy)?.fullName

  return (
    <>
      <section className={card}>
        <h2 className={sectionHeading}>{t('admin.people.details')}</h2>
        <dl className="mt-2">
          <Field label={t('admin.people.fullName')}>{person.fullName}</Field>
          <Field label={t('admin.people.role')}>{t(`admin.people.roles.${person.role}`)}</Field>
          <Field label={t('admin.people.status')}>{person.active ? t('admin.people.active') : t('admin.people.inactive')}</Field>
          <Field label={t('admin.people.phone')}>{person.phone ? <span dir="ltr">{phoneLabel(person.phone)}</span> : '—'}</Field>
          <Field label={t('admin.people.loginEmail')}><span dir="ltr">{person.email ?? '—'}</span></Field>
          <Field label={t('admin.people.password')}>
            {person.passwordStored ? (
              <button
                type="button"
                disabled={call.isPending}
                onClick={() =>
                  call.mutate({ action: 'viewPassword', userId: person.userId }, {
                    onSuccess: (result) => person.email && result.password && setLogin({ email: person.email, password: result.password }),
                  })
                }
                className={`${secondaryButton} min-h-11`}
              >
                {t('admin.people.showPassword')}
              </button>
            ) : (
              t('admin.people.notStored')
            )}
          </Field>
          <Field label={t('admin.people.lastSignIn')}>{dateTime(person.lastSignInAt)}</Field>
          <Field label={t('admin.people.createdAt')}>{dateTime(person.createdAt)}</Field>
          <Field label={t('admin.people.createdBy')}>{creator ?? '—'}</Field>
          <Field label={t('admin.people.updatedAt')}>{dateTime(person.updatedAt)}</Field>
        </dl>
        <p className="mt-2 text-sm text-ink-muted">{t('admin.people.passwordNote')}</p>
      </section>

      <form
        key={person.updatedAt}
        className={`${card} grid gap-3 sm:grid-cols-2`}
        onSubmit={(event) => {
          const form = submitted(event)
          const phone = text(form, 'phone') ? normalisePakistaniMobile(text(form, 'phone')) : null
          setPhoneInvalid(Boolean(text(form, 'phone')) && !phone)
          if (text(form, 'phone') && !phone) return
          if (self) {
            // A Super Admin changes their own name and phone directly; role and status stay with another Super Admin.
            selfSave.mutate(supabase.from('profiles').update({ full_name: text(form, 'fullName'), phone }).eq('user_id', person.userId))
            return
          }
          const role = text(form, 'role')
          call.mutate({
            action: 'update',
            userId: person.userId,
            fullName: text(form, 'fullName'),
            phone: text(form, 'phone'),
            role,
            branchId: role === 'order_staff' ? branch.id : null,
            active: form.get('active') === 'on',
          })
        }}
      >
        <h2 className={`${sectionHeading} sm:col-span-2`}>{t('admin.people.edit')}</h2>
        <label className={labelClass}>
          {t('admin.people.fullName')}
          <input name="fullName" required maxLength={60} defaultValue={person.fullName} autoComplete="off" className={`${inputClass} min-h-11`} />
        </label>
        <label className={labelClass}>
          {t('admin.people.phone')}
          <input name="phone" type="tel" inputMode="tel" maxLength={20} defaultValue={person.phone ? localPhone(person.phone) : ''} autoComplete="off" dir="ltr" className={`${inputClass} min-h-11`} />
          {phoneInvalid && <span className="text-danger">{t('admin.people.errors.phone')}</span>}
        </label>
        <label className={labelClass}>
          {t('admin.people.role')}
          <select name="role" defaultValue={person.role} disabled={self} className={`${inputClass} min-h-11`}>
            <option value="order_staff">{t('admin.people.roles.order_staff')}</option>
            <option value="super_admin">{t('admin.people.roles.super_admin')}</option>
          </select>
        </label>
        <label className="flex min-h-11 items-center gap-2 self-end">
          <input name="active" type="checkbox" defaultChecked={person.active} disabled={self} className="size-5" />
          {t('admin.people.active')}
        </label>
        {self && <p className="text-sm text-ink-muted sm:col-span-2">{t('admin.people.selfNote')}</p>}
        <div className="flex flex-col gap-2 sm:col-span-2">
          <button type="submit" disabled={call.isPending || selfSave.isPending} className={`${primaryButton} min-h-11 w-fit`}>{t('admin.people.save')}</button>
          {call.isSuccess && call.variables?.action === 'update' && <p role="status" className="text-success">{t('admin.people.saved')}</p>}
          {call.isError && <p role="alert" className="text-danger">{t(`admin.people.errors.${errorKey(call.error)}`)}</p>}
          {self && <SavedOrError save={selfSave} />}
        </div>
      </form>

      {!self && (
        <section className={`${card} flex flex-col gap-3`}>
          <h2 className={sectionHeading}>{t('admin.people.actions.heading')}</h2>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={call.isPending}
              onClick={() =>
                call.mutate({ action: 'resetPassword', userId: person.userId }, {
                  onSuccess: (result) => person.email && result.temporaryPassword && setLogin({ email: person.email, password: result.temporaryPassword }),
                })
              }
              className={`${secondaryButton} min-h-11`}
            >
              {t('admin.people.resetPassword')}
            </button>
            <button type="button" onClick={() => setAskDelete(true)} className={`${dangerButton} min-h-11`}>
              {t('admin.people.delete')}
            </button>
          </div>
          <p className="text-sm text-ink-muted">{t('admin.people.resetNote')}</p>
        </section>
      )}

      <PasswordDialog login={login} onClose={() => setLogin(null)} />
      <DeleteDialog
        name={person.fullName}
        open={askDelete}
        busy={call.isPending}
        onClose={() => setAskDelete(false)}
        onConfirm={() => call.mutate({ action: 'remove', userId: person.userId }, { onSuccess: () => void navigate('/admin/people') })}
      />
    </>
  )
}

function RiderDetails({ rider }: { rider: Rider }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const staff = useStaffList()
  const save = useDbMutation(['people-riders'], ['branch'])
  const call = usePeopleCall()
  const [askDelete, setAskDelete] = useState(false)
  const [phoneInvalid, setPhoneInvalid] = useState(false)
  const creator = staff.data?.find((other) => other.userId === rider.created_by)?.fullName

  return (
    <>
      <section className={card}>
        <h2 className={sectionHeading}>{t('admin.people.details')}</h2>
        <dl className="mt-2">
          <Field label={t('admin.people.fullName')}>{rider.name}</Field>
          <Field label={t('admin.people.role')}>{t('admin.people.roles.rider')}</Field>
          <Field label={t('admin.people.status')}>{rider.is_active ? t('admin.people.active') : t('admin.people.inactive')}</Field>
          <Field label={t('admin.people.phone')}><span dir="ltr">{phoneLabel(rider.phone)}</span></Field>
          <Field label={t('admin.people.vehicleType')}>{rider.vehicle_type ?? '—'}</Field>
          <Field label={t('admin.people.vehicleNumber')}><span dir="ltr">{rider.vehicle_number ?? '—'}</span></Field>
          <Field label={t('admin.people.createdAt')}>{dateTime(rider.created_at)}</Field>
          <Field label={t('admin.people.createdBy')}>{creator ?? '—'}</Field>
          <Field label={t('admin.people.updatedAt')}>{dateTime(rider.updated_at)}</Field>
        </dl>
        <p className="mt-2 text-sm text-ink-muted">{t('admin.people.riderNote')}</p>
      </section>

      <form
        key={rider.updated_at}
        className={`${card} grid gap-3 sm:grid-cols-2`}
        onSubmit={(event) => {
          const form = submitted(event)
          const phone = normalisePakistaniMobile(text(form, 'phone'))
          setPhoneInvalid(!phone)
          if (!phone) return
          save.mutate(
            supabase
              .from('riders')
              .update({
                name: text(form, 'name'),
                phone,
                vehicle_type: optional(form, 'vehicleType'),
                vehicle_number: optional(form, 'vehicleNumber'),
                is_active: form.get('active') === 'on',
              })
              .eq('id', rider.id),
          )
        }}
      >
        <h2 className={`${sectionHeading} sm:col-span-2`}>{t('admin.people.edit')}</h2>
        <label className={labelClass}>
          {t('admin.people.fullName')}
          <input name="name" required maxLength={60} defaultValue={rider.name} autoComplete="off" className={`${inputClass} min-h-11`} />
        </label>
        <label className={labelClass}>
          {t('admin.people.phone')}
          <input name="phone" type="tel" inputMode="tel" required maxLength={20} defaultValue={localPhone(rider.phone)} autoComplete="off" dir="ltr" className={`${inputClass} min-h-11`} />
          {phoneInvalid && <span className="text-danger">{t('admin.people.errors.phone')}</span>}
        </label>
        <label className={labelClass}>
          {t('admin.people.vehicleType')}
          <input name="vehicleType" maxLength={30} defaultValue={rider.vehicle_type ?? ''} autoComplete="off" className={`${inputClass} min-h-11`} />
        </label>
        <label className={labelClass}>
          {t('admin.people.vehicleNumber')}
          <input name="vehicleNumber" maxLength={20} defaultValue={rider.vehicle_number ?? ''} autoComplete="off" dir="ltr" className={`${inputClass} min-h-11`} />
        </label>
        <label className="flex min-h-11 items-center gap-2 sm:col-span-2">
          <input name="active" type="checkbox" defaultChecked={rider.is_active} className="size-5" />
          {t('admin.people.active')}
        </label>
        <div className="flex flex-col gap-2 sm:col-span-2">
          <button type="submit" disabled={save.isPending} className={`${primaryButton} min-h-11 w-fit`}>{t('admin.people.save')}</button>
          <SavedOrError save={save} />
        </div>
      </form>

      <section className={`${card} flex flex-col gap-3`}>
        <h2 className={sectionHeading}>{t('admin.people.actions.heading')}</h2>
        <div>
          <button type="button" onClick={() => setAskDelete(true)} className={`${dangerButton} min-h-11`}>{t('admin.people.delete')}</button>
        </div>
        {call.isError && <p role="alert" className="text-danger">{t(`admin.people.errors.${errorKey(call.error)}`)}</p>}
      </section>
      <DeleteDialog
        name={rider.name}
        open={askDelete}
        busy={call.isPending}
        onClose={() => setAskDelete(false)}
        onConfirm={() => call.mutate({ action: 'removeRider', riderId: rider.id }, { onSuccess: () => void navigate('/admin/people') })}
      />
    </>
  )
}

export function PersonPage() {
  const { t, i18n } = useTranslation()
  const { kind, id } = useParams()
  const staff = useStaffList()
  const riders = useRiderList()
  const person = staff.data?.find((candidate) => candidate.userId === id)
  const rider = riders.data?.find((candidate) => candidate.id === id)
  const loaded = kind === 'staff' ? staff.isSuccess : riders.isSuccess
  if (loaded && !(kind === 'staff' ? person : rider)) return <Navigate to="/admin/people" replace />

  return (
    <div lang={i18n.language} dir={i18n.dir()} className="flex flex-col gap-4">
      <title>{`${t('admin.people.heading')} · ${t('brand')}`}</title>
      <Link to="/admin/people" className="inline-flex min-h-11 w-fit items-center text-brand-deep underline">{t('admin.people.back')}</Link>
      <h1 className={headingClass}>{person?.fullName ?? rider?.name ?? t('admin.people.heading')}</h1>
      {(staff.isError || riders.isError) && <p role="alert" className="text-danger">{t('admin.people.errors.load')}</p>}
      {kind === 'staff' && person && <StaffDetails person={person} />}
      {kind === 'rider' && rider && <RiderDetails rider={rider} />}
      {id && <AuditList rowId={id} />}
    </div>
  )
}
