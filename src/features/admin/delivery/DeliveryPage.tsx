import { lazy, Suspense, useState } from 'react'
import { Link } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../../lib/supabase'
import { useStaff } from '../StaffLayout'
import {
  card,
  dangerButton,
  headingClass,
  inputClass,
  labelClass,
  primaryButton,
  SaveError,
  SavedOrError,
  secondaryButton,
  sectionHeading,
  submitted,
  text,
  useDbMutation,
} from '../ui'

const LocationPicker = lazy(() => import('../../checkout/LocationPicker').then((module) => ({ default: module.LocationPicker })))

// Fields that never mean anything to the Super Admin in the change log.
const hiddenFields = new Set(['id', 'branch_id', 'created_at', 'updated_at', 'last_order_number'])

function changedFields(oldValues: Record<string, unknown> | null, newValues: Record<string, unknown> | null) {
  const keys = Object.keys(newValues ?? oldValues ?? {}).filter((key) => !hiddenFields.has(key))
  return keys
    .filter((key) => !oldValues || !newValues || JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key]))
    .map((key) => {
      const show = (value: unknown) => (value === null || value === undefined ? '–' : String(value))
      if (!oldValues) return `${key}: ${show(newValues?.[key])}`
      if (!newValues) return `${key}: ${show(oldValues[key])}`
      return `${key}: ${show(oldValues[key])} → ${show(newValues[key])}`
    })
    .join(', ')
}

