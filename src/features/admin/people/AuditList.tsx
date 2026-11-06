import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../../lib/supabase'
import { card, sectionHeading } from '../ui'
import { useRiderList, useStaffList } from './people'

type Json = Record<string, unknown> | null

// Field names that differ between the old and new row (never their values, so nothing sensitive is shown).
const changedFields = (before: Json, after: Json) =>
  Object.keys({ ...before, ...after }).filter((key) => key !== 'updated_at' && JSON.stringify(before?.[key]) !== JSON.stringify(after?.[key]))

// Read-only history of staff, rider and login changes. The table has no update or delete rights for anyone through the API.
export function AuditList({ rowId }: { rowId?: string }) {
  const { t } = useTranslation()
  const staff = useStaffList()
  const riders = useRiderList()
  const log = useQuery({
    queryKey: ['people-audit', rowId ?? 'all'],
    queryFn: async () => {
      let query = supabase
        .from('audit_log')
        .select('id, table_name, row_id, action, old_values, new_values, changed_by, created_at')
        .in('table_name', ['profiles', 'riders', 'auth.users'])
        .order('created_at', { ascending: false })
        .limit(rowId ? 30 : 50)
      if (rowId) query = query.eq('row_id', rowId)
      const { data, error } = await query
      if (error) throw error
      return data
    },
  })
  const names = new Map([
    ...(staff.data ?? []).map((person) => [person.userId, person.fullName] as const),
    ...(riders.data ?? []).map((rider) => [rider.id, rider.name] as const),
  ])
  const who = (id: string | null) => (id ? (names.get(id) ?? t('admin.people.someone')) : t('admin.people.system'))

  return (
    <section className={card}>
      <h2 className={sectionHeading}>{t('admin.people.historyHeading')}</h2>
      {log.isError && <p role="alert" className="text-danger">{t('admin.people.errors.other')}</p>}
      {log.data?.length === 0 && <p className="text-ink-muted">{t('admin.people.historyEmpty')}</p>}
      <ul className="mt-2 flex flex-col divide-y divide-line">
        {log.data?.map((entry) => {
          const event = (entry.new_values as { event?: string } | null)?.event
          const detail = event
            ? t(`admin.people.events.${event}`, { defaultValue: event })
            : changedFields(entry.old_values as Json, entry.new_values as Json).join(', ')
          return (
            <li key={entry.id} className="py-2">
              <p className="font-medium">
                {t(`admin.people.actions.${entry.action as 'insert' | 'update' | 'delete'}`)} · {entry.table_name === 'riders' ? t('admin.people.rider') : t('admin.people.staff')}: {who(entry.row_id)}
              </p>
              <p className="text-sm text-ink-muted">
                {t('admin.people.by', { name: who(entry.changed_by) })} · {new Date(entry.created_at).toLocaleString('en-GB', { timeZone: 'Asia/Karachi' })}
                {detail && ` · ${detail}`}
              </p>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
