import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { localized } from '../../i18n'
import { menuImageUrl } from '../../lib/images'
import { formatAmount } from '../../lib/money'
import { supabase } from '../../lib/supabase'
import type { MenuItem } from '../menu/useMenu'

// shortcut: one branch, so nothing filters by branch_id; filter here when the site gets a branch picker.
function useFirstHomeBanner() {
  return useQuery({
    queryKey: ['home-banners'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('banners')
        .select('id, image_path, title_en, title_ur, item_id')
        .eq('is_active', true)
        .order('sort_order')
        .limit(1)
      if (error) throw error
      return data[0] ?? null
    },
  })
}

// Beside the headline: the first active Home banner (Menu > Home banners), otherwise the first featured dish
// with a photo. Tapping opens a dish only when there is one to order: the banner's linked dish while it is on
// sale, or the featured dish itself. Sits beside the headline when both fit and below it when not.
export function HeroPhoto({
  items,
  featuredDish,
  onOpen,
}: {
  items: MenuItem[]
  featuredDish: MenuItem | undefined
  onOpen: (item: MenuItem) => void
}) {
  const { t, i18n } = useTranslation()
  const lng = i18n.language
  const banner = useFirstHomeBanner().data

  let image: string
  let label: string
  let dish: MenuItem | undefined
  if (banner) {
    image = banner.image_path
    label = localized(lng, banner.title_en, banner.title_ur)
    dish = items.find((item) => item.id === banner.item_id && item.is_available)
  } else if (featuredDish?.image_path) {
    image = featuredDish.image_path
    label = `${localized(lng, featuredDish.name_en, featuredDish.name_ur)} · ${t('price', { amount: formatAmount(featuredDish.base_price) })}`
    dish = featuredDish
  } else {
    return null
  }

  const picture = (
    <>
      <img
        src={menuImageUrl(image, 'full')}
        alt={label}
        width={1200}
        height={750}
        loading="lazy"
        className="aspect-[16/10] w-full rounded-card bg-peach object-cover"
      />
      {label && <span className="mt-2 block font-bold">{label}</span>}
    </>
  )
  const box = 'min-w-0 flex-[1_1_26rem] text-start'
  return dish ? (
    <button type="button" onClick={() => onOpen(dish)} className={box}>
      {picture}
    </button>
  ) : (
    <div className={box}>{picture}</div>
  )
}