export function DeliveryPage() {
  const { t } = useTranslation(undefined, { lng: 'en' })
  const { branch } = useStaff()
  const key = ['admin-delivery', branch.id]
  const data = useQuery({
    queryKey: key,
    queryFn: async () => {
      const [place, tiers, settings, log, people] = await Promise.all([
        supabase.from('branches').select('lat, lng').eq('id', branch.id).single(),
        supabase.from('delivery_tiers').select('id, upper_km, charge').eq('branch_id', branch.id).order('upper_km'),
        supabase
          .from('branch_settings')
          .select('road_distance_factor, min_order_amount, free_delivery_threshold')
          .eq('branch_id', branch.id)
          .single(),
        supabase
          .from('audit_log')
          .select('id, table_name, action, old_values, new_values, changed_by, created_at')
          .in('table_name', ['branches', 'branch_settings', 'delivery_tiers'])
          .order('created_at', { ascending: false })
          .limit(30),
        supabase.from('profiles').select('user_id, full_name'),
      ])
      if (place.error) throw place.error
      if (tiers.error) throw tiers.error
      if (settings.error) throw settings.error
      if (log.error) throw log.error
      if (people.error) throw people.error
      return { place: place.data, tiers: tiers.data, settings: settings.data, log: log.data, people: people.data }
    },
  })
  const save = useDbMutation(key, ['branch'])
  const [pin, setPin] = useState<{ lat: number; lng: number } | null>(null)

  if (data.isPending) return <p>{t('admin.loading')}</p>
  if (data.isError) return <p role="alert">{t('admin.errors.loadFailed')}</p>
  const { place, tiers, settings, log, people } = data.data
  const radiusKm = Math.max(0, ...tiers.map((tier) => tier.upper_km))
  const nameOf = (userId: string | null) => people.find((person) => person.user_id === userId)?.full_name ?? t('admin.delivery.log.unknown')

  const tierFields = (tier?: (typeof tiers)[number]) => (
    <>
      <label className={labelClass}>
        {t('admin.delivery.tiers.upTo')}
        <input name="upper_km" type="number" required min={0.1} max={50} step={0.1} defaultValue={tier?.upper_km} className={`${inputClass} w-28`} />
      </label>
      <label className={labelClass}>
        {t('admin.delivery.tiers.charge')}
        <input name="charge" type="number" required min={0} max={10000} defaultValue={tier?.charge} className={`${inputClass} w-28`} />
      </label>
    </>
  )
  const tierValues = (form: FormData) => ({ upper_km: Number(text(form, 'upper_km')), charge: Number(text(form, 'charge')) })

  return (
    <>
      <title>{`${t('admin.delivery.heading')} · ${t('brand')}`}</title>
      <h1 className={headingClass}>{t('admin.delivery.heading')}</h1>
      <p className="mt-1 text-ink-muted">
        <Link to="/admin/availability" className="text-brand-deep underline">
          {t('admin.delivery.pausedHelp')}
        </Link>
      </p>
      <SaveError error={save.error} />

      <div className="mt-4 flex flex-col gap-6">
        <section className={card}>
          <h2 className={sectionHeading}>{t('admin.delivery.tiers.heading')}</h2>
          <p className="text-ink-muted">{t('admin.delivery.tiers.help')}</p>
          <ul className="mt-3 flex flex-col gap-3">
            {tiers.map((tier) => (
              <li key={`${tier.id}-${data.dataUpdatedAt}`}>
                <form
                  onSubmit={(event) => save.mutate(supabase.from('delivery_tiers').update(tierValues(submitted(event))).eq('id', tier.id))}
                  className="flex flex-wrap items-end gap-3 border-b border-line pb-3"
                >
                  {tierFields(tier)}
                  <button type="submit" disabled={save.isPending} className={secondaryButton}>
                    {t('admin.menu.save')}
                  </button>
                  <button
                    type="button"
                    disabled={save.isPending}
                    onClick={() => {
                      if (window.confirm(t('admin.menu.deleteConfirm', { name: `${tier.upper_km} km` }))) {
                        save.mutate(supabase.from('delivery_tiers').delete().eq('id', tier.id))
                      }
                    }}
                    className={dangerButton}
                  >
                    {t('admin.menu.delete')}
                  </button>
                </form>
              </li>
            ))}
          </ul>
          <form
            onSubmit={(event) => {
              const form = submitted(event)
              const element = event.currentTarget
              save.mutate(supabase.from('delivery_tiers').insert({ ...tierValues(form), branch_id: branch.id }), {
                onSuccess: () => element.reset(),
              })
            }}
            className="mt-3 flex flex-wrap items-end gap-3"
          >
            {tierFields()}
            <button type="submit" disabled={save.isPending} className={primaryButton}>
              {t('admin.delivery.tiers.add')}
            </button>
          </form>
        </section>

        <form
          key={data.dataUpdatedAt}
          onSubmit={(event) => {
            const form = submitted(event)
            save.mutate(
              supabase
                .from('branch_settings')
                .update({
                  road_distance_factor: Number(text(form, 'road_distance_factor')),
                  min_order_amount: Number(text(form, 'min_order_amount')),
                  free_delivery_threshold: text(form, 'free_delivery_threshold') ? Number(text(form, 'free_delivery_threshold')) : null,
                })
                .eq('branch_id', branch.id),
            )
          }}
          className={`${card} grid gap-3 sm:grid-cols-3`}
        >
          <h2 className={`${sectionHeading} sm:col-span-3`}>{t('admin.delivery.rules.heading')}</h2>
          <label className={labelClass}>
            {t('admin.delivery.rules.roadFactor')}
            <input
              name="road_distance_factor"
              type="number"
              required
              min={1}
              max={3}
              step={0.05}
              defaultValue={settings.road_distance_factor}
              className={inputClass}
            />
            <span className="text-sm text-ink-muted">{t('admin.delivery.rules.roadFactorHelp')}</span>
          </label>
          <label className={labelClass}>
            {t('admin.delivery.rules.minOrder')}
            <input name="min_order_amount" type="number" required min={0} max={100000} defaultValue={settings.min_order_amount} className={inputClass} />
            <span className="text-sm text-ink-muted">{t('admin.delivery.rules.minOrderHelp')}</span>
          </label>
          <label className={labelClass}>
            {t('admin.delivery.rules.freeThreshold')}
            <input
              name="free_delivery_threshold"
              type="number"
              min={1}
              max={100000}
              defaultValue={settings.free_delivery_threshold ?? ''}
              className={inputClass}
            />
            <span className="text-sm text-ink-muted">{t('admin.delivery.rules.freeThresholdHelp')}</span>
          </label>
          <div className="flex flex-col gap-2 sm:col-span-3">
            <button type="submit" disabled={save.isPending} className={`${primaryButton} w-fit`}>
              {t('admin.menu.save')}
            </button>
            <SavedOrError save={save} />
          </div>
        </form>

        <section className={card}>
          <h2 className={sectionHeading}>{t('admin.delivery.location.heading')}</h2>
          <p className="mb-3 text-ink-muted">{t('admin.delivery.location.help')}</p>
          <Suspense fallback={<p>{t('admin.loading')}</p>}>
            <LocationPicker branch={{ lat: place.lat, lng: place.lng }} radiusKm={radiusKm} pin={pin} onChange={setPin} />
          </Suspense>
          {pin ? (
            <button
              type="button"
              disabled={save.isPending}
              onClick={() =>
                save.mutate(
                  supabase
                    .from('branches')
                    .update({ lat: Number(pin.lat.toFixed(6)), lng: Number(pin.lng.toFixed(6)) })
                    .eq('id', branch.id),
                  { onSuccess: () => setPin(null) },
                )
              }
              className={`${primaryButton} mt-3`}
            >
              {t('admin.delivery.location.save')}
            </button>
          ) : (
            <p className="mt-3 text-sm text-ink-muted">{t('admin.delivery.location.unchanged')}</p>
          )}
        </section>

        <section className={card}>
          <h2 className={sectionHeading}>{t('admin.delivery.log.heading')}</h2>
          <p className="text-ink-muted">{t('admin.delivery.log.help')}</p>
          {log.length === 0 && <p className="mt-2">{t('admin.delivery.log.empty')}</p>}
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {log.map((entry) => (
              <li key={entry.id} className="border-b border-line pb-2">
                <span className="font-bold">
                  {new Date(entry.created_at).toLocaleString('en-PK', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Karachi' })}
                </span>{' '}
                · {nameOf(entry.changed_by)} · {t(`admin.delivery.log.tables.${entry.table_name as 'branches'}`)}
                {entry.action !== 'update' && ` ${t(`admin.delivery.log.${entry.action === 'insert' ? 'added' : 'deleted'}`)}`}
                <span className="block text-ink-muted">
                  {changedFields(entry.old_values as Record<string, unknown> | null, entry.new_values as Record<string, unknown> | null)}
                </span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  )
}
