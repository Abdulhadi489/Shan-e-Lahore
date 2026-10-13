// Delivery charge from the distance between the branch and the customer's map pin (CLAUDE.md section 9).
// Shared by the website (shows the charge as soon as the pin is set) and quote-order / place-order.

type Point = { lat: number; lng: number }

export type DeliveryBranch = Point & { road_distance_factor: number; free_delivery_threshold: number | null }
export type DeliveryTier = { upper_km: number; charge: number }
export type DeliveryQuote = { distanceKm: number; charge: number } | { error: 'OUTSIDE_DELIVERY_AREA' }

// Straight-line distance over the Earth's surface.
export function haversineKm(a: Point, b: Point) {
  const rad = Math.PI / 180
  const dLat = (b.lat - a.lat) * rad
  const dLng = (b.lng - a.lng) * rad
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2
  return 2 * 6371.0088 * Math.asin(Math.sqrt(h))
}

export function deliveryQuote(branch: DeliveryBranch, tiers: DeliveryTier[], pin: Point, subtotal: number): DeliveryQuote {
  // Riders drive further than the straight line; round up to 0.1 km (the epsilon keeps 2.0 from becoming 2.1).
  const distanceKm = Math.ceil(haversineKm(branch, pin) * branch.road_distance_factor * 10 - 1e-9) / 10
  const tier = [...tiers].sort((a, b) => a.upper_km - b.upper_km).find((t) => distanceKm <= t.upper_km)
  if (!tier) return { error: 'OUTSIDE_DELIVERY_AREA' }
  const free = branch.free_delivery_threshold !== null && subtotal >= branch.free_delivery_threshold
  return { distanceKm, charge: free ? 0 : tier.charge }
}
