import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../../lib/supabase'
import { useStaff } from '../StaffLayout'
import { card, dangerButton, inputClass, labelClass, primaryButton, SaveError, secondaryButton, submitted, text, useDbMutation } from '../ui'
import { MenuNav } from './MenuAdminPage'

const bySortOrder = (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order

// The database keeps min_select <= max_select and refuses negative prices.
export function AddonGroupsPage() {
  const { t } = useTranslation(undefined, { lng: 'en' })
  const { branch } = useStaff()
  const key = ['admin-addon-groups', branch.id]
  const groups = useQuery({
    queryKey: [...key, 'options'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('addon_groups')
        .select('id, name_en, name_ur, min_select, max_select, addon_options ( id, name_en, name_ur, extra_price, is_available, sort_order )')
        .eq('branch_id', branch.id)
        .order('name_en')
      if (error) throw error
      return data.map((group) => ({ ...group, addon_options: group.addon_options.toSorted(bySortOrder) }))
    },
  })
  const save = useDbMutation(key, ['menu'])

  const nameFields = (row?: { name_en: string; name_ur: string }) => (
    <>
      <label className={labelClass}>
        {t('admin.menu.nameEn')}
        <input name="name_en" required maxLength={60} defaultValue={row?.name_en} className={`${inputClass} w-40`} />
      </label>
      <label className={labelClass}>
        {t('admin.menu.nameUr')}
        <input name="name_ur" maxLength={60} defaultValue={row?.name_ur} dir="rtl" lang="ur" className={`${inputClass} w-40`} />
      </label>
    </>
  )
  const groupFields = (group?: { name_en: string; name_ur: string; min_select: number; max_select: number }) => (
    <>
      {nameFields(group)}
      <label className={labelClass}>
        {t('admin.menu.addons.min')}
        <input name="min_select" type="number" required min={0} max={20} defaultValue={group?.min_select ?? 0} className={`${inputClass} w-20`} />
      </label>
      <label className={labelClass}>
        {t('admin.menu.addons.max')}
        <input name="max_select" type="number" required min={1} max={20} defaultValue={group?.max_select ?? 1} className={`${inputClass} w-20`} />
      </label>
    </>
  )
  const groupValues = (form: FormData) => ({
    name_en: text(form, 'name_en'),
    name_ur: text(form, 'name_ur'),
    min_select: Number(text(form, 'min_select')),
    max_select: Number(text(form, 'max_select')),
  })
  const optionFields = (option?: { name_en: string; name_ur: string; extra_price: number; sort_order: number }) => (
    <>
      {nameFields(option)}
      <label className={labelClass}>
        {t('admin.menu.addons.extraPrice')}
        <input name="extra_price" type="number" required min={0} max={100000} defaultValue={option?.extra_price ?? 0} className={`${inputClass} w-24`} />
      </label>
      <label className={labelClass}>
        {t('admin.menu.sortOrder')}
        <input name="sort_order" type="number" required defaultValue={option?.sort_order ?? 0} className={`${inputClass} w-20`} />
      </label>
    </>
  )
  const optionValues = (form: FormData) => ({
    name_en: text(form, 'name_en'),
    name_ur: text(form, 'name_ur'),
    extra_price: Number(text(form, 'extra_price')),
    sort_order: Number(text(form, 'sort_order')),
  })
  const deleteButton = (name: string, remove: () => void) => (
    <button
      type="button"
      disabled={save.isPending}
      onClick={() => window.confirm(t('admin.menu.deleteConfirm', { name })) && remove()}
      className={dangerButton}
    >
      {t('admin.menu.delete')}
    </button>
  )

  return (
    <>
      <title>{`${t('admin.menu.sections.addons')} · ${t('brand')}`}</title>
      <MenuNav />
      <p className="mt-3 text-ink-muted">{t('admin.menu.addons.help')}</p>
      <p className="text-sm text-ink-muted">{t('admin.menu.addons.minHelp')}</p>
      <SaveError error={save.error} />
      {groups.data?.length === 0 && <p className="mt-4">{t('admin.menu.addons.none')}</p>}

      <div className="mt-4 flex flex-col gap-4">
        {groups.data?.map((group) => (
          <section key={group.id} className={card}>
            <form
              onSubmit={(event) => save.mutate(supabase.from('addon_groups').update(groupValues(submitted(event))).eq('id', group.id))}
              className="flex flex-wrap items-end gap-3"
            >
              {groupFields(group)}
              <button type="submit" disabled={save.isPending} className={secondaryButton}>
                {t('admin.menu.save')}
              </button>
              {deleteButton(group.name_en, () => save.mutate(supabase.from('addon_groups').delete().eq('id', group.id)))}
            </form>

            <h3 className="mt-4 font-bold">{t('admin.menu.addons.options')}</h3>
            <ul className="mt-2 flex flex-col gap-3">
              {group.addon_options.map((option) => (
                <li key={option.id}>
                  <form
                    onSubmit={(event) => {
                      const form = submitted(event)
                      save.mutate(
                        supabase
                          .from('addon_options')
                          .update({ ...optionValues(form), is_available: form.get('is_available') === 'on' })
                          .eq('id', option.id),
                      )
                    }}
                    className="flex flex-wrap items-end gap-3 border-b border-line pb-3"
                  >
                    {optionFields(option)}
                    <label className="flex items-center gap-2 py-2">
                      <input name="is_available" type="checkbox" defaultChecked={option.is_available} className="size-5" />
                      {t('admin.menu.item.available')}
                    </label>
                    <button type="submit" disabled={save.isPending} className={secondaryButton}>
                      {t('admin.menu.save')}
                    </button>
                    {deleteButton(option.name_en, () => save.mutate(supabase.from('addon_options').delete().eq('id', option.id)))}
                  </form>
                </li>
              ))}
            </ul>
            <form
              onSubmit={(event) => {
                const form = submitted(event)
                const element = event.currentTarget
                save.mutate(
                  supabase.from('addon_options').insert({ ...optionValues(form), group_id: group.id, branch_id: branch.id }),
                  { onSuccess: () => element.reset() },
                )
              }}
              className="mt-3 flex flex-wrap items-end gap-3"
            >
              {optionFields()}
              <button type="submit" disabled={save.isPending} className={primaryButton}>
                {t('admin.menu.addons.addOption')}
              </button>
            </form>
          </section>
        ))}
      </div>

      <form
        onSubmit={(event) => {
          const form = submitted(event)
          const element = event.currentTarget
          save.mutate(supabase.from('addon_groups').insert({ ...groupValues(form), branch_id: branch.id }), {
            onSuccess: () => element.reset(),
          })
        }}
        className={`${card} mt-6 flex flex-wrap items-end gap-3`}
      >
        <h2 className="w-full font-heading text-xl font-bold">{t('admin.menu.addons.addGroup')}</h2>
        {groupFields()}
        <button type="submit" disabled={save.isPending} className={primaryButton}>
          {t('admin.menu.addons.addGroup')}
        </button>
      </form>
    </>
  )
}
