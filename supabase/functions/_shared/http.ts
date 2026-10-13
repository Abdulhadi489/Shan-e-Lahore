// Request handling shared by every Edge Function: CORS limited to our own sites, POST + JSON only,
// and error codes instead of stack traces (CLAUDE.md section 8).

const allowedOrigins = (Deno.env.get('ALLOWED_ORIGINS') ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean)

export type Reply = { status: number; body: Record<string, unknown> }

export const fail = (status: number, error: string, extra: Record<string, unknown> = {}): Reply => ({
  status,
  body: { error, ...extra },
})

// The first address in x-forwarded-for is the visitor; used only (hashed) for rate limits.
export const clientIp = (req: Request) => req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown'

export function serve(handler: (body: unknown, req: Request) => Promise<Reply>) {
  Deno.serve(async (req) => {
    const origin = req.headers.get('origin')
    // Browsers always send Origin on these cross-site calls, so other websites are refused here.
    if (origin && !allowedOrigins.includes(origin)) return new Response(null, { status: 403 })

    const headers = {
      'Access-Control-Allow-Origin': origin ?? '',
      'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      Vary: 'Origin',
    }
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers })

    let reply: Reply
    if (req.method !== 'POST') {
      reply = fail(405, 'METHOD_NOT_ALLOWED')
    } else {
      try {
        reply = await handler(await req.json().catch(() => undefined), req)
      } catch (error) {
        // Message only: Postgres details can contain customer data.
        console.error('unhandled error:', error instanceof Error ? error.message : 'unknown')
        reply = fail(500, 'SERVER_ERROR')
      }
    }
    return new Response(JSON.stringify(reply.body), {
      status: reply.status,
      headers: { ...headers, 'Content-Type': 'application/json' },
    })
  })
}
