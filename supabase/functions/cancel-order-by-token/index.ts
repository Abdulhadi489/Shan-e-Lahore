// Customers may cancel online only while the order still waits for the confirmation call.
// The orders trigger applies the usual rules (a paid transfer becomes refund_due).
import { db } from '../_shared/db.ts'
import { clientIp, fail, serve } from '../_shared/http.ts'
import { rateLimited } from '../_shared/rate-limit.ts'
import { tokenRequest } from '../_shared/schemas.ts'

serve(async (body, req) => {
  const input = tokenRequest.safeParse(body)
  if (!input.success) return fail(400, 'INVALID_INPUT')
  if (await rateLimited('cancel', clientIp(req), 3600, 20)) return fail(429, 'RATE_LIMITED')

  const { data, error } = await db
    .from('orders')
    .update({ status: 'cancelled', cancel_reason: 'customer_request' })
    .eq('tracking_token', input.data.token)
    .eq('status', 'pending_confirmation')
    .select('id')
    .maybeSingle()
  if (error) throw error
  if (data) return { status: 200, body: { status: 'cancelled' } }

  const { data: existing, error: lookupError } = await db
    .from('orders')
    .select('id')
    .eq('tracking_token', input.data.token)
    .maybeSingle()
  if (lookupError) throw lookupError
  return existing ? fail(409, 'ORDER_NOT_CANCELLABLE') : fail(404, 'ORDER_NOT_FOUND')
})
