import { useState } from 'react'
import { Link, useLocation, useNavigate, useParams, useSearchParams } from 'react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { menuImageUrl } from '../../../lib/images'
import { supabase } from '../../../lib/supabase'
import type { TablesInsert } from '../../../types/database'
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
import { useAdminMenu } from './MenuAdminPage'
import { removeMenuPhoto, uploadMenuPhoto } from './photos'

const bySortOrder = (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order
const flagLabels = { is_available: 'isAvailable', is_hidden: 'isHidden', is_featured: 'isFeatured', is_deal: 'isDeal' } as const

function useItem(id: string | undefined) {
  return useQuery({
    queryKey: ['admin-item', id],
    enabled: id !== undefined,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('items')
        .select(
          `id, category_id, name_en, name_ur, description_en, description_ur, base_price, image_path,
           is_available, is_hidden, is_deal, is_featured, sort_order,
           item_variants ( id, name_en, name_ur, price, is_available, sort_order ),
           item_addon_groups ( group_id )`,
        )
        .eq('id', id ?? '')
        .single()
      if (error) throw error
      return { ...data, item_variants: data.item_variants.toSorted(bySortOrder) }
    },
  })
}

export function ItemEditor() {
  const { t } = useTranslation(undefined, { lng: 'en' })
  const { id } = useParams()
  const isNew = id === 'new'
  const [params] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { branch } = useStaff()
  const queryClient = useQueryClient()
  const menu = useAdminMenu(branch.id)
  const item = useItem(isNew ? undefined : id)
  const groups = useQuery({
    queryKey: ['admin-addon-groups', branch.id],
    queryFn: async () => {
      const { data, error } = await supabase.from('addon_groups').select('id, name_en').eq('branch_id', branch.id).order('name_en')
      if (error) throw error
      return data
    },
  })
  const keys = [['admin-item', id], ['admin-menu', branch.id], ['menu']]
  const save = useDbMutation(...keys)
  const create = useMutation({
    mutationFn: async (values: Omit<TablesInsert<'items'>, 'branch_id'>) => {
      const { data, error } = await supabase.from('items').insert({ ...values, branch_id: branch.id }).select('id').single()
      if (error) throw error
      return data.id
    },
    onSuccess: (newId) => {
      void queryClient.invalidateQueries({ queryKey: ['admin-menu', branch.id] })
      void navigate(`/admin/menu/items/${newId}`, { replace: true, state: { created: true } })
    },
  })
  const [photoFailed, setPhotoFailed] = useState(false)
  const photo = useMutation({
    mutationFn: async (file: File) => {
      const path = await uploadMenuPhoto(file)
      const { error } = await supabase.from('items').update({ image_path: path }).eq('id', id ?? '')
      if (error) throw error
      // The old files go only once the new ones are saved, so a failure never leaves a dish without a photo.
      if (item.data?.image_path) await removeMenuPhoto(item.data.image_path)
    },
    onMutate: () => setPhotoFailed(false),
    onError: () => setPhotoFailed(true),
    onSettled: () => Promise.all(keys.map((queryKey) => queryClient.invalidateQueries({ queryKey }))),
  })

  if (!isNew && item.isPending) return <p>{t('admin.loading')}</p>
  if (item.isError) return <p role="alert">{t('admin.errors.loadFailed')}</p>
  const dish = item.data

  const back = (
    <Link to="/admin/menu" className="flex items-center gap-1 text-brand-deep underline">
      <ArrowLeft aria-hidden className="size-4" />
      {t('admin.menu.item.back')}
    </Link>
  )

  const detailsForm = (
    <form
      key={item.dataUpdatedAt}
      onSubmit={(event) => {
        const form = submitted(event)
        const values = {
          category_id: text(form, 'category_id'),
          name_en: text(form, 'name_en'),
          name_ur: text(form, 'name_ur'),
          description_en: text(form, 'description_en'),
          description_ur: text(form, 'description_ur'),
          base_price: Number(text(form, 'base_price')),
          sort_order: Number(text(form, 'sort_order')),
          is_deal: form.get('is_deal') === 'on',
          is_featured: form.get('is_featured') === 'on',
          is_hidden: form.get('is_hidden') === 'on',
          is_available: form.get('is_available') === 'on',
        }
        if (dish) save.mutate(supabase.from('items').update(values).eq('id', dish.id))
        else create.mutate(values)
      }}
      className={`${card} grid gap-3 sm:grid-cols-2`}
    >
      <label className={labelClass}>
        {t('admin.menu.item.category')}
        <select name="category_id" required defaultValue={dish?.category_id ?? params.get('category') ?? ''} className={inputClass}>
          {menu.data?.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name_en}
            </option>
          ))}
        </select>
      </label>
      <label className={labelClass}>
        {t('admin.menu.sortOrder')} <span className="text-sm text-ink-muted">{t('admin.menu.sortHelp')}</span>
        <input name="sort_order" type="number" required defaultValue={dish?.sort_order ?? 0} className={`${inputClass} w-24`} />
      </label>
      <label className={labelClass}>
        {t('admin.menu.nameEn')}
        <input name="name_en" required maxLength={60} defaultValue={dish?.name_en} className={inputClass} />
      </label>
      <label className={labelClass}>
        {t('admin.menu.nameUr')}
        <input name="name_ur" maxLength={60} defaultValue={dish?.name_ur} dir="rtl" lang="ur" className={inputClass} />
      </label>
      <label className={labelClass}>
        {t('admin.menu.item.descriptionEn')}
        <textarea name="description_en" maxLength={300} rows={3} defaultValue={dish?.description_en} className={inputClass} />
      </label>
      <label className={labelClass}>
        {t('admin.menu.item.descriptionUr')}
        <textarea name="description_ur" maxLength={300} rows={3} defaultValue={dish?.description_ur} dir="rtl" lang="ur" className={inputClass} />
      </label>
      <label className={labelClass}>
        {t('admin.menu.item.basePrice')}
        <input name="base_price" type="number" required min={0} max={100000} defaultValue={dish?.base_price} className={`${inputClass} w-32`} />
        <span className="text-sm text-ink-muted">{t('admin.menu.item.basePriceHelp')}</span>
      </label>
      <div className="flex flex-col gap-2">
        {(Object.keys(flagLabels) as (keyof typeof flagLabels)[]).map((flag) => (
          <label key={flag} className="flex items-center gap-2">
            <input name={flag} type="checkbox" defaultChecked={dish ? dish[flag] : flag === 'is_available'} className="size-5" />
            {t(`admin.menu.item.${flagLabels[flag]}`)}
          </label>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <button type="submit" disabled={save.isPending || create.isPending} className={primaryButton}>
          {t('admin.menu.save')}
        </button>
        {dish && (
          <button
            type="button"
            disabled={save.isPending}
            onClick={() => {
              if (!window.confirm(t('admin.menu.deleteConfirm', { name: dish.name_en }))) return
              save.mutate(supabase.from('items').delete().eq('id', dish.id), {
                onSuccess: () => {
                  if (dish.image_path) void removeMenuPhoto(dish.image_path)
                  navigate('/admin/menu')
                },
              })
            }}
            className={dangerButton}
          >
            {t('admin.menu.delete')}
          </button>
        )}
        {(location.state as { created?: boolean } | null)?.created && !save.isSuccess && (
          <p role="status" className="text-success">{t('admin.menu.item.created')}</p>
        )}
        <SavedOrError save={save} />
        <SaveError error={create.error} />
      </div>
    </form>
  )

  return (
    <>
      <title>{`${dish?.name_en ?? t('admin.menu.item.newHeading')} · ${t('brand')}`}</title>
      {back}
      <h1 className={`${headingClass} mt-3`}>{dish?.name_en ?? t('admin.menu.item.newHeading')}</h1>
      <div className="mt-4 flex flex-col gap-6">
        {detailsForm}

        <section className={card}>
          <h2 className={sectionHeading}>{t('admin.menu.item.photo')}</h2>
          {!dish ? (
            <p className="text-ink-muted">{t('admin.menu.item.photoSaveFirst')}</p>
          ) : (
            <>
              <p className="text-ink-muted">{t('admin.menu.item.photoHelp')}</p>
              {dish.image_path && (
                <img
                  src={menuImageUrl(dish.image_path, 'full')}
                  alt={t('admin.menu.item.photoAlt', { name: dish.name_en })}
                  className="mt-3 aspect-[4/3] w-full max-w-sm rounded-card bg-peach object-cover"
                />
              )}
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <label className={`${secondaryButton} cursor-pointer`}>
                  {photo.isPending ? t('admin.menu.item.uploading') : t('admin.menu.item.uploadPhoto')}
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={photo.isPending}
                    onChange={(event) => {
                      const file = event.target.files?.[0]
                      if (file) photo.mutate(file)
                      event.target.value = ''
                    }}
                    className="sr-only"
                  />
                </label>
                {dish.image_path && (
                  <button
                    type="button"
                    disabled={save.isPending || photo.isPending}
                    onClick={() =>
                      save.mutate(supabase.from('items').update({ image_path: null }).eq('id', dish.id), {
                        onSuccess: () => void removeMenuPhoto(dish.image_path ?? ''),
                      })
                    }
                    className={dangerButton}
                  >
                    {t('admin.menu.item.removePhoto')}
                  </button>
                )}
              </div>
              {photoFailed && <p role="alert" className="mt-2 text-danger">{t('admin.menu.item.photoFailed')}</p>}
            </>
          )}
        </section>

        {dish && <VariantsSection dish={dish} keys={keys} />}

        {dish && (
          <section className={card}>
            <h2 className={sectionHeading}>{t('admin.menu.item.addonGroups')}</h2>
            <p className="text-ink-muted">{t('admin.menu.item.addonGroupsHelp')}</p>
            {groups.data?.length === 0 && <p className="mt-2">{t('admin.menu.item.noAddonGroups')}</p>}
            <ul className="mt-2 flex flex-col gap-2">
              {groups.data?.map((group) => {
                const linked = dish.item_addon_groups.some((link) => link.group_id === group.id)
                return (
                  <li key={group.id}>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={linked}
                        disabled={save.isPending}
                        onChange={() =>
                          save.mutate(
                            linked
                              ? supabase.from('item_addon_groups').delete().eq('item_id', dish.id).eq('group_id', group.id)
                              : supabase.from('item_addon_groups').insert({ item_id: dish.id, group_id: group.id, branch_id: branch.id }),
                          )
                        }
                        className="size-5"
                      />
                      {group.name_en}
                    </label>
                  </li>
                )
              })}
            </ul>
          </section>
        )}
      </div>
    </>
  )
}

function VariantsSection({
  dish,
  keys,
}: {
  dish: NonNullable<ReturnType<typeof useItem>['data']>
  keys: unknown[][]
}) {
  const { t } = useTranslation(undefined, { lng: 'en' })
  const { branch } = useStaff()
  const save = useDbMutation(...keys)

  const fields = (variant?: (typeof dish.item_variants)[number]) => (
    <>
      <label className={labelClass}>
        {t('admin.menu.nameEn')}
        <input name="name_en" required maxLength={60} defaultValue={variant?.name_en} className={`${inputClass} w-36`} />
      </label>
      <label className={labelClass}>
        {t('admin.menu.nameUr')}
        <input name="name_ur" maxLength={60} defaultValue={variant?.name_ur} dir="rtl" lang="ur" className={`${inputClass} w-36`} />
      </label>
      <label className={labelClass}>
        {t('admin.menu.item.price')}
        <input name="price" type="number" required min={0} max={100000} defaultValue={variant?.price} className={`${inputClass} w-28`} />
      </label>
      <label className={labelClass}>
        {t('admin.menu.sortOrder')}
        <input name="sort_order" type="number" required defaultValue={variant?.sort_order ?? dish.item_variants.length + 1} className={`${inputClass} w-20`} />
      </label>
    </>
  )
  const values = (form: FormData) => ({
    name_en: text(form, 'name_en'),
    name_ur: text(form, 'name_ur'),
    price: Number(text(form, 'price')),
    sort_order: Number(text(form, 'sort_order')),
  })

  return (
    <section className={card}>
      <h2 className={sectionHeading}>{t('admin.menu.item.variants')}</h2>
      <p className="text-ink-muted">{t('admin.menu.item.variantsHelp')}</p>
      <ul className="mt-3 flex flex-col gap-3">
        {dish.item_variants.map((variant) => (
          <li key={variant.id}>
            <form
              onSubmit={(event) => {
                const form = submitted(event)
                save.mutate(
                  supabase
                    .from('item_variants')
                    .update({ ...values(form), is_available: form.get('is_available') === 'on' })
                    .eq('id', variant.id),
                )
              }}
              className="flex flex-wrap items-end gap-3 border-b border-line pb-3"
            >
              {fields(variant)}
              <label className="flex items-center gap-2 py-2">
                <input name="is_available" type="checkbox" defaultChecked={variant.is_available} className="size-5" />
                {t('admin.menu.item.available')}
              </label>
              <button type="submit" disabled={save.isPending} className={secondaryButton}>
                {t('admin.menu.save')}
              </button>
              <button
                type="button"
                disabled={save.isPending}
                onClick={() => {
                  if (window.confirm(t('admin.menu.deleteConfirm', { name: variant.name_en }))) {
                    save.mutate(supabase.from('item_variants').delete().eq('id', variant.id))
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
          save.mutate(supabase.from('item_variants').insert({ ...values(form), item_id: dish.id, branch_id: branch.id }), {
            onSuccess: () => element.reset(),
          })
        }}
        className="mt-3 flex flex-wrap items-end gap-3"
      >
        {fields()}
        <button type="submit" disabled={save.isPending} className={primaryButton}>
          {t('admin.menu.item.addVariant')}
        </button>
      </form>
      <SaveError error={save.error} />
    </section>
  )
}
