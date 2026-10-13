import { FunctionsHttpError } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import type { CartLine } from './cart'

// The customer Edge Functions answer with JSON: the result, or { error: CODE, ... }.
export class OrderApiError extends Error {
  constructor(
    public code: string,
    public details: Record<string, unknown> = {},
  ) {
    super(code)
  }
}

async function invoke<T>(name: string, body: object): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body })
  if (!error) return data as T
  if (error instanceof FunctionsHttpError) {
    const details = await error.context.json().catch(() => ({}))
    throw new OrderApiError(typeof details.error === 'string' ? details.error : 'SERVER_ERROR', details)
  }
  throw new OrderApiError('NETWORK')
}

export type Quote = {
  subtotal: number
  distanceKm: number | null
  deliveryCharge: number
  discountAmount: number
  total: number
  problems: string[]
  lineErrors: { index: number; error: string }[]
}

export type PlaceOrderInput = {
  lines: CartLine[]
  lat: number
  lng: number
  discountCode?: string
  name: string
  phone: string
  address: string
  landmark: string
  notes: string
  paymentMethod: 'cod' | 'bank_transfer' | 'jazzcash' | 'easypaisa'
  language: 'en' | 'ur'
  turnstileToken: string
}

export type TrackedOrder = {
  orderNumber: string
  status: 'pending_confirmation' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled'
  cancelReason: string | null
  firstName: string
  maskedPhone: string
  times: Record<'placed' | 'confirmed' | 'preparing' | 'outForDelivery' | 'delivered' | 'cancelled', string | null>
  items: {
    name_en: string
    name_ur: string
    variant_en: string | null
    variant_ur: string | null
    quantity: number
    lineTotal: number
    addons: { name_en: string; name_ur: string }[]
  }[]
  subtotal: number
  deliveryCharge: number
  discountAmount: number
  total: number
  paymentMethod: PlaceOrderInput['paymentMethod']
  paymentStatus: 'unpaid' | 'paid' | 'refund_due' | 'refunded'
  paymentAccount: { bankName?: string | null; title: string | null; number: string | null; iban?: string | null } | null
  whatsappNumber: string | null
  branchPhone: string | null
  estimatedDeliveryMinutes: number | null
  rider: { name: string; phone: string } | null
}

export const getQuote = (body: { lines: CartLine[]; lat: number; lng: number; discountCode?: string }) =>
  invoke<Quote>('quote-order', body)
export const placeOrder = (body: PlaceOrderInput) =>
  invoke<{ orderNumber: string; trackingToken: string }>('place-order', body)
export const getOrder = (token: string) => invoke<TrackedOrder>('get-order-by-token', { token })
export const cancelOrder = (token: string) => invoke<{ status: 'cancelled' }>('cancel-order-by-token', { token })
