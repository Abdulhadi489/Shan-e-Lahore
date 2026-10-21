import { describe, expect, it } from 'vitest'
import type { PricedItem } from '../../../supabase/functions/_shared/pricing'
import { cartSubtotal } from './cart'

const naan: PricedItem = { base_price: 200, is_available: true, variants: [], addon_groups: [] }
const karahi: PricedItem = {
  base_price: 0,
  is_available: true,
  variants: [{ id: 'half', price: 1150, is_available: true }],
  addon_groups: [],
}
const items = new Map([
  ['naan', naan],
  ['karahi', karahi],
  ['gone', { ...naan, is_available: false }],
])

describe('cartSubtotal', () => {
  it('adds each line at its current price times the quantity', () => {
    expect(
      cartSubtotal(
        [
          { itemId: 'naan', variantId: null, addonOptionIds: [], quantity: 3 },
          { itemId: 'karahi', variantId: 'half', addonOptionIds: [], quantity: 1 },
        ],
        items,
      ),
    ).toBe(1750)
  })

  it('counts dishes no longer on sale, or missing from the menu, as 0', () => {
    expect(
      cartSubtotal(
        [
          { itemId: 'gone', variantId: null, addonOptionIds: [], quantity: 2 },
          { itemId: 'deleted', variantId: null, addonOptionIds: [], quantity: 1 },
          { itemId: 'naan', variantId: null, addonOptionIds: [], quantity: 1 },
        ],
        items,
      ),
    ).toBe(200)
  })
})
