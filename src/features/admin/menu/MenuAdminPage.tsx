import { Link, NavLink } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { formatAmount } from '../../../lib/money'
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
  secondaryButton,
  submitted,
  text,
  useDbMutation,
} from '../ui'

const bySortOrder = (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order

// Everything in the branch, including hidden categories and dishes (staff RLS returns them).
export function useAdminMenu(branchId: string) {
  return useQuery({
    queryKey: ['admin-menu', branchId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select(
          `id, name_en, name_ur, sort_order, is_active, is_side,
           items ( id, name_en, base_price, image_path, is_available, is_hidden, is_deal, is_featured, sort_order )`,
        )
        .eq('branch_id', branchId)
      if (error) throw error
      return data.toSorted(bySortOrder).map((category) => ({ ...category, items: category.items.toSorted(bySortOrder) }))
    },
  })
}

export function MenuNav() {
  const { t } = useTranslation(undefined, { lng: 'en' })
  const link = 'rounded-control border border-ink-muted bg-raised px-3 py-2 font-bold aria-[current=page]:border-ink aria-[current=page]:bg-ink aria-[current=page]:text-raised'
  return (
    <>
      <h1 className={headingClass}>{t('admin.menu.heading')}</h1>
      <nav className="mt-3 flex flex-wrap gap-2">
        <NavLink to="/admin/menu" end className={link}>
          {t('admin.menu.sections.dishes')}
        </NavLink>
        <NavLink to="/admin/menu/addons" className={link}>
          {t('admin.menu.sections.addons')}
        </NavLink>
        <NavLink to="/admin/menu/banners" className={link}>
          {t('admin.menu.sections.banners')}
        </NavLink>
      </nav>
    </>
  )
}

export function MenuAdminPage() {
  const { t } = useTranslation(undefined, { lng: 'en' })
  const { branch } = useStaff()
  const menu = useAdminMenu(branch.id)
  const save = useDbMutation(['admin-menu', branch.id], ['menu'])

  const categoryFields = (category?: NonNullable<typeof menu.data>[number]) => (
    <>
      <label className={labelClass}>
        {t('admin.menu.nameEn')}
        <input name="name_en" required maxLength={60} defaultValue={category?.name_en} className={inputClass} />
      </label>
      <label className={labelClass}>
        {t('admin.menu.nameUr')}
        <input name="name_ur" maxLength={60} defaultValue={category?.name_ur} dir="rtl" lang="ur" className={inputClass} />
      </label>
      <label className={labelClass}>
        {t('admin.menu.sortOrder')}
        <input name="sort_order" type="number" required defaultValue={category?.sort_order ?? (menu.data?.length ?? 0) + 1} className={`${inputClass} w-24`} />
      </label>
    </>
  )
  const categoryValues = (form: FormData) => ({
    name_en: text(form, 'name_en'),
    name_ur: text(form, 'name_ur'),
    sort_order: Number(text(form, 'sort_order')),
  })

  return (
    <>
      <title>{`${t('admin.menu.heading')} · ${t('brand')}`}</title>
      <MenuNav />
      {menu.isPending && <p className="mt-4">{t('admin.loading')}</p>}
      {menu.isError && <p role="alert" className="mt-4">{t('admin.errors.loadFailed')}</p>}
      <SaveError error={save.error} />

      <div className="mt-4 flex flex-col gap-4">
        {menu.data?.map((category) => (
          <section key={category.id} className={`${card} ${category.is_active ? '' : 'border-dashed'}`}>
            <form
              key={`${category.id}-${menu.dataUpdatedAt}`}
              onSubmit={(event) => {
                const form = submitted(event)
                save.mutate(
                  supabase
                    .from('categories')
                    .update({
                      ...categoryValues(form),
                      is_active: form.get('is_active') === 'on',
                      is_side: form.get('is_side') === 'on',
                    })
                    .eq('id', category.id),
                )
              }}
              className="flex flex-wrap items-end gap-3"
            >
              {categoryFields(category)}
              <label className="flex items-center gap-2 py-2">
                <input name="is_active" type="checkbox" defaultChecked={category.is_active} className="size-5" />
                {t('admin.menu.active')}
              </label>
              <label className="flex items-center gap-2 py-2">
                <input name="is_side" type="checkbox" defaultChecked={category.is_side} className="size-5" />
                {t('admin.menu.isSide')}
              </label>
              <button type="submit" disabled={save.isPending} className={secondaryButton}>
                {t('admin.menu.save')}
              </button>
              {category.items.length === 0 && (
                <button
                  type="button"
                  disabled={save.isPending}
                  onClick={() => {
                    if (window.confirm(t('admin.menu.deleteConfirm', { name: category.name_en }))) {
                      save.mutate(supabase.from('categories').delete().eq('id', category.id))
                    }
                  }}
                  className={dangerButton}
                >
                  {t('admin.menu.delete')}
                </button>
              )}
            </form>

            <ul className="mt-3 flex flex-col divide-y divide-line">
              {category.items.map((item) => (
                <li key={item.id}>
                  <Link to={`items/${item.id}`} className="flex flex-wrap items-baseline gap-x-3 py-2 hover:text-brand-deep">
                    <span className="font-bold underline">{item.name_en}</span>
                    <span>{t('price', { amount: formatAmount(item.base_price) })}</span>
                    <span className="text-sm text-ink-muted">
                      {[
                        item.is_hidden && t('admin.menu.flags.hidden'),
                        item.is_deal && t('admin.menu.flags.deal'),
                        item.is_featured && t('admin.menu.flags.featured'),
                        !item.is_available && t('admin.menu.flags.soldOut'),
                        !item.image_path && t('admin.menu.flags.noPhoto'),
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
            {category.items.length === 0 && <p className="text-ink-muted">{t('admin.menu.noDishes')}</p>}
            <Link to={`items/new?category=${category.id}`} className={`${secondaryButton} mt-3 w-fit`}>
              {t('admin.menu.addDish')}
            </Link>
          </section>
        ))}
      </div>

      <form
        onSubmit={(event) => {
          const form = submitted(event)
          const element = event.currentTarget
          save.mutate(supabase.from('categories').insert({ branch_id: branch.id, ...categoryValues(form) }), {
            onSuccess: () => element.reset(),
          })
        }}
        className={`${card} mt-6 flex flex-wrap items-end gap-3`}
      >
        <h2 className="w-full font-heading text-xl font-bold">{t('admin.menu.addCategory')}</h2>
        {categoryFields()}
        <button type="submit" disabled={save.isPending} className={primaryButton}>
          {t('admin.menu.addCategory')}
        </button>
      </form>
    </>
  )
}
