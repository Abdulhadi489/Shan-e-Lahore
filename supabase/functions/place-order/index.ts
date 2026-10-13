// Creates a guest order. Everything is re-priced here from the database; prices from the browser are
// never used (CLAUDE.md sections 8 and 9). Orders start as pending_confirmation until staff call.
import { db } from '../_shared/db.ts'
import { clientIp, fail, serve } from '../_shared/http.ts'
import { loadBranch, loadDiscount, loadItems } from '../_shared/load.ts'
import { priceOrder } from '../_shared/order.ts'
import { rateLimited } from '../_shared/rate-limit.ts'
import { placeOrderRequest } from '../_shared/schemas.ts'
import { turnstilePassed } from '../_shared/turnstile.ts'

// The database keeps six decimal places (about 10 cm).
const round6 = (value: number) => Math.round(value * 1e6) / 1e6

serve(async (body, req) => {
  const input = placeOrderRequest.safeParse(body)
  if (!input.success) return fail(400, 'INVALID_INPUT', { fields: input.error.issues.map((issue) => issue.path.join('.')) })
  const order = input.data
  const ip = clientIp(req)

  if ((await rateLimited('place-ip', ip, 3600, 10)) || (await rateLimited('place-phone', order.phone, 600, 3))) {
    return fail(429, 'RATE_LIMITED')
  }
  if (!(await turnstilePassed(order.turnstileToken, ip))) return fail(403, 'BOT_CHECK_FAILED')

  const branch = await loadBranch()
  const discount = order.discountCode ? await loadDiscount(branch.id, order.discountCode, order.phone) : undefined
  const priced = priceOrder({
    branch,
    items: await loadItems(branch.id, order.lines.map((line) => line.itemId)),
    lines: order.lines,
    pin: { lat: order.lat, lng: order.lng },
    now: new Date(),
    discount,
  })
  if (priced.problems.length > 0 || priced.distanceKm === null) {
    return fail(409, priced.problems[0] ?? 'OUTSIDE_DELIVERY_AREA', { problems: priced.problems, lineErrors: priced.lineErrors })
  }

  const { data, error } = await db.rpc('create_order', {
    order_data: {
      branch_id: branch.id,
      customer_phone: order.phone,
      customer_name: order.name,
      address_text: order.address,
      landmark: order.landmark,
      lat: round6(order.lat),
      lng: round6(order.lng),
      distance_km: priced.distanceKm,
      payment_method: order.paymentMethod,
      subtotal: priced.subtotal,
      delivery_charge: priced.deliveryCharge,
      discount_amount: priced.discountAmount,
      total: priced.total,
      discount_code_id: discount?.id ?? null,
      language: order.language,
      notes: order.notes,
    },
    lines: priced.lines.map((line) => ({
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
    })),
  })
  if (error) {
    if (error.message.includes('NUMBER_BLOCKED')) return fail(403, 'NUMBER_BLOCKED')
    throw error
  }

  const placed = data as { order_number: number; tracking_token: string }
  return {
    status: 201,
    body: { orderNumber: `${branch.order_prefix}-${placed.order_number}`, trackingToken: placed.tracking_token },
  }
})
