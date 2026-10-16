import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { PostgrestError } from '@supabase/supabase-js'

// Shared look for every staff screen, built only from the design tokens in index.css.
export const card = 'rounded-card border border-line bg-raised p-4'
export const primaryButton =
  'rounded-control bg-brand px-4 py-2 font-bold text-ink hover:bg-peach disabled:cursor-not-allowed disabled:opacity-60'
export const secondaryButton =
  'flex items-center justify-center gap-2 rounded-control border border-ink-muted bg-raised px-4 py-2 font-bold hover:border-brand-deep disabled:opacity-60'
export const dangerButton = 'rounded-control border border-danger px-4 py-2 font-bold text-danger disabled:opacity-60'
export const inputClass = 'rounded-control border border-ink-muted bg-raised px-3 py-2'
export const labelClass = 'flex flex-col gap-1'
export const headingClass = 'font-heading text-3xl font-bold'
export const sectionHeading = 'font-heading text-2xl font-bold'

// Staff screens write straight to the database; RLS, column grants, triggers and CHECK
// constraints decide what is allowed. This runs one query and refreshes what it changed.
export function useDbMutation(...queryKeys: QueryKey[]) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (change: PromiseLike<{ error: PostgrestError | null }>) => {
      const { error } = await change
      if (error) throw error
    },
    onSettled: () => Promise.all(queryKeys.map((queryKey) => queryClient.invalidateQueries({ queryKey }))),
  })
}

export function SaveError({ error }: { error: Error | null }) {
  const { t } = useTranslation(undefined, { lng: 'en' })
  if (!error) return null
  const code = (error as Partial<PostgrestError>).code
  const key = code === '23505' ? 'duplicate' : code === '23503' ? 'inUse' : 'saveFailed'
  return (
    <p role="alert" className="text-danger">
      {t(`admin.errors.${key}`)}
    </p>
  )
}
