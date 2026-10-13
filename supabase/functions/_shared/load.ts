// Loads what priceOrder needs from the database. The secret key bypasses RLS, so these queries
// apply the customer-visible rules themselves: active branch, visible items in active categories.
import { db } from './db.ts'
import type { DiscountCode, DiscountUsage } from './discount.ts'
import type { OrderBranch, OrderItem } from './order.ts'

type BranchRow = {
  id: string
  order_prefix: string
  lat: number
  lng: number
  branch_settings: {
    delivery_enabled: boolean
    min_order_amount: number
    free_delivery_threshold: number | null
    road_distance_factor: number
  } | null
  opening_hours: OrderBranch['hours']
  delivery_tiers: { upper_km: number; charge: number }[]
}

export async function loadBranch(): Promise<OrderBranch> {
  // shortcut: the site serves the only active branch; pass a branch id once customers can choose one.
  const { data, error } = await db
    .from('branches')
    .select(
      `id, order_prefix, lat, lng,
       branch_settings ( delivery_enabled, min_order_amount, free_delivery_threshold, road_distance_factor ),
       opening_hours ( weekday, open_time, close_time, is_closed ),
       delivery_tiers ( upper_km, charge )`,
    )
    .eq('is_active', true)
    .limit(1)
    .single()
  if (error) throw error
  // One-to-one embeds arrive as objects; the untyped client can't know that, so the row is described here.
  const row = data as unknown as BranchRow
  const settings = row.branch_settings
  if (!settings) throw new Error('branch has no settings row')
  return {
    id: row.id,
    order_prefix: row.order_prefix,
    lat: Number(row.lat),
    lng: Number(row.lng),
    road_distance_factor: Number(settings.road_distance_factor),
    free_delivery_threshold: settings.free_delivery_threshold,
    delivery_enabled: settings.delivery_enabled,
    min_order_amount: settings.min_order_amount,
    hours: row.opening_hours,
    tiers: row.delivery_tiers.map((tier) => ({ upper_km: Number(tier.upper_km), charge: tier.charge })),
  }
}

type ItemRow = Omit<OrderItem, 'variants' | 'addon_groups'> & {
  is_hidden: boolean
  categories: { is_active: boolean } | null
  item_variants: OrderItem['variants']
  item_addon_groups: { addon_groups: (Omit<OrderItem['addon_groups'][number], 'options'> & { addon_options: OrderItem['addon_groups'][number]['options'] }) | null }[]
}

export async function loadItems(branchId: string, itemIds: string[]) {
  const { data, error } = await db
    .from('items')
    .select(
      `id, name_en, name_ur, base_price, is_available, is_hidden,
       categories ( is_active ),
       item_variants ( id, name_en, name_ur, price, is_available ),
       item_addon_groups ( addon_groups ( id, min_select, max_select,
         addon_options ( id, name_en, name_ur, extra_price, is_available ) ) )`,
    )
    .eq('branch_id', branchId)
    .in('id', [...new Set(itemIds)])
  if (error) throw error
  const rows = data as unknown as ItemRow[]
  return new Map(
    rows
      .filter((row) => !row.is_hidden && row.categories?.is_active)
      .map((row): [string, OrderItem] => [
        row.id,
        {
          id: row.id,
          name_en: row.name_en,
          name_ur: row.name_ur,
          base_price: row.base_price,
          is_available: row.is_available,
          variants: row.item_variants,
          addon_groups: row.item_addon_groups.flatMap(({ addon_groups: group }) =>
            group ? [{ id: group.id, min_select: group.min_select, max_select: group.max_select, options: group.addon_options }] : [],
          ),
        },
      ]),
  )
}

async function countOrders(filter: Record<string, string>) {
  let query = db.from('orders').select('id', { count: 'exact', head: true }).neq('status', 'cancelled')
  for (const [column, value] of Object.entries(filter)) query = query.eq(column, value)
  const { count, error } = await query
  if (error) throw error
  return count ?? 0
}

// Usage counts come from non-cancelled orders; the per-phone rules need the phone (checkout, not quotes).
export async function loadDiscount(branchId: string, code: string, phone: string | null) {
  const { data, error } = await db
    .from('discount_codes')
    .select('id, type, value, min_order, starts_at, ends_at, usage_limit, one_per_phone, first_order_only, is_active')
    .eq('branch_id', branchId)
    .eq('code', code)
    .maybeSingle()
  if (error) throw error
  if (!data) return { id: null, code: null, usage: { total: 0, byPhone: 0, phoneHasOrders: false } }
  const usage: DiscountUsage = {
    total: await countOrders({ discount_code_id: data.id }),
    byPhone: phone ? await countOrders({ discount_code_id: data.id, customer_phone: phone }) : 0,
    phoneHasOrders: phone ? (await countOrders({ branch_id: branchId, customer_phone: phone })) > 0 : false,
  }
  return { id: data.id as string, code: data as DiscountCode, usage }
}
