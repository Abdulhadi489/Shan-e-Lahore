import { useEffect, useState } from 'react'
import { useLocation } from 'react-router'
import { useTranslation } from 'react-i18next'
import { localized } from '../../i18n'
import { formatAmount } from '../../lib/money'
import { menuImageUrl } from '../../lib/images'
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

  return (
    <button
      type="button"
      onClick={() => onSelect(item)}
      disabled={soldOut}
      className="flex h-full w-full gap-3 rounded-card border border-line bg-raised p-3 text-start hover:border-brand-deep disabled:cursor-not-allowed"
    >
      {item.image_path ? (
        <img
          src={menuImageUrl(item.image_path, 'card')}
          alt=""
          width={80}
          height={80}
          loading="lazy"
          decoding="async"
          className="size-20 shrink-0 rounded-control bg-peach object-cover"
        />
      ) : (
        // Empty photo space until the dish has a photo.
        <span aria-hidden className="size-20 shrink-0 rounded-control bg-peach" />
      )}
      <span className="flex flex-1 flex-col">
        <span className="font-bold">{localized(lng, item.name_en, item.name_ur)}</span>
        {item.description_en && (
          <span className="text-sm text-ink-muted">{localized(lng, item.description_en, item.description_ur)}</span>
        )}
        <span className="mt-auto pt-1 font-bold text-brand-deep">
          {soldOut ? (
            <span className="text-danger">{t('menu.soldOut')}</span>
          ) : item.variants.length > 1 ? (
            t('menu.from', { price })
          ) : (
            price
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

  // Links like /menu#category-… arrive before the menu has loaded, so scroll once it has.
  useEffect(() => {
    if (menu.data && hash) document.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView()
  }, [menu.data, hash])

  return (
    <>
      <title>{`${t('pages.menu')} · ${t('brand')}`}</title>
      <h1 className="font-heading text-3xl font-bold">{t('pages.menu')}</h1>

      {menu.isPending && <p className="mt-4">{t('menu.loading')}</p>}
      {menu.isError && (
        <div role="alert" className="mt-4">
          <p>{t('menu.error')}</p>
          <button type="button" onClick={() => void menu.refetch()} className="mt-2 rounded-control border border-ink-muted px-3 py-1">
            {t('menu.retry')}
          </button>
        </div>
      )}
      {menu.data?.length === 0 && <p className="mt-4">{t('menu.empty')}</p>}

      {menu.data && menu.data.length > 0 && (
        <>
          <nav aria-label={t('menu.categories')} className="sticky top-0 z-10 -mx-4 mt-4 overflow-x-auto border-b border-line bg-surface px-4 py-2">
            <ul className="flex gap-2 whitespace-nowrap">
              {menu.data.map((category) => (
                <li key={category.id}>
                  <a href={`#category-${category.id}`} className="block rounded-full border border-line bg-raised px-3 py-1 hover:border-brand-deep">
                    {localized(lng, category.name_en, category.name_ur)}
                  </a>
                </li>
              ))}
            </ul>
          </nav>

          {menu.data.map((category) => (
            <section key={category.id} id={`category-${category.id}`} className="mt-8 scroll-mt-16">
              <h2 className="font-heading text-2xl font-bold">{localized(lng, category.name_en, category.name_ur)}</h2>
              <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
