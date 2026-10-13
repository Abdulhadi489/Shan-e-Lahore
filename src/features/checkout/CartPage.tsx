import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { localized } from '../../i18n'
import { formatAmount } from '../../lib/money'
import { MAX_QUANTITY, unitPrice } from '../../../supabase/functions/_shared/pricing'
import { useBranch } from '../../app/useBranch'
import { useMenu } from '../menu/useMenu'
import { lineKey, setQuantity, useCart } from './cart'

export function CartPage() {
  const { t, i18n } = useTranslation()
  const lng = i18n.language
  const lines = useCart()
  const menu = useMenu()
  const branch = useBranch()
  const price = (amount: number) => t('price', { amount: formatAmount(amount) })
  const title = <title>{`${t('pages.cart')} · ${t('brand')}`}</title>
  const heading = <h1 className="font-heading text-3xl font-bold">{t('pages.cart')}</h1>

  if (lines.length === 0) {
    return (
      <>
        {title}
        {heading}
        <p className="mt-4">{t('cart.empty')}</p>
        <Link to="/menu" className="mt-4 inline-block rounded-control bg-brand px-4 py-2 font-bold text-ink hover:bg-peach">
          {t('cart.browseMenu')}
        </Link>
      </>
    )
  }
  if (menu.isPending || branch.isPending) return <>{title}{heading}<p className="mt-4">{t('menu.loading')}</p></>
  if (menu.isError || branch.isError) {
    return (
      <>
        {title}
        {heading}
        <p role="alert" className="mt-4">{t('menu.error')}</p>
      </>
    )
  }

  // Prices always come from the current menu; the server recalculates them again when the order is placed.
  const items = new Map(menu.data.flatMap((c) => c.items).map((item) => [item.id, item]))
  const rows = lines.map((line) => {
    const item = items.get(line.itemId)
    const result = item ? unitPrice(item, line) : null
    return { line, key: lineKey(line), item, unit: result && 'price' in result ? result.price : null }
  })
  const subtotal = rows.reduce((sum, row) => sum + (row.unit ?? 0) * row.line.quantity, 0)
  const minimum = branch.data.branch_settings?.min_order_amount ?? 0
  const hasUnavailable = rows.some((row) => row.unit === null)
  const canCheckout = !hasUnavailable && subtotal >= minimum

  return (
    <>
      {title}
      {heading}
      <ul className="mt-4 flex flex-col gap-3">
        {rows.map(({ line, key, item, unit }) => {
          const variant = item?.variants.find((v) => v.id === line.variantId)
          const options = item?.addon_groups.flatMap((g) => g.options).filter((o) => line.addonOptionIds.includes(o.id)) ?? []
          return (
            <li key={key} className="flex flex-wrap items-center gap-3 rounded-card border border-line bg-raised p-3">
              <div className="min-w-40 flex-1">
                <p className="font-bold">{item ? localized(lng, item.name_en, item.name_ur) : t('cart.unknownItem')}</p>
                {(variant || options.length > 0) && (
                  <p className="text-sm text-ink-muted">
                    {[variant, ...options].filter((x) => x !== undefined).map((x) => localized(lng, x.name_en, x.name_ur)).join(' · ')}
                  </p>
                )}
                {unit === null && <p className="text-sm font-bold text-danger">{t('cart.unavailable')}</p>}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label={t('item.decrease')}
                  onClick={() => setQuantity(key, line.quantity - 1)}
                  className="size-9 rounded-control border border-ink-muted"
                >
                  −
                </button>
                <span className="min-w-6 text-center font-bold">{line.quantity}</span>
                <button
                  type="button"
                  aria-label={t('item.increase')}
                  disabled={line.quantity >= MAX_QUANTITY}
                  onClick={() => setQuantity(key, line.quantity + 1)}
                  className="size-9 rounded-control border border-ink-muted disabled:opacity-40"
                >
                  +
                </button>
              </div>
              <span className="w-24 text-end font-bold">{unit === null ? '' : price(unit * line.quantity)}</span>
              <button type="button" onClick={() => setQuantity(key, 0)} className="text-sm text-brand-deep underline">
                {t('cart.remove')}
              </button>
            </li>
          )
        })}
      </ul>

      <div className="mt-6 flex max-w-md flex-col gap-2 rounded-card border border-line bg-raised p-4">
        <p className="flex justify-between font-bold">
          <span>{t('cart.subtotal')}</span>
          <span>{price(subtotal)}</span>
        </p>
        <p className="text-sm text-ink-muted">{t('cart.deliveryNote')}</p>
        {subtotal < minimum && (
          <p className="text-sm font-bold text-danger">
            {t('cart.minimumOrder', { minimum: price(minimum), remaining: price(minimum - subtotal) })}
          </p>
        )}
        {canCheckout ? (
          <Link to="/checkout" className="mt-2 rounded-control bg-brand px-4 py-3 text-center font-bold text-ink hover:bg-peach">
            {t('cart.goToCheckout')}
          </Link>
        ) : (
          <button type="button" disabled className="mt-2 cursor-not-allowed rounded-control bg-brand px-4 py-3 font-bold text-ink opacity-60">
            {t('cart.goToCheckout')}
          </button>
        )}
      </div>
    </>
  )
}
