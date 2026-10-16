// Staff change an order's dishes or address during the confirmation call. Everything is re-priced here
// from the database, exactly as place-order does; public.replace_order_contents then checks the caller
// is staff of the order's branch and the order still waits for its call, and saves it in one transaction.
import { db } from '../_shared/db.ts'
import type { DiscountCode } from '../_shared/discount.ts'
import { fail, serve } from '../_shared/http.ts'
import { loadBranch, loadItems } from '../_shared/load.ts'
import { priceOrder, round6, snapshotLines } from '../_shared/order.ts'
import { editOrderRequest } from '../_shared/schemas.ts'

// The order was already accepted, so the restaurant closing or pausing delivery since doesn't block the edit.
const ignoredOnEdit = new Set(['BRANCH_CLOSED', 'DELIVERY_PAUSED'])

serve(async (body, req) => {
  const input = editOrderRequest.safeParse(body)
  if (!input.success) return fail(400, 'INVALID_INPUT')
  const edit = input.data

  const token = req.headers.get('authorization')?.replace(/^Bearer /i, '') ?? ''
  const { data: caller } = await db.auth.getUser(token)
  if (!caller.user) return fail(401, 'NOT_SIGNED_IN')

  const { data: order, error: orderError } = await db
    .from('orders')
    .select('branch_id, status, created_at, discount_code_id')
    .eq('id', edit.orderId)
    .maybeSingle()
  if (orderError) throw orderError
  if (!order) return fail(404, 'ORDER_NOT_FOUND')
  if (order.status !== 'pending_confirmation') return fail(409, 'ORDER_NOT_EDITABLE')

  const branch = await loadBranch()
  if (branch.id !== order.branch_id) return fail(403, 'NOT_ALLOWED')

  // The code the customer used still applies, judged as when they ordered; the usage limits were met
  // then and this order is already one of the uses. If the new dishes fall below its minimum, it is dropped.
  let discount: { code: DiscountCode | null; usage: { total: number; byPhone: number; phoneHasOrders: boolean } } | undefined
  if (order.discount_code_id) {
    const { data: code, error } = await db
      .from('discount_codes')
      .select('type, value, min_order, starts_at, ends_at, usage_limit, one_per_phone, first_order_only, is_active')
      .eq('id', order.discount_code_id)
      .single()
    if (error) throw error
    discount = { code: { ...(code as DiscountCode), is_active: true }, usage: { total: 0, byPhone: 0, phoneHasOrders: false } }
  }

  const items = await loadItems(branch.id, edit.lines.map((line) => line.itemId))
  const price = (withDiscount: boolean) =>
    priceOrder({
      branch,
      items,
      lines: edit.lines,
      pin: { lat: edit.lat, lng: edit.lng },
      now: new Date(order.created_at),
      discount: withDiscount ? discount : undefined,
    })
  let priced = price(true)
  let discountRemoved = false
  if (discount && priced.problems.some((problem) => problem.startsWith('DISCOUNT_'))) {
    priced = price(false)
    discountRemoved = true
  }
  const problems = priced.problems.filter((problem) => !ignoredOnEdit.has(problem))
  if (problems.length > 0 || priced.distanceKm === null) {
    return fail(409, problems[0] ?? 'OUTSIDE_DELIVERY_AREA', { problems, lineErrors: priced.lineErrors })
  }

  const { error } = await db.rpc('replace_order_contents', {
    actor_id: caller.user.id,
    target_order_id: edit.orderId,
    order_data: {
      address_text: edit.address,
      landmark: edit.landmark,
      lat: round6(edit.lat),
      lng: round6(edit.lng),
      distance_km: priced.distanceKm,
      subtotal: priced.subtotal,
      delivery_charge: priced.deliveryCharge,
      discount_amount: priced.discountAmount,
      total: priced.total,
      discount_code_id: discountRemoved ? null : order.discount_code_id,
    },
    lines: snapshotLines(priced.lines),
  })
  if (error) {
    if (error.message === 'NOT_ALLOWED') return fail(403, 'NOT_ALLOWED')
    if (error.message === 'ORDER_NOT_EDITABLE') return fail(409, 'ORDER_NOT_EDITABLE')
    throw error
  }
  return {
    status: 200,
    body: { subtotal: priced.subtotal, deliveryCharge: priced.deliveryCharge, discountAmount: priced.discountAmount, total: priced.total, discountRemoved },
  }
})
