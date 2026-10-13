// Discount code rules (CLAUDE.md section 9). Usage is counted from non-cancelled orders by the caller.

export type DiscountCode = {
  type: 'percent' | 'fixed'
  value: number
  min_order: number
  starts_at: string | null
  ends_at: string | null
  usage_limit: number | null
  one_per_phone: boolean
  first_order_only: boolean
  is_active: boolean
}

// byPhone and phoneHasOrders are 0/false when the phone isn't known yet (a quote before checkout).
export type DiscountUsage = { total: number; byPhone: number; phoneHasOrders: boolean }

export type DiscountError =
  | 'DISCOUNT_INVALID'
  | 'DISCOUNT_NOT_STARTED'
  | 'DISCOUNT_EXPIRED'
  | 'DISCOUNT_MIN_ORDER'
  | 'DISCOUNT_USED_UP'
  | 'DISCOUNT_ALREADY_USED'
  | 'DISCOUNT_FIRST_ORDER_ONLY'

export function discountAmount(
  code: DiscountCode | null,
  subtotal: number,
  now: Date,
  usage: DiscountUsage,
): { amount: number } | { error: DiscountError } {
  if (!code || !code.is_active) return { error: 'DISCOUNT_INVALID' }
  if (code.starts_at && now < new Date(code.starts_at)) return { error: 'DISCOUNT_NOT_STARTED' }
  if (code.ends_at && now >= new Date(code.ends_at)) return { error: 'DISCOUNT_EXPIRED' }
  if (subtotal < code.min_order) return { error: 'DISCOUNT_MIN_ORDER' }
  if (code.usage_limit !== null && usage.total >= code.usage_limit) return { error: 'DISCOUNT_USED_UP' }
  if (code.one_per_phone && usage.byPhone > 0) return { error: 'DISCOUNT_ALREADY_USED' }
  if (code.first_order_only && usage.phoneHasOrders) return { error: 'DISCOUNT_FIRST_ORDER_ONLY' }
  // Never more than the subtotal; percentages round down to whole rupees.
  const amount = code.type === 'percent' ? Math.floor((subtotal * code.value) / 100) : code.value
  return { amount: Math.min(amount, subtotal) }
}
