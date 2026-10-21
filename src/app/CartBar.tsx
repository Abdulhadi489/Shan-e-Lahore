import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ArrowRight } from 'lucide-react'
import { formatAmount } from '../lib/money'
import { cartSubtotal, useCart } from '../features/checkout/cart'
import { useMenu } from '../features/menu/useMenu'

// Floating shortcut to the cart while browsing: item count, "View cart" and the subtotal at today's prices.
// Text on the orange is espresso; white or cream on this orange fails contrast.
export function CartBar() {
  const { t } = useTranslation()
  const lines = useCart()
  const menu = useMenu()
  const count = lines.reduce((sum, line) => sum + line.quantity, 0)
  const items = new Map(menu.data?.flatMap((category) => category.items).map((item) => [item.id, item]))

  return (
    <Link
      to="/cart"
      className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-30 mx-auto flex min-h-13 max-w-[520px] items-center gap-3 rounded-full bg-brand px-2 font-medium text-ink shadow-lg ring-2 ring-raised hover:bg-peach focus-visible:outline-ink motion-safe:animate-slide-up"
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-raised">{count}</span>
      <span className="flex-1 text-center ltr:uppercase ltr:tracking-[0.12em]">{t('cart.viewCart')}</span>
      {menu.data && <span>{t('price', { amount: formatAmount(cartSubtotal(lines, items)) })}</span>}
      <ArrowRight aria-hidden className="me-2 size-5 shrink-0 rtl:-scale-x-100" />
    </Link>
  )
}
