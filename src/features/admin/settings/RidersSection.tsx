import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { normalisePakistaniMobile } from '../../../../supabase/functions/_shared/phone'
import { localPhone } from '../../../lib/format'
import { supabase } from '../../../lib/supabase'
import { useStaff } from '../StaffLayout'
import { card, inputClass, labelClass, primaryButton, SaveError, secondaryButton, sectionHeading, submitted, text, useDbMutation } from '../ui'

// Riders are never deleted, because past orders point to them; leavers are made inactive.
export function RidersSection() {
  const { t } = useTranslation(undefined, { lng: 'en' })
  const { branch } = useStaff()
  const save = useDbMutation(['staff-branch'])
  const [phoneInvalid, setPhoneInvalid] = useState<string | null>(null)
  const riders = branch.riders.toSorted((a, b) => Number(b.is_active) - Number(a.is_active) || a.name.localeCompare(b.name))

  const fields = (rider?: (typeof riders)[number]) => (
    <>
      <label className={labelClass}>
        {t('admin.settings.riders.name')}
        <input name="name" required maxLength={60} defaultValue={rider?.name} className={inputClass} />
      </label>
      <label className={labelClass}>
        {t('admin.settings.riders.phone')}
        <input name="phone" type="tel" required defaultValue={rider ? localPhone(rider.phone) : ''} className={inputClass} />
        {phoneInvalid === (rider?.id ?? 'new') && <span className="text-danger">{t('admin.settings.payments.mobileInvalid')}</span>}
      </label>
    </>
  )

  const riderPhone = (form: FormData, id: string) => {
    const phone = normalisePakistaniMobile(text(form, 'phone'))
    setPhoneInvalid(phone ? null : id)
    return phone
  }

  return (
    <section className={card}>
      <h2 className={sectionHeading}>{t('admin.settings.riders.heading')}</h2>
      {riders.length === 0 && <p className="text-ink-muted">{t('admin.settings.riders.none')}</p>}
      <ul className="mt-3 flex flex-col gap-3">
        {riders.map((rider) => (
          <li key={rider.id}>
            <form
              onSubmit={(event) => {
                const form = submitted(event)
                const phone = riderPhone(form, rider.id)
                if (!phone) return
                save.mutate(
                  supabase
                    .from('riders')
                    .update({ name: text(form, 'name'), phone, is_active: form.get('is_active') === 'on' })
                    .eq('id', rider.id),
                )
              }}
              className="flex flex-wrap items-end gap-3 border-b border-line pb-3"
            >
              {fields(rider)}
              <label className="flex items-center gap-2 py-2">
                <input name="is_active" type="checkbox" defaultChecked={rider.is_active} className="size-5" />
                {t('admin.settings.riders.active')}
              </label>
              <button type="submit" disabled={save.isPending} className={secondaryButton}>
                {t('admin.settings.save')}
              </button>
            </form>
          </li>
        ))}
      </ul>
      <form
        onSubmit={(event) => {
          const form = submitted(event)
          const phone = riderPhone(form, 'new')
          if (!phone) return
          const element = event.currentTarget
          save.mutate(supabase.from('riders').insert({ branch_id: branch.id, name: text(form, 'name'), phone }), {
            onSuccess: () => element.reset(),
          })
        }}
        className="mt-4 flex flex-wrap items-end gap-3"
      >
        {fields()}
        <button type="submit" disabled={save.isPending} className={primaryButton}>
          {t('admin.settings.riders.add')}
        </button>
      </form>
      <SaveError error={save.error} />
    </section>
  )
}
