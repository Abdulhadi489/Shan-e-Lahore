import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { invoke, OrderApiError } from '../../checkout/orderApi'
import { supabase } from '../../../lib/supabase'

export type StaffPerson = {
  userId: string
  fullName: string
  role: 'order_staff' | 'super_admin'
  branchId: string | null
  active: boolean
  phone: string | null
  email: string | null
  createdBy: string | null
  passwordStored: boolean
  createdAt: string
  updatedAt: string
  lastSignInAt: string | null
}

export type Rider = {
  id: string
  name: string
  phone: string
  is_active: boolean
  vehicle_type: string | null
  vehicle_number: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

// Errors the admin-users function can answer with; anything else shows the general message.
const knownErrors = [
  'EMAIL_TAKEN',
  'CANNOT_CHANGE_OWN_ACCESS',
  'TWO_SUPER_ADMINS_REQUIRED',
  'ACCOUNT_NOT_FOUND',
  'BRANCH_REQUIRED',
  'TOO_MANY_REQUESTS',
  'INVALID_INPUT',
  'NO_STORED_PASSWORD',
] as const
export const errorKey = (error: unknown) => {
  const code = error instanceof OrderApiError ? error.code : null
  return knownErrors.find((known) => known === code) ?? 'other'
}

// Logins change only through the admin-users Edge Function; the list refreshes after every call.
export function usePeopleCall<T extends object = object>() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: { action: string } & Record<string, unknown>) => invoke<T>('admin-users', body),
    onSettled: () => Promise.all([queryClient.invalidateQueries({ queryKey: ['people-staff'] }), queryClient.invalidateQueries({ queryKey: ['people-riders'] }), queryClient.invalidateQueries({ queryKey: ['branch'] })]),
  })
}

export const useStaffList = () =>
  useQuery({
    queryKey: ['people-staff'],
    queryFn: async () => (await invoke<{ people: StaffPerson[] }>('admin-users', { action: 'list' })).people,
  })

export const useRiderList = () =>
  useQuery({
    queryKey: ['people-riders'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('riders')
        .select('id, name, phone, is_active, vehicle_type, vehicle_number, created_by, created_at, updated_at')
        .is('deleted_at', null)
        .order('name')
      if (error) throw error
      return data as Rider[]
    },
  })
