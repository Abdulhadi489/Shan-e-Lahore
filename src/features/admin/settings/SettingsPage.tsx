import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { normalisePakistaniMobile, normalisePakistaniPhone } from '../../../../supabase/functions/_shared/phone'
import { dayLabel, localPhone } from '../../../lib/format'
import { supabase } from '../../../lib/supabase'
import { useStaff } from '../StaffLayout'
import {
  card,
  headingClass,
  inputClass,
  labelClass,
  optional,
  primaryButton,
  SavedOrError,
  sectionHeading,
  submitted,
  text,
  useDbMutation,
} from '../ui'
import { FontsSection } from './FontsSection'
import { RidersSection } from './RidersSection'
import { StaffSection } from './StaffSection'

function RestaurantSection({ branchId }: { branchId: string }) {
  const { t } = useTranslation(undefined, { lng: 'en' })
  const query = useQuery({
    queryKey: ['settings-branch', branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branches')
        .select('name_en, name_ur, address_en, address_ur, phone')
        .eq('id', branchId)
        .single()
      if (error) throw error
      return data
    },
  })
  const save = useDbMutation(['settings-branch', branchId], ['branch'])
  const [phoneInvalid, setPhoneInvalid] = useState(false)
  if (!query.data) return null
  const b = query.data

  return (
    <form
      key={query.dataUpdatedAt}
      onSubmit={(event) => {
        const form = submitted(event)
        const phone = normalisePakistaniPhone(text(form, 'phone'))
        setPhoneInvalid(!phone)
        if (!phone) return
        save.mutate(
          supabase
            .from('branches')
            .update({
              name_en: text(form, 'name_en'),
              name_ur: text(form, 'name_ur'),
              address_en: text(form, 'address_en'),
              address_ur: text(form, 'address_ur'),
              phone,
            })
            .eq('id', branchId),
        )
      }}
      className={`${card} grid gap-3 sm:grid-cols-2`}
    >
      <h2 className={`${sectionHeading} sm:col-span-2`}>{t('admin.settings.restaurant.heading')}</h2>
      <label className={labelClass}>
        {t('admin.settings.restaurant.nameEn')}
        <input name="name_en" required maxLength={60} defaultValue={b.name_en} className={inputClass} />
      </label>
      <label className={labelClass}>
        {t('admin.settings.restaurant.nameUr')}
        <input name="name_ur" maxLength={60} defaultValue={b.name_ur} dir="rtl" lang="ur" className={inputClass} />
      </label>
      <label className={labelClass}>
        {t('admin.settings.restaurant.addressEn')}
        <textarea name="address_en" required maxLength={300} rows={2} defaultValue={b.address_en} className={inputClass} />
      </label>
      <label className={labelClass}>
        {t('admin.settings.restaurant.addressUr')}
        <textarea name="address_ur" maxLength={300} rows={2} defaultValue={b.address_ur} dir="rtl" lang="ur" className={inputClass} />
      </label>
      <label className={labelClass}>
        {t('admin.settings.restaurant.phone')}
        <input name="phone" type="tel" required defaultValue={localPhone(b.phone)} className={inputClass} />
        {phoneInvalid && <span className="text-danger">{t('admin.settings.restaurant.phoneInvalid')}</span>}
      </label>
      <div className="flex flex-col gap-2 sm:col-span-2">
        <button type="submit" disabled={save.isPending} className={`${primaryButton} w-fit`}>
          {t('admin.settings.save')}
        </button>
        <SavedOrError save={save} />
      </div>
    </form>
  )
}

const mobileFields = ['whatsapp_number', 'jazzcash_number', 'easypaisa_number'] as const

