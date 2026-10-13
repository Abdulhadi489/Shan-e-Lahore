import { assertEquals } from '@std/assert'
import { type DiscountCode, discountAmount } from './discount.ts'

const now = new Date('2026-10-20T12:00:00Z')
const unused = { total: 0, byPhone: 0, phoneHasOrders: false }
const tenPercent: DiscountCode = {
  type: 'percent',
  value: 10,
  min_order: 0,
  starts_at: null,
  ends_at: null,
  usage_limit: null,
  one_per_phone: false,
  first_order_only: false,
  is_active: true,
}

Deno.test('percent rounds down, fixed is capped at the subtotal', () => {
  assertEquals(discountAmount(tenPercent, 1999, now, unused), { amount: 199 })
  assertEquals(discountAmount({ ...tenPercent, type: 'fixed', value: 500 }, 1200, now, unused), { amount: 500 })
  assertEquals(discountAmount({ ...tenPercent, type: 'fixed', value: 500 }, 300, now, unused), { amount: 300 })
  assertEquals(discountAmount({ ...tenPercent, value: 100 }, 800, now, unused), { amount: 800 })
})

Deno.test('unknown, inactive and out-of-date codes are rejected', () => {
  assertEquals(discountAmount(null, 1000, now, unused), { error: 'DISCOUNT_INVALID' })
  assertEquals(discountAmount({ ...tenPercent, is_active: false }, 1000, now, unused), { error: 'DISCOUNT_INVALID' })
  assertEquals(discountAmount({ ...tenPercent, starts_at: '2026-10-21T00:00:00Z' }, 1000, now, unused), {
    error: 'DISCOUNT_NOT_STARTED',
  })
  assertEquals(discountAmount({ ...tenPercent, ends_at: '2026-10-20T12:00:00Z' }, 1000, now, unused), {
    error: 'DISCOUNT_EXPIRED',
  })
})

Deno.test('minimum order, usage limit, one per phone and first order only', () => {
  assertEquals(discountAmount({ ...tenPercent, min_order: 1500 }, 1499, now, unused), { error: 'DISCOUNT_MIN_ORDER' })
  assertEquals(discountAmount({ ...tenPercent, usage_limit: 100 }, 1000, now, { ...unused, total: 100 }), {
    error: 'DISCOUNT_USED_UP',
  })
  assertEquals(discountAmount({ ...tenPercent, usage_limit: 100 }, 1000, now, { ...unused, total: 99 }), { amount: 100 })
  assertEquals(discountAmount({ ...tenPercent, one_per_phone: true }, 1000, now, { ...unused, byPhone: 1 }), {
    error: 'DISCOUNT_ALREADY_USED',
  })
  assertEquals(discountAmount({ ...tenPercent, first_order_only: true }, 1000, now, { ...unused, phoneHasOrders: true }), {
    error: 'DISCOUNT_FIRST_ORDER_ONLY',
  })
})
