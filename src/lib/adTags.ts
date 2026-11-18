// Ad and visit measurement for the restaurant: the Meta (Facebook) Pixel and Google Analytics 4. Both count page
// views and the ordering funnel (dish viewed, added to cart, checkout, order placed, with rupee values).
// Both loaders are rewritten as modules, because the Content-Security-Policy blocks inline scripts.
// Each is off when its ID is empty (local development).
const pixelId: string | undefined = import.meta.env.VITE_META_PIXEL_ID
const googleId: string | undefined = import.meta.env.VITE_GA_MEASUREMENT_ID

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
    dataLayer?: unknown[]
    gtag?: (...args: unknown[]) => void
  }
}

// A tracking link (/track/<token>) opens that order for whoever has it, so its address never goes to Meta or
// Google, and both attach the current address to every event. Staff pages (/admin) never send anything either.
// Lower-cased because React Router matches routes case-insensitively, so /Track/<token> opens the order too.
export const pixelMayTrack = (path: string) => !/^\/(track|admin)(\/|$)/.test(path.toLowerCase())

// The address Google is told about: a tracking link becomes just /track.
export const googlePageLocation = (origin: string, path: string) =>
  origin + (pixelMayTrack(path) ? path : `/${(path.split('/')[1] ?? '').toLowerCase()}`)

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

function loadGoogle(id: string) {
  if (window.gtag) return window.gtag
  window.dataLayer = window.dataLayer ?? []
  window.gtag = function gtag() {
    // gtag.js reads only the arguments object, as in Google's snippet; an array is ignored.
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer?.push(arguments)
  }

  const script = document.createElement('script')
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`
  document.head.append(script)

  window.gtag('js', new Date())
  // Page views are sent by trackPageView. GA4 still sends its own on route changes unless "Page changes based on
  // browser history events" is off in the GA4 data stream (docs/status.md). Google Signals stays off: it needs
  // ad domains the Content-Security-Policy does not allow.
  window.gtag('config', id, {
    send_page_view: false,
    allow_google_signals: false,
    page_location: googlePageLocation(window.location.origin, window.location.pathname),
  })
  return window.gtag
}

export function trackPageView(path: string) {
  if (googleId && window.gtag) {
    // Keeps the token out of anything Google sends on its own after this point. Not confirmed by Google's docs to
    // cover its automatic page views, which is why the GA4 setting above must also be off.
    window.gtag('set', { page_location: googlePageLocation(window.location.origin, path) })
  }
  if (!pixelMayTrack(path)) return
  if (pixelId) loadPixel(pixelId)('track', 'PageView')
  if (googleId) loadGoogle(googleId)('event', 'page_view', { page_location: googlePageLocation(window.location.origin, path) })
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

export function googleEventParams(lines: PixelLine[], value: number) {
  return {
    currency: 'PKR',
    value,
    items: lines.map((line) => ({ item_id: line.id, quantity: line.quantity, price: line.price })),
  }
}

const googleEventName = {
  ViewContent: 'view_item',
  AddToCart: 'add_to_cart',
  InitiateCheckout: 'begin_checkout',
  Purchase: 'purchase',
} as const

export function trackEvent(name: keyof typeof googleEventName, lines: PixelLine[], value: number) {
  if (!pixelMayTrack(window.location.pathname)) return
  if (pixelId) loadPixel(pixelId)('track', name, pixelCartParams(lines, value))
  if (googleId) loadGoogle(googleId)('event', googleEventName[name], googleEventParams(lines, value))
}
