// Meta (Facebook) Pixel: counts page views and the ordering funnel (dish viewed, added to cart, checkout, order
// placed, with rupee values) so the restaurant can measure its Facebook and Instagram ads.
// It is Meta's own loader rewritten as a module, because the Content-Security-Policy blocks inline scripts.
// Off when VITE_META_PIXEL_ID is empty (local development).
const pixelId: string | undefined = import.meta.env.VITE_META_PIXEL_ID

type Fbq = {
  (...args: unknown[]): void
  callMethod?: (...args: unknown[]) => void
  queue: unknown[][]
  push: Fbq
  loaded: boolean
  version: string
  disablePushState: boolean
  allowDuplicatePageViews: boolean
}

declare global {
  interface Window {
    fbq?: Fbq
    _fbq?: Fbq
  }
}

// A tracking link (/track/<token>) opens that order for whoever has it, so its address never goes to Meta, and
// Meta attaches the current address to every event. Staff pages (/admin) never send anything either. Lower-cased
// because React Router matches routes case-insensitively, so /Track/<token> opens the order too.
export const pixelMayTrack = (path: string) => !/^\/(track|admin)(\/|$)/.test(path.toLowerCase())

function loadPixel(id: string): Fbq {
  if (window.fbq) return window.fbq
  // Calls made before fbevents.js arrives wait in the queue, as in Meta's snippet.
  const fbq = ((...args: unknown[]) => {
    if (fbq.callMethod) fbq.callMethod(...args)
    else fbq.queue.push(args)
  }) as Fbq
  fbq.push = fbq
  fbq.loaded = true
  fbq.version = '2.0'
  fbq.queue = []
  // Page views are sent only by trackPageView, never by Meta following route changes on its own (it would see
  // tracking links too).
  fbq.disablePushState = true
  // Without this, Meta drops every PageView after the first one of a page load, so moving around the site (which
  // never reloads the page) would count as a single visit. Found by testing; Meta's tag-manager template sets it too.
  fbq.allowDuplicatePageViews = true
  window.fbq = window._fbq = fbq

  const script = document.createElement('script')
  script.async = true
  script.src = 'https://connect.facebook.net/en_US/fbevents.js'
  document.head.append(script)

  // No automatic events or advanced matching: Meta would otherwise read button and form text, such as the name
  // and phone number typed at checkout.
  fbq('set', 'autoConfig', false, id)
  fbq('init', id)
  return fbq
}

export function trackPageView(path: string) {
  if (!pixelId || !pixelMayTrack(path)) return
  loadPixel(pixelId)('track', 'PageView')
}

export type PixelLine = { id: string; quantity: number; price: number }

// Dish ids, quantities and rupee amounts only: never the customer's name, phone, address or order number.
export function pixelCartParams(lines: PixelLine[], value: number) {
  return {
    content_type: 'product',
    content_ids: lines.map((line) => line.id),
    contents: lines.map((line) => ({ id: line.id, quantity: line.quantity, item_price: line.price })),
    num_items: lines.reduce((sum, line) => sum + line.quantity, 0),
    value,
    currency: 'PKR',
  }
}

export function trackEvent(name: 'ViewContent' | 'AddToCart' | 'InitiateCheckout' | 'Purchase', params: ReturnType<typeof pixelCartParams>) {
  if (!pixelId || !pixelMayTrack(window.location.pathname)) return
  loadPixel(pixelId)('track', name, params)
}
