import { assertAlmostEquals, assertEquals } from '@std/assert'
import { type DeliveryBranch, deliveryQuote, haversineKm } from './delivery.ts'

const branch: DeliveryBranch = { lat: 31.523689, lng: 74.344498, road_distance_factor: 1.3, free_delivery_threshold: null }
const tiers = [
  { upper_km: 5, charge: 150 },
  { upper_km: 3, charge: 100 },
  { upper_km: 7, charge: 200 },
]

Deno.test('haversine matches a known distance', () => {
  // One degree of latitude is about 111.2 km.
  assertAlmostEquals(haversineKm({ lat: 31, lng: 74 }, { lat: 32, lng: 74 }), 111.19, 0.01)
  assertEquals(haversineKm(branch, branch), 0)
})

Deno.test('applies the road factor, rounds up to 0.1 km and picks the first tier that fits', () => {
  // About 2.0 km straight north, so about 2.6 km by road: the 3 km tier.
  const pin = { lat: branch.lat + 2 / 111.19, lng: branch.lng }
  assertEquals(deliveryQuote(branch, tiers, pin, 1000), { distanceKm: 2.7, charge: 100 })
  // About 3 km straight is 3.9002 km by road, which rounds up to 4.0: the 5 km tier.
  const further = { lat: branch.lat + 3 / 111.19, lng: branch.lng }
  assertEquals(deliveryQuote(branch, tiers, further, 1000), { distanceKm: 4, charge: 150 })
})

Deno.test('a distance exactly equal to a tier limit belongs to that tier', () => {
  // 2.00009 km straight with no road factor rounds up to 2.1 km.
  const noFactor = { ...branch, road_distance_factor: 1 }
  const pin = { lat: branch.lat + 2 / 111.19, lng: branch.lng }
  assertEquals(deliveryQuote(noFactor, [{ upper_km: 2.1, charge: 90 }, { upper_km: 3, charge: 100 }], pin, 1000), {
    distanceKm: 2.1,
    charge: 90,
  })
})

Deno.test('beyond the last tier is outside the delivery area', () => {
  const far = { lat: branch.lat + 6 / 111.19, lng: branch.lng }
  assertEquals(deliveryQuote(branch, tiers, far, 1000), { error: 'OUTSIDE_DELIVERY_AREA' })
  assertEquals(deliveryQuote(branch, [], branch, 1000), { error: 'OUTSIDE_DELIVERY_AREA' })
})

Deno.test('free delivery at or above the threshold, still limited to the area', () => {
  const generous = { ...branch, free_delivery_threshold: 3000 }
  const pin = { lat: branch.lat + 2 / 111.19, lng: branch.lng }
  assertEquals(deliveryQuote(generous, tiers, pin, 3000), { distanceKm: 2.7, charge: 0 })
  assertEquals(deliveryQuote(generous, tiers, pin, 2999), { distanceKm: 2.7, charge: 100 })
  const far = { lat: branch.lat + 6 / 111.19, lng: branch.lng }
  assertEquals(deliveryQuote(generous, tiers, far, 5000), { error: 'OUTSIDE_DELIVERY_AREA' })
})
