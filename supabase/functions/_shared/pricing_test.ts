import { assertEquals } from '@std/assert'
import { type PricedItem, unitPrice } from './pricing.ts'

const karahi: PricedItem = {
  base_price: 1150,
  is_available: true,
  variants: [
    { id: 'half', price: 1150, is_available: true },
    { id: 'full', price: 2200, is_available: true },
    { id: 'family', price: 4000, is_available: false },
  ],
  addon_groups: [
    {
      id: 'spice',
      min_select: 1,
      max_select: 1,
      options: [
        { id: 'mild', extra_price: 0, is_available: true },
        { id: 'hot', extra_price: 0, is_available: true },
      ],
    },
    {
      id: 'extras',
      min_select: 0,
      max_select: 2,
      options: [
        { id: 'raita', extra_price: 80, is_available: true },
        { id: 'salad', extra_price: 100, is_available: true },
        { id: 'naan', extra_price: 50, is_available: false },
      ],
    },
  ],
}

const naan: PricedItem = { base_price: 200, is_available: true, variants: [], addon_groups: [] }

Deno.test('variant price plus chosen add-ons', () => {
  assertEquals(unitPrice(karahi, { variantId: 'full', addonOptionIds: ['hot', 'raita', 'salad'] }), { price: 2380 })
  assertEquals(unitPrice(karahi, { variantId: 'half', addonOptionIds: ['mild'] }), { price: 1150 })
})

Deno.test('item without variants uses its base price', () => {
  assertEquals(unitPrice(naan, { variantId: null, addonOptionIds: [] }), { price: 200 })
})

Deno.test('rejects sold-out items, variants and add-ons', () => {
  assertEquals(unitPrice({ ...naan, is_available: false }, { variantId: null, addonOptionIds: [] }), {
    error: 'ITEM_UNAVAILABLE',
  })
  assertEquals(unitPrice(karahi, { variantId: 'family', addonOptionIds: ['mild'] }), { error: 'VARIANT_UNAVAILABLE' })
  assertEquals(unitPrice(karahi, { variantId: 'half', addonOptionIds: ['mild', 'naan'] }), { error: 'ADDON_UNAVAILABLE' })
})

Deno.test('requires a valid variant when the item has variants, and none otherwise', () => {
  assertEquals(unitPrice(karahi, { variantId: null, addonOptionIds: ['mild'] }), { error: 'VARIANT_INVALID' })
  assertEquals(unitPrice(karahi, { variantId: 'other-item-variant', addonOptionIds: ['mild'] }), {
    error: 'VARIANT_INVALID',
  })
  assertEquals(unitPrice(naan, { variantId: 'half', addonOptionIds: [] }), { error: 'VARIANT_INVALID' })
})

Deno.test('enforces each add-on group minimum and maximum', () => {
  assertEquals(unitPrice(karahi, { variantId: 'half', addonOptionIds: [] }), { error: 'ADDON_COUNT' })
  assertEquals(unitPrice(karahi, { variantId: 'half', addonOptionIds: ['mild', 'hot'] }), { error: 'ADDON_COUNT' })
  assertEquals(unitPrice(karahi, { variantId: 'half', addonOptionIds: ['mild', 'raita', 'salad', 'naan'] }), {
    error: 'ADDON_COUNT',
  })
})

Deno.test('rejects add-ons that are not offered on the item, and duplicates', () => {
  assertEquals(unitPrice(naan, { variantId: null, addonOptionIds: ['raita'] }), { error: 'ADDON_INVALID' })
  assertEquals(unitPrice(karahi, { variantId: 'half', addonOptionIds: ['mild', 'raita', 'raita'] }), {
    error: 'ADDON_INVALID',
  })
})
