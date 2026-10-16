// Prices a whole order from database values (CLAUDE.md section 9). quote-order shows the result;
// place-order refuses the order if any problem is listed. Prices sent by the browser are never used.
import { type DeliveryBranch, type DeliveryTier, deliveryQuote } from './delivery.ts'
import { type DiscountCode, type DiscountError, type DiscountUsage, discountAmount } from './discount.ts'
import { type OpeningHours, openingStatus } from './opening-hours.ts'
import { type LineChoice, type LineError, type PricedItem, unitPrice } from './pricing.ts'

type Named = { name_en: string; name_ur: string }

// A menu item as loaded for pricing, with the names an order line keeps as its snapshot.
export type OrderItem = Named & {
  id: string
  base_price: number
  is_available: boolean
  variants: (PricedItem['variants'][number] & Named)[]
  addon_groups: (Omit<PricedItem['addon_groups'][number], 'options'> & {
    options: (PricedItem['addon_groups'][number]['options'][number] & Named)[]
  })[]
}

export type OrderBranch = DeliveryBranch & {
  id: string
  order_prefix: string
  delivery_enabled: boolean
  min_order_amount: number
  hours: OpeningHours
  tiers: DeliveryTier[]
}

export type OrderLineInput = LineChoice & { itemId: string; quantity: number }

export type OrderProblem =
  | 'BRANCH_CLOSED'
  | 'DELIVERY_PAUSED'
  | 'OUTSIDE_DELIVERY_AREA'
  | 'ITEM_UNAVAILABLE_OR_CHANGED'
  | 'BELOW_MINIMUM'
  | DiscountError

export type PricedLine = Named & {
  itemId: string
  variantId: string | null
  variant: Named | null
  addons: (Named & { id: string; extra_price: number })[]
  quantity: number
  unitPrice: number
  lineTotal: number
}

export function priceOrder(order: {
  branch: OrderBranch
  items: Map<string, OrderItem>
  lines: OrderLineInput[]
  pin: { lat: number; lng: number }
  now: Date
  discount?: { code: DiscountCode | null; usage: DiscountUsage }
}) {
  const priced: PricedLine[] = []
  const lineErrors: { index: number; error: LineError | 'ITEM_NOT_FOUND' }[] = []

  order.lines.forEach((line, index) => {
    const item = order.items.get(line.itemId)
    if (!item) return lineErrors.push({ index, error: 'ITEM_NOT_FOUND' })
    const result = unitPrice(item, line)
    if ('error' in result) return lineErrors.push({ index, error: result.error })
    const variant = item.variants.find((v) => v.id === line.variantId)
    priced.push({
      itemId: item.id,
      name_en: item.name_en,
      name_ur: item.name_ur,
      variantId: line.variantId,
      variant: variant ? { name_en: variant.name_en, name_ur: variant.name_ur } : null,
      addons: item.addon_groups.flatMap((g) => g.options).filter((o) => line.addonOptionIds.includes(o.id)),
      quantity: line.quantity,
      unitPrice: result.price,
      lineTotal: result.price * line.quantity,
    })
  })

  const subtotal = priced.reduce((sum, line) => sum + line.lineTotal, 0)
  const delivery = deliveryQuote(order.branch, order.branch.tiers, order.pin, subtotal)
  const discount = order.discount ? discountAmount(order.discount.code, subtotal, order.now, order.discount.usage) : null
  const discountTotal = discount && 'amount' in discount ? discount.amount : 0
  const deliveryCharge = 'charge' in delivery ? delivery.charge : 0

  const problems: OrderProblem[] = []
  if (!openingStatus(order.branch.hours, order.now).open) problems.push('BRANCH_CLOSED')
  if (!order.branch.delivery_enabled) problems.push('DELIVERY_PAUSED')
  if ('error' in delivery) problems.push(delivery.error)
  if (lineErrors.length > 0) problems.push('ITEM_UNAVAILABLE_OR_CHANGED')
  if (subtotal < order.branch.min_order_amount) problems.push('BELOW_MINIMUM')
  if (discount && 'error' in discount) problems.push(discount.error)

  return {
    lines: priced,
    lineErrors,
    subtotal,
    distanceKm: 'distanceKm' in delivery ? delivery.distanceKm : null,
    deliveryCharge,
    discountAmount: discountTotal,
    total: subtotal - discountTotal + deliveryCharge,
    problems,
  }
}

// The order_items rows create_order and replace_order_contents save: names and prices as they are now,
// so later menu changes never alter an order.
export const snapshotLines = (lines: PricedLine[]) =>
  lines.map((line) => ({
    item_id: line.itemId,
    variant_id: line.variantId,
    name_en: line.name_en,
    name_ur: line.name_ur,
    variant_name_en: line.variant?.name_en ?? null,
    variant_name_ur: line.variant?.name_ur ?? null,
    unit_price: line.unitPrice,
    quantity: line.quantity,
    line_total: line.lineTotal,
    addons: line.addons.map((addon) => ({
      addon_option_id: addon.id,
      name_en: addon.name_en,
      name_ur: addon.name_ur,
      extra_price: addon.extra_price,
    })),
  }))

// The database keeps six decimal places (about 10 cm).
export const round6 = (value: number) => Math.round(value * 1e6) / 1e6
