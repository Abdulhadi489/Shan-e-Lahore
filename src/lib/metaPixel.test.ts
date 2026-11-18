import { describe, expect, it } from 'vitest'
import { pixelMayTrack } from './metaPixel'

describe('pixelMayTrack', () => {
  it('counts ordinary customer pages', () => {
    for (const path of ['/', '/menu', '/cart', '/checkout', '/contact', '/privacy']) expect(pixelMayTrack(path)).toBe(true)
  })

  it('never sends an order-tracking link, whose token opens the order', () => {
    expect(pixelMayTrack('/track/AbCdEf0123456789abcdef0123456789AbCdEf01234')).toBe(false)
    // The router matches /Track/… as well, so any capitalisation counts.
    expect(pixelMayTrack('/TRACK/AbCdEf0123456789abcdef0123456789AbCdEf01234')).toBe(false)
  })
})
