import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { servedNow } from '../../../supabase/functions/_shared/opening-hours'

// RLS already limits anonymous visitors to active categories and visible items.
// shortcut: one branch, so nothing filters by branch_id; filter here when the site gets a branch picker.
const menuColumns = `
  id, name_en, name_ur, sort_order, is_side, available_from, available_until,
  items (
    id, name_en, name_ur, description_en, description_ur, base_price, image_path, is_available, is_deal, is_featured, sort_order,
    item_variants ( id, name_en, name_ur, price, is_available, sort_order ),
    item_addon_groups (
      sort_order,
      addon_groups ( id, name_en, name_ur, min_select, max_select,
        addon_options ( id, name_en, name_ur, extra_price, is_available, sort_order ) )
    )
  )`

const bySortOrder = (a: { sort_order: number }, b: { sort_order: number }) => a.sort_order - b.sort_order

async function fetchMenu() {
  const { data, error } = await supabase.from('categories').select(menuColumns)
  if (error) throw error
  const now = new Date()
  return data
    .map((category) => {
      // Outside a category's serving hours (Desi Nashta 04:00 to 12:00) its dishes count as unavailable, as on the server.
      const served = servedNow(category.available_from, category.available_until, now)
      return {
      ...category,
      served,
      items: category.items.sort(bySortOrder).map(({ item_variants, item_addon_groups, ...item }) => ({
        ...item,
        is_available: item.is_available && served,
        variants: item_variants.sort(bySortOrder),
        addon_groups: item_addon_groups
          .sort(bySortOrder)
          .flatMap(({ addon_groups: group }) =>
            group ? [{ ...group, options: group.addon_options.sort(bySortOrder) }] : [],
          ),
      })),
      }
    })
    .filter((category) => category.items.length > 0)
    .sort(bySortOrder)
}

export type MenuCategory = Awaited<ReturnType<typeof fetchMenu>>[number]
export type MenuItem = MenuCategory['items'][number]

export function useMenu() {
  // shortcut: serving hours are checked when the menu loads, so a section can open up to 5 minutes late on an
  // open page; the server checks the exact time when the order is placed.
  return useQuery({ queryKey: ['menu'], queryFn: fetchMenu, refetchInterval: 5 * 60_000 })
}
