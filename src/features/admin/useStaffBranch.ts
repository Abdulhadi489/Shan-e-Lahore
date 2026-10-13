import { useQuery } from '@tanstack/react-query'
import type { QueryData } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'

const staffBranchQuery = (branchId: string | null) => {
  const query = supabase.from('branches').select(
    `id, order_prefix,
     branch_settings ( estimated_delivery_minutes, bank_name, bank_account_title, bank_account_number, bank_iban,
       jazzcash_account_title, jazzcash_number, easypaisa_account_title, easypaisa_number ),
     riders ( id, name, phone, is_active )`,
  )
  // shortcut: a Super Admin has no branch and works on the only active one; add a branch picker for a second branch.
  return (branchId ? query.eq('id', branchId) : query.eq('is_active', true)).limit(1).single()
}

export type StaffBranch = QueryData<ReturnType<typeof staffBranchQuery>>

// Order Staff work on their own branch.
export function useStaffBranch(branchId: string | null | undefined) {
  return useQuery({
    queryKey: ['staff-branch', branchId],
    queryFn: async () => {
      const { data, error } = await staffBranchQuery(branchId ?? null)
      if (error) throw error
      return data
    },
    enabled: branchId !== undefined,
  })
}
