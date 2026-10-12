import { createClient } from '@supabase/supabase-js'
import type { Database } from '../types/database'

const url: string | undefined = import.meta.env.VITE_SUPABASE_URL
const publishableKey: string | undefined = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
if (!url || !publishableKey) {
  throw new Error('Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in .env.local (see .env.example)')
}

export const supabase = createClient<Database>(url, publishableKey)
