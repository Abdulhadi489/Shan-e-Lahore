import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'
import { useTranslation } from 'react-i18next'
import { localized } from '../../i18n'
import { formatAmount } from '../../lib/money'
import { menuImageUrl } from '../../lib/images'
import { PageBanner } from '../../components/PageBanner'
import { banners } from '../../assets/banners/banners'
import { ItemDialog } from './ItemDialog'
import { useMenu, type MenuItem } from './useMenu'

function isSoldOut(item: MenuItem) {
  return !item.is_available || (item.variants.length > 0 && item.variants.every((v) => !v.is_available))
}

export function ItemCard({ item, onSelect }: { item: MenuItem; onSelect: (item: MenuItem) => void }) {
  const { t, i18n } = useTranslation()
  const lng = i18n.language
  const soldOut = isSoldOut(item)
  const lowest = item.variants.length > 0 ? Math.min(...item.variants.map((v) => v.price)) : item.base_price
  const price = t('price', { amount: formatAmount(lowest) })

  // Arch-topped photo like a jharoka window; the whole card opens the dish, the "Add" pill only shows where to tap.
  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      disabled={soldOut}
      className="flex h-full w-full flex-col overflow-hidden rounded-card border border-line bg-raised text-start hover:border-brand-deep disabled:cursor-not-allowed"
    >
      {item.image_path ? (
        <img
          src={menuImageUrl(item.image_path, 'card')}
          alt=""
          width={400}
          height={220}
          loading="lazy"
          decoding="async"
          className="aspect-[20/11] w-full rounded-t-full bg-espresso object-cover"
        />
      ) : (
        // Espresso arch until the dish has a photo.
        <span aria-hidden className="aspect-[20/11] w-full rounded-t-full bg-linear-to-b from-brand-deep to-espresso" />
      )}
      <span className="flex flex-1 flex-col gap-1 p-4">
        <span className="font-heading text-xl leading-snug font-semibold">{localized(lng, item.name_en, item.name_ur)}</span>
        {item.description_en && (
          <span className="text-base text-ink-muted max-sm:line-clamp-2 sm:text-sm">{localized(lng, item.description_en, item.description_ur)}</span>
        )}
        <span className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-2 font-medium">
          {soldOut ? (
            <span className="text-danger">{t('menu.soldOut')}</span>
          ) : (
            <>
              {item.variants.length > 1 ? t('menu.from', { price }) : price}
              <span aria-hidden className="rounded-full bg-brand px-4 py-1.5 text-sm ltr:uppercase ltr:tracking-[0.12em]">
                {t('item.add')}
              </span>
            </>
          )}
        </span>
      </span>
    </button>
  )
}

export function MenuPage() {
  const { t, i18n } = useTranslation()
  const lng = i18n.language
  const menu = useMenu()
  const [selected, setSelected] = useState<MenuItem | null>(null)
  const { hash } = useLocation()

  // The category chips and links from Home glide to their section while this page is open (index.css); other pages and
  // route changes keep their instant behaviour.
  useEffect(() => {
    document.documentElement.classList.add('smooth-scroll')
    return () => document.documentElement.classList.remove('smooth-scroll')
  }, [])

  // Links like /menu#category-… arrive before the menu has loaded, so scroll once it has.
  useEffect(() => {
    if (menu.data && hash) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView()
  }, [menu.data, hash])

  return (
    <>
      <title>{`${t('pages.menu')} · ${t('brand')}`}</title>
      <PageBanner image={banners.menu} title={t('pages.menu')} />

      {/* Tall while loading, so the footer is not on screen to be pushed down when the dishes arrive. */}
      {menu.isPending && <p className="mt-4 min-h-[80svh]">{t('menu.loading')}</p>}
      {menu.isError && (
        <div role="alert" className="mt-4">
          <p>{t('menu.error')}</p>
          <button type="button" onClick={() => void menu.refetch()} className="mt-2 min-h-11 rounded-full border border-ink px-5">
            {t('menu.retry')}
          </button>
        </div>
      )}
      {menu.data?.length === 0 && <p className="mt-4">{t('menu.empty')}</p>}

      {menu.data && menu.data.length > 0 && (
        <>
          <nav aria-label={t('menu.categories')} className="sticky top-(--header-h) z-10 -mx-(--page-pad) mt-4 overflow-x-auto scrollbar-none border-b border-line bg-surface px-(--page-pad) py-2">
            <ul className="flex gap-2 whitespace-nowrap">
              {menu.data.map((category) => (
                <li key={category.id}>
                  <a
                    href={`#category-${category.id}`}
                    className="flex min-h-11 items-center rounded-full border border-ink px-4 text-sm font-medium hover:bg-brand ltr:uppercase ltr:tracking-[0.12em]"
                  >
                    {localized(lng, category.name_en, category.name_ur)}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {menu.data.map((category) => (
            <section key={category.id} id={`category-${category.id}`} className="mt-8 scroll-mt-[calc(var(--header-h)+5rem)]">
              <h2 className="font-heading text-3xl font-semibold">{localized(lng, category.name_en, category.name_ur)}</h2>
              <ul className="mt-4 grid grid-cols-[repeat(auto-fill,minmax(min(14rem,100%),1fr))] gap-4">
                {category.items.map((item) => (
                  <li key={item.id}>
                    <ItemCard item={item} onSelect={setSelected} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </>
      )}

      <ItemDialog item={selected} onClose={() => setSelected(null)} />
    </>
  )
}
