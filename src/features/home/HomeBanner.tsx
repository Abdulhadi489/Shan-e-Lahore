import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { localized } from '../../i18n'
import { menuImageUrl } from '../../lib/images'
import { supabase } from '../../lib/supabase'

// The three arches from the printed menu and the shop's signboard: ثقافت، اپنائیت، روایت.
import archesSmall from '../../assets/menu-arches-800.webp'
import archesLarge from '../../assets/menu-arches-1600.webp'

// Banners the Super Admin uploads (Menu > Home banners) replace the arches strip.
// shortcut: one branch, so nothing filters by branch_id; filter here when the site gets a branch picker.
function useHomeBanners() {
  return useQuery({
    queryKey: ['home-banners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('banners')
        .select('id, image_path, title_en, title_ur')
        .eq('is_active', true)
        .order('sort_order')
      if (error) throw error
      return data
    },
  })
}

// Rendered by CustomerLayout above the page column, so the arches span the whole window at any size.
export function HomeBanner() {
  const { t, i18n } = useTranslation()
  const lng = i18n.language
  const banners = useHomeBanners().data ?? []

  if (banners.length === 0) {
    return (
      <img
        src={archesSmall}
        srcSet={`${archesSmall} 800w, ${archesLarge} 1600w`}
        sizes="100vw"
        width={1600}
        height={269}
        fetchPriority="high"
        alt={t('home.archesAlt')}
        className="block w-full"
      />
    )
  }

  // Uploaded banners are 16:7 photos with captions, so they stay in the page column: full width they'd be taller than the screen.
  return (
    <ul className="mx-auto flex w-full max-w-7xl snap-x snap-mandatory gap-3 overflow-x-auto px-4 pt-6">
      {banners.map((banner, index) => {
        const title = localized(lng, banner.title_en, banner.title_ur)
        return (
          <li key={banner.id} className={`shrink-0 snap-start ${banners.length > 1 ? 'w-[85%] sm:w-[70%] lg:w-[calc(50%-0.375rem)]' : 'w-full'}`}>
            <img
              src={menuImageUrl(banner.image_path, 'full')}
              alt={title}
              width={1600}
              height={700}
              fetchPriority={index === 0 ? 'high' : 'auto'}
              loading={index === 0 ? 'eager' : 'lazy'}
              className="aspect-[16/7] max-h-[70vh] w-full rounded-card bg-peach object-cover"
            />
            {title && <p className="mt-1 font-bold">{title}</p>}
          </li>
        )
      })}
    </ul>
  )
}