function PaymentsSection({ branchId }: { branchId: string }) {
  const { t } = useTranslation(undefined, { lng: 'en' })
  const query = useQuery({
    queryKey: ['settings-payments', branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('branch_settings')
        .select(
          `whatsapp_number, estimated_delivery_minutes, bank_name, bank_account_title, bank_account_number, bank_iban,
           jazzcash_account_title, jazzcash_number, easypaisa_account_title, easypaisa_number`,
        )
        .eq('branch_id', branchId)
        .single()
      if (error) throw error
      return data
    },
  })
  const save = useDbMutation(['settings-payments', branchId], ['staff-branch'], ['branch'])
  const [invalid, setInvalid] = useState<string[]>([])
  if (!query.data) return null
  const s = query.data

  const mobileInput = (name: (typeof mobileFields)[number], label: string) => (
    <label className={labelClass}>
      {label} <span className="text-sm text-ink-muted">({t('admin.settings.optional')})</span>
      <input name={name} type="tel" defaultValue={s[name] ? localPhone(s[name]) : ''} className={inputClass} />
      {invalid.includes(name) && <span className="text-danger">{t('admin.settings.payments.mobileInvalid')}</span>}
    </label>
  )
  const textInput = (name: 'bank_name' | 'bank_account_title' | 'bank_account_number' | 'jazzcash_account_title' | 'easypaisa_account_title', label: string, maxLength: number) => (
    <label className={labelClass}>
      {label} <span className="text-sm text-ink-muted">({t('admin.settings.optional')})</span>
      <input name={name} maxLength={maxLength} defaultValue={s[name] ?? ''} className={inputClass} />
    </label>
  )

  return (
    <form
      key={query.dataUpdatedAt}
      onSubmit={(event) => {
        const form = submitted(event)
        const mobiles = Object.fromEntries(
          mobileFields.map((name) => [name, text(form, name) ? normalisePakistaniMobile(text(form, name)) : null]),
        )
        const iban = text(form, 'bank_iban').replace(/\s/g, '').toUpperCase() || null
        const wrong = [
          ...mobileFields.filter((name) => text(form, name) && !mobiles[name]),
          ...(iban && !/^PK\d{2}[A-Z]{4}\d{16}$/.test(iban) ? ['bank_iban'] : []),
        ]
        setInvalid(wrong)
        if (wrong.length > 0) return
        save.mutate(
          supabase
            .from('branch_settings')
            .update({
              ...mobiles,
              estimated_delivery_minutes: Number(text(form, 'estimated_delivery_minutes')),
              bank_name: optional(form, 'bank_name'),
              bank_account_title: optional(form, 'bank_account_title'),
              bank_account_number: optional(form, 'bank_account_number'),
              bank_iban: iban,
              jazzcash_account_title: optional(form, 'jazzcash_account_title'),
              easypaisa_account_title: optional(form, 'easypaisa_account_title'),
            })
            .eq('branch_id', branchId),
        )
      }}
      className={`${card} grid gap-3 sm:grid-cols-2`}
    >
      <h2 className={`${sectionHeading} sm:col-span-2`}>{t('admin.settings.payments.heading')}</h2>
      <p className="text-ink-muted sm:col-span-2">{t('admin.settings.payments.help')}</p>
      {mobileInput('whatsapp_number', t('admin.settings.payments.whatsapp'))}
      <label className={labelClass}>
        {t('admin.settings.payments.minutes')}
        <input
          name="estimated_delivery_minutes"
          type="number"
          required
          min={10}
          max={240}
          defaultValue={s.estimated_delivery_minutes}
          className={inputClass}
        />
      </label>
      {textInput('bank_name', t('admin.settings.payments.bankName'), 60)}
      {textInput('bank_account_title', t('admin.settings.payments.bankTitle'), 60)}
      {textInput('bank_account_number', t('admin.settings.payments.bankNumber'), 30)}
      <label className={labelClass}>
        {t('admin.settings.payments.iban')} <span className="text-sm text-ink-muted">({t('admin.settings.optional')})</span>
        <input name="bank_iban" defaultValue={s.bank_iban ?? ''} className={inputClass} />
        {invalid.includes('bank_iban') && <span className="text-danger">{t('admin.settings.payments.ibanInvalid')}</span>}
      </label>
      {textInput('jazzcash_account_title', t('admin.settings.payments.jazzcashTitle'), 60)}
      {mobileInput('jazzcash_number', t('admin.settings.payments.jazzcashNumber'))}
      {textInput('easypaisa_account_title', t('admin.settings.payments.easypaisaTitle'), 60)}
      {mobileInput('easypaisa_number', t('admin.settings.payments.easypaisaNumber'))}
      <div className="flex flex-col gap-2 sm:col-span-2">
        <button type="submit" disabled={save.isPending} className={`${primaryButton} w-fit`}>
          {t('admin.settings.save')}
        </button>
        <SavedOrError save={save} />
      </div>
    </form>
  )
}

