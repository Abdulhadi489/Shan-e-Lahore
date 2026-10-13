// Checks a Cloudflare Turnstile token on the server. The secret lives only in Edge Function secrets.
export async function turnstilePassed(token: string, ip: string) {
  const secret = Deno.env.get('TURNSTILE_SECRET_KEY')
  if (!secret) throw new Error('TURNSTILE_SECRET_KEY is not set')
  const body = new FormData()
  body.append('secret', secret)
  body.append('response', token)
  if (ip !== 'unknown') body.append('remoteip', ip)
  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body })
  const result = (await response.json()) as { success?: boolean }
  return result.success === true
}
