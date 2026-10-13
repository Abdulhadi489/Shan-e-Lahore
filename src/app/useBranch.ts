import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'

async function fetchBranch() {
  // shortcut: the site serves the only active branch; add a branch picker here for a second branch.
  const { data, error } = await supabase
    .from('branches')
    .select(
      `id, name_en, name_ur, address_en, address_ur, phone, lat, lng,
       branch_settings ( delivery_enabled, min_order_amount, free_delivery_threshold, road_distance_factor, whatsapp_number, estimated_delivery_minutes ),
       opening_hours ( weekday, open_time, close_time, is_closed ),
       delivery_tiers ( upper_km, charge )`,
    )
    .eq('is_active', true)
    .limit(1)
    .single()
  if (error) throw error
  return data
}

export function useBranch() {
  return useQuery({ queryKey: ['branch'], queryFn: fetchBranch })
}
