import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../../lib/supabase'
import { useStaff } from '../StaffLayout'
import { card, headingClass, inputClass, primaryButton, SaveError, secondaryButton, sectionHeading, useDbMutation } from '../ui'

const bySortOrder = (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order

// Order Staff may change only delivery_enabled and is_available; database triggers refuse anything else.
export function AvailabilityPage() {
  const { t } = useTranslation(undefined, { lng: 'en' })
  const { branch } = useStaff()
  const [search, setSearch] = useState('')
  const key = ['availability', branch.id]
  const data = useQuery({
    queryKey: key,
    queryFn: async () => {
      const [settings, categories, groups] = await Promise.all([
        supabase.from('branch_settings').select('delivery_enabled').eq('branch_id', branch.id).single(),
        supabase
          .from('categories')
          .select('id, name_en, sort_order, items ( id, name_en, is_available, is_hidden, sort_order, item_variants ( id, name_en, is_available, sort_order ) )')
          .eq('branch_id', branch.id),
        supabase
          .from('addon_groups')
          .select('id, name_en, addon_options ( id, name_en, is_available, sort_order )')
          .eq('branch_id', branch.id),
      ])
      if (settings.error) throw settings.error
      if (categories.error) throw categories.error
      if (groups.error) throw groups.error
      return { deliveryEnabled: settings.data.delivery_enabled, categories: categories.data, groups: groups.data }
    },
  })
  const save = useDbMutation(key, ['menu'], ['branch'])

  if (data.isPending) return <p>{t('admin.loading')}</p>
  if (data.isError) return <p role="alert">{t('admin.errors.loadFailed')}</p>

  const { deliveryEnabled, categories, groups } = data.data
  const matches = (name: string) => name.toLowerCase().includes(search.trim().toLowerCase())
  const shownCategories = categories
    .toSorted(bySortOrder)
    .map((category) => ({ ...category, items: category.items.filter((item) => matches(item.name_en)).sort(bySortOrder) }))
    .filter((category) => category.items.length > 0)

  const toggle = (table: 'items' | 'item_variants' | 'addon_options', id: string, isAvailable: boolean) =>
    save.mutate(supabase.from(table).update({ is_available: isAvailable }).eq('id', id))

  const availableBox = (table: 'items' | 'item_variants' | 'addon_options', row: { id: string; name_en: string; is_available: boolean }) => (
    <label className="flex items-center gap-2">
      <input
        type="checkbox"
        checked={row.is_available}
        disabled={save.isPending}
        onChange={(event) => toggle(table, row.id, event.target.checked)}
        className="size-5"
      />
      <span className={row.is_available ? '' : 'text-danger line-through'}>{row.name_en}</span>
      {!row.is_available && <span className="text-sm font-bold text-danger">{t('admin.availability.soldOut')}</span>}
    </label>
  )

  return (
    <>
      <title>{`${t('admin.availability.heading')} · ${t('brand')}`}</title>
      <h1 className={headingClass}>{t('admin.availability.heading')}</h1>

      <section className={`${card} mt-4 flex flex-wrap items-center gap-3`}>
        <p className={`font-bold ${deliveryEnabled ? 'text-success' : 'text-danger'}`}>
          {t(deliveryEnabled ? 'admin.availability.deliveryOn' : 'admin.availability.deliveryOff')}
        </p>
        <button
          type="button"
          disabled={save.isPending}
          onClick={() => {
            if (deliveryEnabled && !window.confirm(t('admin.availability.pauseConfirm'))) return
            save.mutate(supabase.from('branch_settings').update({ delivery_enabled: !deliveryEnabled }).eq('branch_id', branch.id))
          }}
          className={deliveryEnabled ? secondaryButton : primaryButton}
        >
          {t(deliveryEnabled ? 'admin.availability.pause' : 'admin.availability.resume')}
        </button>
      </section>
      <SaveError error={save.error} />

      <h2 className={`${sectionHeading} mt-8`}>{t('admin.availability.soldOut')}</h2>
      <p className="text-ink-muted">{t('admin.availability.soldOutHelp')}</p>
      <label className="mt-3 flex max-w-sm flex-col gap-1">
        {t('admin.availability.search')}
        <input type="search" value={search} onChange={(event) => setSearch(event.target.value)} className={inputClass} />
      </label>

      {shownCategories.length === 0 && <p className="mt-4 text-ink-muted">{t('admin.availability.noMatch')}</p>}
      <div className="mt-4 grid gap-4 md:grid-cols-2">
        {shownCategories.map((category) => (
          <section key={category.id} className={card}>
            <h3 className="font-heading text-xl font-bold">{category.name_en}</h3>
            <ul className="mt-2 flex flex-col gap-2">
              {category.items.map((item) => (
                <li key={item.id}>
                  {availableBox('items', item)}
                  {item.is_hidden && <span className="ms-7 text-sm text-ink-muted">{t('admin.availability.hidden')}</span>}
                  {item.item_variants.length > 0 && (
                    <ul className="ms-7 mt-1 flex flex-col gap-1">
                      {item.item_variants.toSorted(bySortOrder).map((variant) => (
                        <li key={variant.id}>{availableBox('item_variants', variant)}</li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          </section>
        ))}
        {groups.length > 0 && !search && (
          <section className={card}>
            <h3 className="font-heading text-xl font-bold">{t('admin.availability.addons')}</h3>
            {groups.map((group) => (
              <div key={group.id} className="mt-2">
                <p className="font-bold">{group.name_en}</p>
                <ul className="ms-2 mt-1 flex flex-col gap-1">
                  {group.addon_options.toSorted(bySortOrder).map((option) => (
                    <li key={option.id}>{availableBox('addon_options', option)}</li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        )}
      </div>
    </>
  )
}
