import { createClient } from '@supabase/supabase-js'

// The secret key bypasses RLS, so every query here must filter what customers may see or change.
// Newer projects provide SUPABASE_SECRET_KEYS (a JSON object of keys); older ones the service role key.
const secretKeys = Object.values(JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') ?? '{}')) as string[]
const secretKey = secretKeys[0] ?? Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
if (!secretKey) throw new Error('No Supabase secret key in the Edge Function environment')

export const db = createClient(Deno.env.get('SUPABASE_URL') ?? '', secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
})
