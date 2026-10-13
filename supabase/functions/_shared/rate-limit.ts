import { db } from './db.ts'

// True when this action from this identifier (IP or phone) is over its limit for the current window.
// Only a SHA-256 hash of the identifier is stored.
export async function rateLimited(action: string, identifier: string, windowSeconds: number, max: number) {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(`${action}:${identifier}`))
  const key = [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
  const { data, error } = await db.rpc('hit_rate_limit', { limit_key: key, window_seconds: windowSeconds, max_count: max })
  if (error) throw error
  return data !== true
}
