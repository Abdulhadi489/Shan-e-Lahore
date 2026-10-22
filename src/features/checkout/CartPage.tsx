import { Link } from 'react-router'
import { ArrowLeft } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { localized } from '../../i18n'
import { formatAmount } from '../../lib/money'
import { menuImageUrl } from '../../lib/images'
import { PageBanner } from '../../components/PageBanner'
import { banners } from '../../assets/banners/banners'
import { MAX_QUANTITY, unitPrice } from '../../../supabase/functions/_shared/pricing'
import { useBranch } from '../../app/useBranch'
import { useMenu } from '../menu/useMenu'
import { SidesRow } from '../menu/SidesRow'
import { cartSubtotal, lineKey, setQuantity, useCart } from './cart'

export function CartPage() {
  const { t, i18n } = useTranslation()
  const lng = i18n.language
  const lines = useCart()
  const menu = useMenu()
  const branch = useBranch()
  const price = (amount: number) => t('price', { amount: formatAmount(amount) })
  const title = <title>{`${t('pages.cart')} · ${t('brand')}`}</title>
  const heading = <PageBanner image={banners.cart} title={t('pages.cart')} />

  if (lines.length === 0) {
    return (
      <>
        {title}
        <PageBanner image={banners.cart} title={t('pages.cart')}>
          <p>{t('cart.empty')}</p>
          <Link to="/menu" className="mt-4 inline-flex min-h-12 items-center rounded-full bg-brand px-6 font-medium text-ink hover:bg-peach">
            {t('cart.browseMenu')}
          </Link>
        </PageBanner>
      </>
    )
  }
  if (menu.isPending || branch.isPending) return <>{title}{heading}<p className="mt-4 text-center">{t('menu.loading')}</p></>
  if (menu.isError || branch.isError) {
    return (
      <>
        {title}
        {heading}
        <p role="alert" className="mt-4 text-center">{t('menu.error')}</p>
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
  const subtotal = cartSubtotal(lines, items)
  const minimum = branch.data.branch_settings?.min_order_amount ?? 0
  const hasUnavailable = rows.some((row) => row.unit === null)
  const canCheckout = !hasUnavailable && subtotal >= minimum

  return (
    <>
      {title}
      {heading}
      <div className="relative mx-auto -mt-10 flex max-w-[760px] flex-col gap-8">
        <div className="surface-panel min-w-0">
          <ul className="flex flex-col divide-y divide-dashed divide-line border-b border-dashed border-line">
            {rows.map(({ line, key, item, unit }) => {
              const variant = item?.variants.find((v) => v.id === line.variantId)
              const options = item?.addon_groups.flatMap((g) => g.options).filter((o) => line.addonOptionIds.includes(o.id)) ?? []
              return (
                <li key={key} className="flex flex-wrap items-center gap-x-4 gap-y-3 py-4">
                  {item?.image_path ? (
                    <img
                      src={menuImageUrl(item.image_path, 'card')}
                      alt=""
                      width={64}
                      height={72}
                      loading="lazy"
                      className="h-18 w-16 shrink-0 rounded-t-full rounded-b-control bg-espresso object-cover"
                    />
                  ) : (
                    <span aria-hidden className="h-18 w-16 shrink-0 rounded-t-full rounded-b-control bg-linear-to-b from-brand-deep to-espresso" />
                  )}
                  <div className="min-w-40 flex-1">
                    <p className="font-heading text-xl leading-snug font-semibold">{item ? localized(lng, item.name_en, item.name_ur) : t('cart.unknownItem')}</p>
                    {(variant || options.length > 0) && (
                      <p className="text-sm text-ink-muted">
                        {[variant, ...options].filter((x) => x !== undefined).map((x) => localized(lng, x.name_en, x.name_ur)).join(' · ')}
                      </p>
                    )}
                    {unit === null && <p className="text-sm font-medium text-danger">{t('cart.unavailable')}</p>}
                  </div>
                  <div className="flex items-center rounded-full border border-ink">
                    <button
                      type="button"
                      aria-label={t('item.decrease')}
                      onClick={() => setQuantity(key, line.quantity - 1)}
                      className="size-11 rounded-full text-lg hover:bg-raised"
                    >
                      −
                    </button>
                    <span className="min-w-6 text-center font-medium">{line.quantity}</span>
                    <button
                      type="button"
                      aria-label={t('item.increase')}
                      disabled={line.quantity >= MAX_QUANTITY}
                      onClick={() => setQuantity(key, line.quantity + 1)}
                      className="size-11 rounded-full text-lg hover:bg-raised disabled:opacity-40"
                    >
                      +
                    </button>
                  </div>
                  <span className="w-24 text-end font-medium">{unit === null ? '' : price(unit * line.quantity)}</span>
                  <button type="button" onClick={() => setQuantity(key, 0)} className="min-h-11 text-sm text-brand-deep underline">
                    {t('cart.remove')}
                  </button>
                </li>
              )
            })}
          </ul>

          <Link to="/menu" className="mt-4 inline-flex min-h-11 items-center gap-2 border-b border-ink font-medium ltr:uppercase ltr:tracking-[0.12em]">
            <ArrowLeft aria-hidden className="size-4 rtl:-scale-x-100" />
            {t('cart.browseMenu')}
          </Link>

          <div className="mt-8">
            <SidesRow />
          </div>
        </div>

        <aside className="heritage-dark flex min-w-0 flex-col gap-3 rounded-card border border-gold p-6">
          <h2 className="font-heading text-3xl font-semibold">{t('checkout.summary')}</h2>
          <p className="flex justify-between border-t border-line pt-3 text-lg font-medium">
            <span>{t('cart.subtotal')}</span>
            <span>{price(subtotal)}</span>
          </p>
          <p className="text-sm text-ink-muted">{t('cart.deliveryNote')}</p>
          {subtotal < minimum && (
            <p className="text-sm font-medium text-danger">
              {t('cart.minimumOrder', { minimum: price(minimum), remaining: price(minimum - subtotal) })}
            </p>
          )}
          {canCheckout ? (
            <Link to="/checkout" className="mt-2 flex min-h-12 items-center justify-center rounded-full bg-brand px-4 font-medium text-espresso hover:bg-peach ltr:uppercase ltr:tracking-[0.15em]">
              {t('cart.goToCheckout')}
            </Link>
          ) : (
            <button type="button" disabled className="mt-2 min-h-12 cursor-not-allowed rounded-full bg-brand px-4 font-medium text-espresso opacity-60 ltr:uppercase ltr:tracking-[0.15em]">
              {t('cart.goToCheckout')}
            </button>
          )}
        </aside>
      </div>
    </>
  )
}
