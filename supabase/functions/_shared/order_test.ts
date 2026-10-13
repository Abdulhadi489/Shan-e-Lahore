import { assertEquals } from '@std/assert'
import { type OrderBranch, type OrderItem, priceOrder } from './order.ts'

const branch: OrderBranch = {
  id: 'branch',
  order_prefix: 'SL',
  lat: 31.523689,
  lng: 74.344498,
  road_distance_factor: 1.3,
  free_delivery_threshold: null,
  delivery_enabled: true,
  min_order_amount: 800,
  hours: [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, open_time: '12:00:00', close_time: '02:00:00', is_closed: false })),
  tiers: [{ upper_km: 3, charge: 100 }, { upper_km: 7, charge: 200 }],
}

const karahi: OrderItem = {
  id: 'karahi',
  name_en: 'Chicken Karahi',
  name_ur: 'چکن کڑاہی',
  base_price: 1150,
  is_available: true,
  variants: [
    { id: 'half', name_en: 'Half', name_ur: 'ہاف', price: 1150, is_available: true },
    { id: 'full', name_en: 'Full', name_ur: 'فل', price: 2200, is_available: true },
  ],
  addon_groups: [],
}
const naan: OrderItem = { id: 'naan', name_en: 'Roghni Nan', name_ur: 'روغنی نان', base_price: 200, is_available: true, variants: [], addon_groups: [] }
const items = new Map([karahi, naan].map((item) => [item.id, item]))

const open = new Date('2026-10-12T18:00+05:00')
const near = { lat: branch.lat + 1 / 111.19, lng: branch.lng }

Deno.test('prices lines from the menu, adds delivery and keeps snapshots', () => {
  const result = priceOrder({
    branch,
    items,
    pin: near,
    now: open,
    lines: [
      { itemId: 'karahi', variantId: 'full', addonOptionIds: [], quantity: 2 },
      { itemId: 'naan', variantId: null, addonOptionIds: [], quantity: 3 },
    ],
  })
  assertEquals(result.problems, [])
  assertEquals(result.subtotal, 5000)
  assertEquals(result.deliveryCharge, 100)
  assertEquals(result.total, 5100)
  assertEquals(result.lines[0]?.variant, { name_en: 'Full', name_ur: 'فل' })
  assertEquals(result.lines[0]?.lineTotal, 4400)
})

Deno.test('applies a discount before delivery', () => {
  const result = priceOrder({
    branch,
    items,
    pin: near,
    now: open,
    lines: [{ itemId: 'karahi', variantId: 'full', addonOptionIds: [], quantity: 1 }],
    discount: {
      code: {
        type: 'percent', value: 10, min_order: 0, starts_at: null, ends_at: null, usage_limit: null,
        one_per_phone: false, first_order_only: false, is_active: true,
      },
      usage: { total: 0, byPhone: 0, phoneHasOrders: false },
    },
  })
  assertEquals([result.subtotal, result.discountAmount, result.deliveryCharge, result.total], [2200, 220, 100, 2080])
})

Deno.test('lists every reason an order cannot be placed', () => {
  const closedAt = new Date('2026-10-12T08:00+05:00')
  const far = { lat: branch.lat + 10 / 111.19, lng: branch.lng }
  const result = priceOrder({
    branch: { ...branch, delivery_enabled: false },
    items,
    pin: far,
    now: closedAt,
    lines: [
      { itemId: 'naan', variantId: null, addonOptionIds: [], quantity: 1 },
      { itemId: 'gone', variantId: null, addonOptionIds: [], quantity: 1 },
      { itemId: 'karahi', variantId: null, addonOptionIds: [], quantity: 1 },
    ],
    discount: { code: null, usage: { total: 0, byPhone: 0, phoneHasOrders: false } },
  })
  assertEquals(result.problems, [
    'BRANCH_CLOSED',
    'DELIVERY_PAUSED',
    'OUTSIDE_DELIVERY_AREA',
    'ITEM_UNAVAILABLE_OR_CHANGED',
    'BELOW_MINIMUM',
    'DISCOUNT_INVALID',
  ])
  assertEquals(result.lineErrors, [
    { index: 1, error: 'ITEM_NOT_FOUND' },
    { index: 2, error: 'VARIANT_INVALID' },
  ])
  assertEquals(result.subtotal, 200)
})
