import { useId } from 'react'
import { useTranslation } from 'react-i18next'
import { localized } from '../../i18n'
import { formatAmount } from '../../lib/money'
import { addToCart, useCart } from '../checkout/cart'
import { useMenu } from './useMenu'

// "Add with your order": dishes from categories the Super Admin marked as sides (breads, raita, drinks).
// Each tap adds the side as its own cart line at its normal price, so prices live in one place.
export function SidesRow({ excludeItemId }: { excludeItemId?: string }) {
  const { t, i18n } = useTranslation()
  const lng = i18n.language
  const headingId = useId()
  const menu = useMenu()
  const lines = useCart()

  // One tap only works for dishes with no size or required choice to make.
  const sides =
    menu.data
      ?.filter((category) => category.is_side)
      .flatMap((category) => category.items)
      .filter(
        (item) =>
          item.id !== excludeItemId &&
          item.is_available &&
          item.variants.length === 0 &&
          item.addon_groups.every((group) => group.min_select === 0),
      ) ?? []
  if (sides.length === 0) return null

  const inCart = (itemId: string) =>
    lines
      .filter((line) => line.itemId === itemId && line.variantId === null && line.addonOptionIds.length === 0)
      .reduce((sum, line) => sum + line.quantity, 0)

  return (
    <section aria-labelledby={headingId}>
      <h3 id={headingId} className="font-medium">{t('sides.title')}</h3>
      <ul className="-mx-1 mt-2 flex gap-2 overflow-x-auto scrollbar-none px-1 pb-2">
        {sides.map((item) => {
          const name = localized(lng, item.name_en, item.name_ur)
          const price = t('price', { amount: formatAmount(item.base_price) })
          const count = inCart(item.id)
          return (
            <li key={item.id} className="shrink-0">
              <button
                type="button"
                aria-label={t('sides.add', { name, price })}
                onClick={() => addToCart({ itemId: item.id, variantId: null, addonOptionIds: [], quantity: 1 })}
                className="flex h-full w-36 flex-col gap-1 rounded-control border border-line bg-raised p-2 text-start text-sm hover:border-brand-deep active:scale-[0.98]"
              >
                <span className="font-medium">{name}</span>
                <span className="mt-auto flex w-full items-center justify-between gap-2">
                  <span>{price}</span>
                  <span aria-hidden className="flex size-7 items-center justify-center rounded-full bg-brand text-lg font-medium text-ink">
                    +
                  </span>
                </span>
                {count > 0 && <span className="font-medium text-success">{t('sides.inCart', { count })}</span>}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
