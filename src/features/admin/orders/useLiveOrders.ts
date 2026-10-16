import { useEffect } from 'react'
import { skipToken, useQuery, useQueryClient } from '@tanstack/react-query'
import type { QueryData } from '@supabase/supabase-js'
import { supabase } from '../../../lib/supabase'

// Pakistan has no daylight saving, so Lahore midnight is always 19:00 UTC the day before.
function startOfLahoreDay() {
  const offset = 5 * 3_600_000
  return new Date(Math.floor((Date.now() + offset) / 86_400_000) * 86_400_000 - offset)
}

// Open orders of any age, everything placed today, and refunds still to send.
const liveOrdersQuery = (branchId: string) =>
  supabase
    .from('orders')
    .select(
      `id, order_number, tracking_token, status, cancel_reason, payment_method, payment_status, transaction_id,
       payment_verified_at, customer_name, customer_phone, address_text, landmark, lat, lng, distance_km, notes,
       language, subtotal, delivery_charge, discount_amount, total, rider_id, created_at,
       order_items ( id, item_id, variant_id, name_en, variant_name_en, quantity, line_total, order_item_addons ( id, addon_option_id, name_en ) ),
       riders ( name, phone ),
       call_attempts ( count )`,
    )
    .eq('branch_id', branchId)
    .or(
      `status.in.(pending_confirmation,confirmed,preparing,out_for_delivery),created_at.gte."${startOfLahoreDay().toISOString()}",payment_status.eq.refund_due`,
    )
    .order('created_at', { ascending: false })

export type LiveOrder = QueryData<ReturnType<typeof liveOrdersQuery>>[number]

export function useLiveOrders(branchId: string | undefined) {
  const queryClient = useQueryClient()

  // Realtime only says "something changed"; refetching keeps one source of truth and includes the order lines.
  // The database's select policy decides who receives these events.
  useEffect(() => {
    if (!branchId) return
    const channel = supabase
      .channel(`orders-${branchId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `branch_id=eq.${branchId}` }, () => {
        void queryClient.invalidateQueries({ queryKey: ['live-orders', branchId] })
      })
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  }, [branchId, queryClient])

  return useQuery({
    queryKey: ['live-orders', branchId],
    queryFn: branchId
      ? async () => {
          const { data, error } = await liveOrdersQuery(branchId)
          if (error) throw error
          return data
        }
      : skipToken,
    // Backup for a dropped live connection. Keeps running while the tab is in the background.
    refetchInterval: 30_000,
    refetchIntervalInBackground: true,
  })
}
