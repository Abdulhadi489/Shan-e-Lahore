// One definition validates the stored cart, the checkout form and every Edge Function input
// (CLAUDE.md section 8). Strict objects reject unknown fields.
import { z } from 'zod'
import { normalisePakistaniMobile } from './phone.ts'
import { MAX_QUANTITY } from './pricing.ts'

export const cartLine = z.strictObject({
  itemId: z.uuid(),
  variantId: z.uuid().nullable(),
  addonOptionIds: z.array(z.uuid()).max(20),
  quantity: z.int().min(1).max(MAX_QUANTITY),
})

// Accepts any common way of typing the number and outputs 923XXXXXXXXX.
export const mobile = z
  .string()
  .max(30)
  .transform((value, ctx) => {
    const normalised = normalisePakistaniMobile(value)
    if (normalised) return normalised
    ctx.addIssue({ code: 'custom', message: 'PHONE_INVALID' })
    return z.NEVER
  })

export const discountCode = z.string().trim().toUpperCase().regex(/^[A-Z0-9]{3,20}$/)

export const quoteRequest = z.strictObject({
  lines: z.array(cartLine).min(1).max(50),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  discountCode: discountCode.optional(),
  // Optional here: per-phone discount rules can only be checked once the phone is known.
  phone: mobile.optional(),
})

export const customerDetails = z.strictObject({
  name: z.string().trim().min(1).max(60),
  phone: mobile,
  address: z.string().trim().min(1).max(300),
  landmark: z.string().trim().max(150),
  notes: z.string().trim().max(300),
  paymentMethod: z.enum(['cod', 'bank_transfer', 'jazzcash', 'easypaisa']),
})

export const placeOrderRequest = z.strictObject({
  ...quoteRequest.shape,
  ...customerDetails.shape,
  language: z.enum(['en', 'ur']),
  turnstileToken: z.string().min(1).max(2048),
})

export const tokenRequest = z.strictObject({ token: z.string().regex(/^[A-Za-z0-9_-]{43,}$/) })
