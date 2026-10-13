// Shared by the website (to show prices and enforce choices) and the Edge Functions (to charge).
// No imports, so both Vite and Deno can load it. Money is integer rupees.

export type PricedItem = {
  base_price: number
  is_available: boolean
  variants: { id: string; price: number; is_available: boolean }[]
  addon_groups: {
    id: string
    min_select: number
    max_select: number
    options: { id: string; extra_price: number; is_available: boolean }[]
  }[]
}

export type LineChoice = { variantId: string | null; addonOptionIds: string[] }

export type LineError =
  | 'ITEM_UNAVAILABLE'
  | 'VARIANT_INVALID'
  | 'VARIANT_UNAVAILABLE'
  | 'ADDON_INVALID'
  | 'ADDON_UNAVAILABLE'
  | 'ADDON_COUNT'

export const MAX_QUANTITY = 50

// The price of one unit with these choices, or the first reason the choices aren't allowed.
export function unitPrice(item: PricedItem, choice: LineChoice): { price: number } | { error: LineError } {
  if (!item.is_available) return { error: 'ITEM_UNAVAILABLE' }

  let price = item.base_price
  if (item.variants.length > 0) {
    const variant = item.variants.find((v) => v.id === choice.variantId)
    if (!variant) return { error: 'VARIANT_INVALID' }
    if (!variant.is_available) return { error: 'VARIANT_UNAVAILABLE' }
    price = variant.price
  } else if (choice.variantId !== null) {
    return { error: 'VARIANT_INVALID' }
  }

  const chosen = new Set(choice.addonOptionIds)
  if (chosen.size !== choice.addonOptionIds.length) return { error: 'ADDON_INVALID' }

  let matched = 0
  for (const group of item.addon_groups) {
    const picked = group.options.filter((o) => chosen.has(o.id))
    if (picked.length < group.min_select || picked.length > group.max_select) return { error: 'ADDON_COUNT' }
    if (picked.some((o) => !o.is_available)) return { error: 'ADDON_UNAVAILABLE' }
    price += picked.reduce((sum, o) => sum + o.extra_price, 0)
    matched += picked.length
  }
  // An option that belongs to no group on this item was sent.
  if (matched !== chosen.size) return { error: 'ADDON_INVALID' }

  return { price }
}
