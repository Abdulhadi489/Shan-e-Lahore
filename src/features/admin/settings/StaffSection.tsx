import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { invoke, OrderApiError } from '../../checkout/orderApi'
import { supabase } from '../../../lib/supabase'
import { useStaff } from '../StaffLayout'
import { card, inputClass, labelClass, primaryButton, secondaryButton, sectionHeading, submitted, text } from '../ui'

type Role = 'customer' | 'order_staff' | 'super_admin'
type StaffRequest = { action: 'create' | 'setAccess' | 'resetPassword' } & Record<string, unknown>
const roles: Role[] = ['order_staff', 'super_admin', 'customer']
const staffErrors = [
  'EMAIL_TAKEN',
  'WEAK_PASSWORD',
  'CANNOT_CHANGE_OWN_ACCESS',
  'TWO_SUPER_ADMINS_REQUIRED',
  'ACCOUNT_NOT_FOUND',
  'BRANCH_REQUIRED',
] as const

// Logins, roles and passwords change only through the admin-users Edge Function.
export function StaffSection() {
  const { t } = useTranslation(undefined, { lng: 'en' })
  const { branch, userId } = useStaff()
  const queryClient = useQueryClient()
  const profiles = useQuery({
    queryKey: ['staff-accounts'],
    queryFn: async () => {
      const { data, error } = await supabase.from('profiles').select('user_id, full_name, role, is_active').order('full_name')
      if (error) throw error
      return data
    },
  })
  const call = useMutation({
    mutationFn: (body: StaffRequest) => invoke<{ userId?: string }>('admin-users', body),
    onSettled: () => queryClient.invalidateQueries({ queryKey: ['staff-accounts'] }),
  })
  // shortcut: one branch, so Order Staff always belong to it; add a branch choice for a second branch.
  const branchFor = (role: string) => (role === 'order_staff' ? branch.id : null)
  const errorCode = call.error instanceof OrderApiError ? call.error.code : null
  const roleLabel = (role: Role) => (role === 'customer' ? t('admin.settings.staff.noAccess') : t(`admin.roles.${role}`))

  return (
    <section className={card}>
      <h2 className={sectionHeading}>{t('admin.settings.staff.heading')}</h2>
      <p className="text-ink-muted">{t('admin.settings.staff.help')}</p>

      <ul className="mt-3 flex flex-col gap-3">
        {profiles.data?.map((profile) => (
          <li key={profile.user_id} className="border-b border-line pb-3">
            {profile.user_id === userId ? (
              <p>
                <span className="font-bold">{profile.full_name}</span> ({t('admin.settings.staff.you')}) · {roleLabel(profile.role)}
              </p>
            ) : (
              <>
                <form
                  onSubmit={(event) => {
                    const form = submitted(event)
                    const role = text(form, 'role')
                    call.mutate({
                      action: 'setAccess',
                      userId: profile.user_id,
                      role,
                      branchId: branchFor(role),
                      active: form.get('active') === 'on',
                    })
                  }}
                  className="flex flex-wrap items-end gap-3"
                >
                  <p className={`w-full font-bold ${profile.is_active ? '' : 'text-ink-muted line-through'}`}>{profile.full_name}</p>
                  <label className={labelClass}>
                    {t('admin.settings.staff.role')}
                    <select name="role" defaultValue={profile.role} className={inputClass}>
                      {roles.map((role) => (
                        <option key={role} value={role}>
                          {roleLabel(role)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="flex items-center gap-2 py-2">
                    <input name="active" type="checkbox" defaultChecked={profile.is_active} className="size-5" />
                    {t('admin.settings.staff.active')}
                  </label>
                  <button type="submit" disabled={call.isPending} className={secondaryButton}>
                    {t('admin.settings.save')}
                  </button>
                </form>
                <details className="mt-2">
                  <summary className="cursor-pointer text-brand-deep underline">{t('admin.settings.staff.resetPassword')}</summary>
                  <form
                    onSubmit={(event) => {
                      const form = submitted(event)
                      const element = event.currentTarget
                      call.mutate(
                        { action: 'resetPassword', userId: profile.user_id, password: String(form.get('password')) },
                        { onSuccess: () => element.reset() },
                      )
                    }}
                    className="mt-2 flex flex-wrap items-end gap-3"
                  >
                    <label className={labelClass}>
                      {t('admin.settings.staff.newPassword')}
                      <input name="password" type="text" required minLength={12} maxLength={72} autoComplete="off" className={inputClass} />
                    </label>
                    <button type="submit" disabled={call.isPending} className={secondaryButton}>
                      {t('admin.settings.staff.resetPassword')}
                    </button>
                  </form>
                </details>
              </>
            )}
          </li>
        ))}
      </ul>

      <form
        onSubmit={(event) => {
          const form = submitted(event)
          const role = text(form, 'role')
          const element = event.currentTarget
          call.mutate(
            {
              action: 'create',
              fullName: text(form, 'fullName'),
              email: text(form, 'email'),
              password: String(form.get('password')),
              role,
              branchId: branchFor(role),
            },
            { onSuccess: () => element.reset() },
          )
        }}
        className="mt-6 grid gap-3 sm:grid-cols-2"
      >
        <h3 className="font-heading text-xl font-bold sm:col-span-2">{t('admin.settings.staff.addHeading')}</h3>
        <label className={labelClass}>
          {t('admin.settings.staff.fullName')}
          <input name="fullName" required maxLength={60} className={inputClass} />
        </label>
        <label className={labelClass}>
          {t('admin.settings.staff.email')}
          <input name="email" type="email" required maxLength={254} autoComplete="off" className={inputClass} />
        </label>
        <label className={labelClass}>
          {t('admin.settings.staff.password')}
          <input name="password" type="text" required minLength={12} maxLength={72} autoComplete="off" className={inputClass} />
        </label>
        <label className={labelClass}>
          {t('admin.settings.staff.role')}
          <select name="role" defaultValue="order_staff" className={inputClass}>
            {roles
              .filter((role) => role !== 'customer')
              .map((role) => (
                <option key={role} value={role}>
                  {roleLabel(role)}
                </option>
              ))}
          </select>
        </label>
        <button type="submit" disabled={call.isPending} className={`${primaryButton} w-fit sm:col-span-2`}>
          {t('admin.settings.staff.create')}
        </button>
      </form>

      <div role="status" className="mt-3">
        {call.isSuccess && (
          <p className="text-success">
            {call.variables.action === 'create'
              ? t('admin.settings.staff.created')
              : call.variables.action === 'resetPassword'
                ? t('admin.settings.staff.passwordReset')
                : t('admin.settings.saved')}
          </p>
        )}
        {call.isError && (
          <p role="alert" className="text-danger">
            {t(`admin.settings.staff.errors.${staffErrors.find((code) => code === errorCode) ?? 'other'}`)}
          </p>
        )}
      </div>
    </section>
  )
}
