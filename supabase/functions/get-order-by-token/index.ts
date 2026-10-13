// The tracking page's data. Anyone holding the link sees this, so it is minimal and masked:
// first name, masked phone, items, totals, status and payment instructions; never the address.
import { db } from '../_shared/db.ts'
import { clientIp, fail, serve } from '../_shared/http.ts'
import { rateLimited } from '../_shared/rate-limit.ts'
import { tokenRequest } from '../_shared/schemas.ts'

type Settings = Record<string, string | number | null>

// One-to-one embeds arrive as objects; the untyped client can't know that, so the row is described here.
type OrderRow = {
  order_number: number
  status: string
  cancel_reason: string | null
  payment_method: string
  payment_status: string
  language: string
  customer_name: string
  customer_phone: string
  subtotal: number
  delivery_charge: number
  discount_amount: number
  total: number
  created_at: string
  confirmed_at: string | null
  preparing_at: string | null
  out_for_delivery_at: string | null
  delivered_at: string | null
  cancelled_at: string | null
  order_items: {
    name_en: string
    name_ur: string
    variant_name_en: string | null
    variant_name_ur: string | null
    quantity: number
    line_total: number
    created_at: string
    order_item_addons: { name_en: string; name_ur: string }[]
  }[]
  riders: { name: string; phone: string } | null
  branches: { order_prefix: string; phone: string; branch_settings: Settings | null } | null
}

// Only the account the customer chose to pay with.
function paymentAccount(method: string, s: Settings) {
  if (method === 'bank_transfer') {
    return { bankName: s.bank_name, title: s.bank_account_title, number: s.bank_account_number, iban: s.bank_iban }
  }
  if (method === 'jazzcash') return { title: s.jazzcash_account_title, number: s.jazzcash_number }
  if (method === 'easypaisa') return { title: s.easypaisa_account_title, number: s.easypaisa_number }
  return null
}

serve(async (body, req) => {
  const input = tokenRequest.safeParse(body)
  if (!input.success) return fail(400, 'INVALID_INPUT')
  if (await rateLimited('track', clientIp(req), 600, 120)) return fail(429, 'RATE_LIMITED')

  const { data, error } = await db
    .from('orders')
    .select(
      `order_number, status, cancel_reason, payment_method, payment_status, language,
       customer_name, customer_phone, subtotal, delivery_charge, discount_amount, total,
       created_at, confirmed_at, preparing_at, out_for_delivery_at, delivered_at, cancelled_at,
       order_items ( name_en, name_ur, variant_name_en, variant_name_ur, quantity, line_total, created_at,
         order_item_addons ( name_en, name_ur ) ),
       riders ( name, phone ),
       branches ( order_prefix, phone,
         branch_settings ( whatsapp_number, estimated_delivery_minutes, bank_name, bank_account_title,
           bank_account_number, bank_iban, jazzcash_account_title, jazzcash_number,
           easypaisa_account_title, easypaisa_number ) )`,
    )
    .eq('tracking_token', input.data.token)
    .maybeSingle()
  if (error) throw error
  if (!data) return fail(404, 'ORDER_NOT_FOUND')
  const order = data as unknown as OrderRow

  const settings: Settings = order.branches?.branch_settings ?? {}
  const phone = order.customer_phone
  return {
    status: 200,
    body: {
      orderNumber: `${order.branches?.order_prefix}-${order.order_number}`,
      status: order.status,
      cancelReason: order.cancel_reason,
      language: order.language,
      firstName: order.customer_name.trim().split(/\s+/)[0],
      maskedPhone: `0${phone.slice(2, 5)} *****${phone.slice(-2)}`,
      times: {
        placed: order.created_at,
        confirmed: order.confirmed_at,
        preparing: order.preparing_at,
        outForDelivery: order.out_for_delivery_at,
        delivered: order.delivered_at,
        cancelled: order.cancelled_at,
      },
      items: [...order.order_items]
        .sort((a, b) => a.created_at.localeCompare(b.created_at))
        .map((item) => ({
          name_en: item.name_en,
          name_ur: item.name_ur,
          variant_en: item.variant_name_en,
          variant_ur: item.variant_name_ur,
          quantity: item.quantity,
          lineTotal: item.line_total,
          addons: item.order_item_addons,
        })),
      subtotal: order.subtotal,
      deliveryCharge: order.delivery_charge,
      discountAmount: order.discount_amount,
      total: order.total,
      paymentMethod: order.payment_method,
      paymentStatus: order.payment_status,
      paymentAccount: order.payment_status === 'unpaid' ? paymentAccount(order.payment_method, settings) : null,
      whatsappNumber: settings.whatsapp_number ?? null,
      branchPhone: order.branches?.phone ?? null,
      estimatedDeliveryMinutes: settings.estimated_delivery_minutes ?? null,
      // The rider's name and number are shared with the customer only once the food is on its way.
      rider: order.status === 'out_for_delivery' ? order.riders : null,
    },
  }
})
