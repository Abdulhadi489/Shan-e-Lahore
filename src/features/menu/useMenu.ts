import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

// RLS already limits anonymous visitors to active categories and visible items.
// shortcut: one branch, so nothing filters by branch_id; filter here when the site gets a branch picker.
const menuColumns = `
  id, name_en, name_ur, sort_order, is_side,
  items (
    id, name_en, name_ur, description_en, description_ur, base_price, is_available, is_deal, is_featured, sort_order,
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
  return data
    .map((category) => ({
      ...category,
      items: category.items.sort(bySortOrder).map(({ item_variants, item_addon_groups, ...item }) => ({
        ...item,
        variants: item_variants.sort(bySortOrder),
        addon_groups: item_addon_groups
          .sort(bySortOrder)
          .flatMap(({ addon_groups: group }) =>
            group ? [{ ...group, options: group.addon_options.sort(bySortOrder) }] : [],
          ),
      })),
    }))
    .filter((category) => category.items.length > 0)
    .sort(bySortOrder)
}

export type MenuCategory = Awaited<ReturnType<typeof fetchMenu>>[number]
export type MenuItem = MenuCategory['items'][number]

export function useMenu() {
  return useQuery({ queryKey: ['menu'], queryFn: fetchMenu })
}