function HoursSection({ branchId }: { branchId: string }) {
  const { t } = useTranslation(undefined, { lng: 'en' })
  const query = useQuery({
    queryKey: ['settings-hours', branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('opening_hours')
        .select('weekday, open_time, close_time, is_closed')
        .eq('branch_id', branchId)
      if (error) throw error
      return data
    },
  })
  const save = useDbMutation(['settings-hours', branchId], ['branch'])
  if (!query.data) return null
  // Monday first, as people in Pakistan read a week.
  const weekdays = [1, 2, 3, 4, 5, 6, 0]
  const day = (weekday: number) => query.data.find((row) => row.weekday === weekday)

  return (
    <form
      key={query.dataUpdatedAt}
      onSubmit={(event) => {
        const form = submitted(event)
        save.mutate(
          supabase.from('opening_hours').upsert(
            weekdays.map((weekday) => ({
              branch_id: branchId,
              weekday,
              open_time: text(form, `open-${weekday}`),
              close_time: text(form, `close-${weekday}`),
              is_closed: form.get(`closed-${weekday}`) === 'on',
            })),
            { onConflict: 'branch_id,weekday' },
          ),
        )
      }}
      className={card}
    >
      <h2 className={sectionHeading}>{t('admin.settings.hours.heading')}</h2>
      <p className="text-ink-muted">{t('admin.settings.hours.help')}</p>
      <div className="mt-3 flex flex-col gap-3">
        {weekdays.map((weekday) => (
          <fieldset key={weekday} className="flex flex-wrap items-end gap-3">
            <legend className="mb-1 w-full font-bold">{dayLabel('en', weekday)}</legend>
            <label className={labelClass}>
              {t('admin.settings.hours.opens')}
              <input
                name={`open-${weekday}`}
                type="time"
                required
                defaultValue={day(weekday)?.open_time.slice(0, 5) ?? '12:00'}
                className={inputClass}
              />
            </label>
            <label className={labelClass}>
              {t('admin.settings.hours.closes')}
              <input
                name={`close-${weekday}`}
                type="time"
                required
                defaultValue={day(weekday)?.close_time.slice(0, 5) ?? '23:00'}
                className={inputClass}
              />
            </label>
            <label className="flex items-center gap-2 py-2">
              <input name={`closed-${weekday}`} type="checkbox" defaultChecked={day(weekday)?.is_closed} className="size-5" />
              {t('admin.settings.hours.closed')}
            </label>
          </fieldset>
        ))}
      </div>
      <div className="mt-3 flex flex-col gap-2">
        <button type="submit" disabled={save.isPending} className={`${primaryButton} w-fit`}>
          {t('admin.settings.save')}
        </button>
        <SavedOrError save={save} />
      </div>
    </form>
  )
}

export function SettingsPage() {
  const { t } = useTranslation(undefined, { lng: 'en' })
  const { branch } = useStaff()
  return (
    <>
      <title>{`${t('admin.settings.heading')} · ${t('brand')}`}</title>
      <h1 className={headingClass}>{t('admin.settings.heading')}</h1>
      <div className="mt-4 flex flex-col gap-6">
        <RestaurantSection branchId={branch.id} />
        <PaymentsSection branchId={branch.id} />
        <HoursSection branchId={branch.id} />
        <FontsSection />
        <RidersSection />
        <StaffSection />
      </div>
    </>
  )
}
