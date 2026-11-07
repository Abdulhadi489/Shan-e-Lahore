// The price the checkout page shows while the customer fills it in. Nothing is stored.
import { clientIp, fail, serve } from '../_shared/http.ts'
import { loadBranch, loadDiscount, loadItems } from '../_shared/load.ts'
import { priceOrder } from '../_shared/order.ts'
import { rateLimited } from '../_shared/rate-limit.ts'
import { quoteRequest } from '../_shared/schemas.ts'

serve(async (body, req) => {
  const input = quoteRequest.safeParse(body)
  if (!input.success) return fail(400, 'INVALID_INPUT')
  if (await rateLimited('quote', clientIp(req), 600, 60)) return fail(429, 'RATE_LIMITED')

  const { lines, lat, lng, discountCode, phone } = input.data
  const branch = await loadBranch()
  const priced = priceOrder({
    branch,
    items: await loadItems(branch.id, lines.map((line) => line.itemId), new Date()),
    lines,
    pin: { lat, lng },
    now: new Date(),
    discount: discountCode ? await loadDiscount(branch.id, discountCode, phone ?? null) : undefined,
  })

  return {
    status: 200,
    body: {
      subtotal: priced.subtotal,
      distanceKm: priced.distanceKm,
      deliveryCharge: priced.deliveryCharge,
      discountAmount: priced.discountAmount,
      total: priced.total,
      problems: priced.problems,
      lineErrors: priced.lineErrors,
    },
  }
})
