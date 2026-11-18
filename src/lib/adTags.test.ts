import { describe, expect, it } from 'vitest'
import { googleEventParams, googlePageLocation, pixelCartParams, pixelMayTrack } from './adTags'

describe('pixelMayTrack', () => {
  it('counts ordinary customer pages', () => {
    for (const path of ['/', '/menu', '/cart', '/checkout', '/contact', '/privacy']) expect(pixelMayTrack(path)).toBe(true)
  })

  it('never sends an order-tracking link, whose token opens the order', () => {
    expect(pixelMayTrack('/track/AbCdEf0123456789abcdef0123456789AbCdEf01234')).toBe(false)
    // The router matches /Track/… as well, so any capitalisation counts.
    expect(pixelMayTrack('/TRACK/AbCdEf0123456789abcdef0123456789AbCdEf01234')).toBe(false)
  })

  it('never counts staff pages', () => {
    for (const path of ['/admin', '/admin/orders', '/Admin/menu']) expect(pixelMayTrack(path)).toBe(false)
    expect(pixelMayTrack('/administration-fees')).toBe(true)
  })
})

describe('pixelCartParams', () => {
  it('sends dish ids, quantities and rupee values in PKR', () => {
    expect(pixelCartParams([{ id: 'a', quantity: 2, price: 450 }, { id: 'b', quantity: 1, price: 60 }], 960)).toEqual({
      content_type: 'product',
      content_ids: ['a', 'b'],
      contents: [{ id: 'a', quantity: 2, item_price: 450 }, { id: 'b', quantity: 1, item_price: 60 }],
      num_items: 3,
      value: 960,
      currency: 'PKR',
    })
  })
})

describe('googlePageLocation', () => {
  it('keeps ordinary pages and cuts the token off a tracking link', () => {
    expect(googlePageLocation('https://shanelahore.com', '/menu')).toBe('https://shanelahore.com/menu')
    expect(googlePageLocation('https://shanelahore.com', '/Track/AbCdEf0123456789')).toBe('https://shanelahore.com/track')
  })
})

describe('googleEventParams', () => {
  it('sends GA4 items with rupee prices in PKR', () => {
    expect(googleEventParams([{ id: 'a', quantity: 2, price: 450 }], 900)).toEqual({
      currency: 'PKR',
      value: 900,
      items: [{ item_id: 'a', quantity: 2, price: 450 }],
    })
  })
})
