import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { menuImageUrl } from '../../../lib/images'
import { supabase } from '../../../lib/supabase'
import { useStaff } from '../StaffLayout'
import { card, dangerButton, inputClass, labelClass, optional, primaryButton, SaveError, secondaryButton, submitted, text, useDbMutation } from '../ui'
import { MenuNav, useAdminMenu } from './MenuAdminPage'
import { removeMenuPhoto, uploadMenuPhoto } from './photos'

export function BannersPage() {
  const { t } = useTranslation(undefined, { lng: 'en' })
  const { branch } = useStaff()
  const queryClient = useQueryClient()
  const key = ['admin-banners', branch.id]
  const banners = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('banners')
        .select('id, image_path, title_en, title_ur, sort_order, is_active, item_id')
        .eq('branch_id', branch.id)
        .order('sort_order')
      if (error) throw error
      return data
    },
  })
  const save = useDbMutation(key, ['home-banners'])
  const menu = useAdminMenu(branch.id)
  const upload = useMutation({
    mutationFn: async ({ file, titleEn, titleUr, itemId }: { file: File; titleEn: string; titleUr: string; itemId: string | null }) => {
      const image_path = await uploadMenuPhoto(file, 'banners')
      const { error } = await supabase.from('banners').insert({
        branch_id: branch.id,
        image_path,
        title_en: titleEn,
        title_ur: titleUr,
        item_id: itemId,
        sort_order: (banners.data?.length ?? 0) + 1,
      })
      if (error) {
        await removeMenuPhoto(image_path)
        throw error
      }
    },
    onSettled: () => Promise.all([key, ['home-banners']].map((queryKey) => queryClient.invalidateQueries({ queryKey }))),
  })

  const titleFields = (banner?: { title_en: string; title_ur: string; item_id: string | null }) => (
    <>
      <label className={labelClass}>
        {t('admin.menu.banners.titleEn')} <span className="text-sm text-ink-muted">({t('admin.settings.optional')})</span>
        <input name="title_en" maxLength={80} defaultValue={banner?.title_en} className={inputClass} />
      </label>
      <label className={labelClass}>
        {t('admin.menu.banners.titleUr')} <span className="text-sm text-ink-muted">({t('admin.settings.optional')})</span>
        <input name="title_ur" maxLength={80} defaultValue={banner?.title_ur} dir="rtl" lang="ur" className={inputClass} />
      </label>
      <label className={labelClass}>
        {t('admin.menu.banners.dish')}
        <select name="item_id" defaultValue={banner?.item_id ?? ''} className={inputClass}>
          <option value="">{t('admin.menu.banners.noDish')}</option>
          {menu.data?.map((category) => (
            <optgroup key={category.id} label={category.name_en}>
              {category.items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name_en}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
      </label>
    </>
  )

  return (
    <>
      <title>{`${t('admin.menu.sections.banners')} · ${t('brand')}`}</title>
      <MenuNav />
      <p className="mt-3 text-ink-muted">{t('admin.menu.banners.help')}</p>
      {banners.data?.length === 0 && <p className="mt-4">{t('admin.menu.banners.none')}</p>}
      <SaveError error={save.error} />

      <div className="mt-4 flex flex-col gap-4">
        {banners.data?.map((banner) => (
          <section key={banner.id} className={`${card} ${banner.is_active ? '' : 'border-dashed'}`}>
            <img src={menuImageUrl(banner.image_path, 'full')} alt="" className="aspect-[16/10] w-full max-w-xl rounded-card bg-peach object-cover" />
            <form
              onSubmit={(event) => {
                const form = submitted(event)
                save.mutate(
                  supabase
                    .from('banners')
                    .update({
                      title_en: text(form, 'title_en'),
                      title_ur: text(form, 'title_ur'),
                      item_id: optional(form, 'item_id'),
                      sort_order: Number(text(form, 'sort_order')),
                      is_active: form.get('is_active') === 'on',
                    })
                    .eq('id', banner.id),
                )
              }}
              className="mt-3 flex flex-wrap items-end gap-3"
            >
              {titleFields(banner)}
              <label className={labelClass}>
                {t('admin.menu.sortOrder')}
                <input name="sort_order" type="number" required defaultValue={banner.sort_order} className={`${inputClass} w-20`} />
              </label>
              <label className="flex items-center gap-2 py-2">
                <input name="is_active" type="checkbox" defaultChecked={banner.is_active} className="size-5" />
                {t('admin.menu.active')}
              </label>
              <button type="submit" disabled={save.isPending} className={secondaryButton}>
                {t('admin.menu.save')}
              </button>
              <button
                type="button"
                disabled={save.isPending}
                onClick={() => {
                  if (!window.confirm(t('admin.menu.deleteConfirm', { name: banner.title_en || t('admin.menu.banners.image') }))) return
                  save.mutate(supabase.from('banners').delete().eq('id', banner.id), {
                    onSuccess: () => void removeMenuPhoto(banner.image_path),
                  })
                }}
                className={dangerButton}
              >
                {t('admin.menu.delete')}
              </button>
            </form>
          </section>
        ))}
      </div>

      <form
        onSubmit={(event) => {
          const form = submitted(event)
          const file = form.get('image')
          const element = event.currentTarget
          if (!(file instanceof File) || file.size === 0) return
          upload.mutate(
            { file, titleEn: text(form, 'title_en'), titleUr: text(form, 'title_ur'), itemId: optional(form, 'item_id') },
            { onSuccess: () => element.reset() },
          )
        }}
        className={`${card} mt-6 flex flex-wrap items-end gap-3`}
      >
        <h2 className="w-full font-heading text-xl font-bold">{t('admin.menu.banners.add')}</h2>
        <label className={labelClass}>
          {t('admin.menu.banners.image')}
          <input name="image" type="file" required accept="image/jpeg,image/png,image/webp" className={inputClass} />
        </label>
        {titleFields()}
        <button type="submit" disabled={upload.isPending} className={primaryButton}>
          {upload.isPending ? t('admin.menu.item.uploading') : t('admin.menu.banners.add')}
        </button>
        {upload.isError && <p role="alert" className="w-full text-danger">{t('admin.menu.item.photoFailed')}</p>}
      </form>
    </>
  )
}
