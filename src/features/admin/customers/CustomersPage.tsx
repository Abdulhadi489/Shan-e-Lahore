import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { phoneLabel } from '../../../lib/format'
import { formatAmount } from '../../../lib/money'
import { supabase } from '../../../lib/supabase'
import { CustomerOrders } from './CustomerOrders'
import { card, dangerButton, headingClass, inputClass, primaryButton, SaveError, sectionHeading, secondaryButton, useDbMutation } from '../ui'

const dateLabel = (iso: string) => new Date(iso).toLocaleDateString('en-PK', { dateStyle: 'medium', timeZone: 'Asia/Karachi' })

// Typed numbers match however they were written: 0300 123, 300123 or 92300123.
function phoneDigits(search: string) {
  const digits = search.replace(/\D/g, '')
  return digits.length >= 3 && digits.length === search.replace(/[\s+-]/g, '').length ? digits.replace(/^(92|0)/, '') : null
}

const PAGE = 20
// % and _ typed in the search box are plain characters, not wildcards.
const literal = (text: string) => text.replace(/[\\%_]/g, '\\$&')

export function CustomersPage() {
  const { t } = useTranslation(undefined, { lng: 'en' })
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(0)
  const customers = useQuery({
    queryKey: ['admin-customers', search, page],
    queryFn: async () => {
      let query = supabase
        .from('customer_summaries')
        .select('id, phone, name, is_blocked, order_count, cancelled_count, delivered_spend, last_order_at', { count: 'exact' })
        .order('last_order_at', { ascending: false, nullsFirst: false })
        .range(page * PAGE, page * PAGE + PAGE - 1)
      const digits = phoneDigits(search)
      if (digits) query = query.like('phone', `%${digits}%`)
      else if (search) query = query.ilike('name', `%${literal(search)}%`)
      const { data, error, count } = await query
      if (error) throw error
      return { rows: data, count: count ?? data.length }
    },
    placeholderData: keepPreviousData,
  })

  return (
    <>
      <title>{`${t('admin.customers.heading')} · ${t('brand')}`}</title>
      <h1 className={headingClass}>{t('admin.customers.heading')}</h1>
      <p className="mt-1 text-ink-muted">{t('admin.customers.help')}</p>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          setSearch(String(new FormData(event.currentTarget).get('search') ?? '').trim())
          setPage(0)
        }}
        className="mt-3 flex flex-wrap items-end gap-2"
      >
        <label className="flex flex-col gap-1">
          {t('admin.customers.search')}
          <input name="search" type="search" maxLength={60} className={inputClass} />
        </label>
        <button type="submit" className={secondaryButton}>
          {t('admin.customers.searchButton')}
        </button>
      </form>

      {customers.isPending && <p className="mt-4">{t('admin.loading')}</p>}
      {customers.isError && <p role="alert" className="mt-4">{t('admin.errors.loadFailed')}</p>}
      {customers.data?.rows.length === 0 && <p className="mt-4 text-ink-muted">{t('admin.customers.empty')}</p>}
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {customers.data?.rows.map((customer) => (
          <li key={customer.id}>
            <Link to={customer.id ?? ''} className={`${card} flex flex-col gap-1 hover:border-brand-deep`}>
              <span className="flex flex-wrap items-baseline gap-2">
                <span className="font-bold">{customer.name}</span>
                <span>{phoneLabel(customer.phone ?? '')}</span>
                {customer.is_blocked && <span className="font-bold text-danger">{t('admin.customers.blocked')}</span>}
              </span>
              <span className="text-sm text-ink-muted">
                {[
                  t('admin.customers.orders', { count: customer.order_count ?? 0 }),
                  customer.cancelled_count ? t('admin.customers.cancelled', { count: customer.cancelled_count }) : null,
                  t('admin.customers.spent', { amount: t('price', { amount: formatAmount(customer.delivered_spend ?? 0) }) }),
                  customer.last_order_at ? t('admin.customers.lastOrder', { date: dateLabel(customer.last_order_at) }) : null,
                ]
                  .filter(Boolean)
                  .join(' · ')}
              </span>
            </Link>
          </li>
        ))}
      </ul>
      {customers.data && customers.data.count > PAGE && (
        <Pager page={page} count={customers.data.count} size={PAGE} onPage={setPage} />
      )}
    </>
  )
}

// Previous and next, with the range shown, so one request never pulls the whole table.
function Pager({ page, count, size, onPage }: { page: number; count: number; size: number; onPage: (page: number) => void }) {
  const { t } = useTranslation(undefined, { lng: 'en' })
  const last = Math.ceil(count / size) - 1
  return (
    <nav aria-label={t('admin.customers.pages')} className="mt-3 flex flex-wrap items-center gap-3">
      <button type="button" disabled={page === 0} onClick={() => onPage(page - 1)} className={`${secondaryButton} min-h-11`}>
        {t('admin.customers.previous')}
      </button>
      <span className="text-sm text-ink-muted">{t('admin.customers.pageOf', { page: page + 1, pages: last + 1, count })}</span>
      <button type="button" disabled={page >= last} onClick={() => onPage(page + 1)} className={`${secondaryButton} min-h-11`}>
        {t('admin.customers.next')}
      </button>
    </nav>
  )
}

export function CustomerPage() {
  const { t } = useTranslation(undefined, { lng: 'en' })
  const { id = '' } = useParams()
  const key = ['admin-customer', id]
  const data = useQuery({
    queryKey: key,
    queryFn: async () => {
      const [customer, totals, used] = await Promise.all([
        supabase.from('customer_summaries').select('phone, name, is_blocked, order_count, delivered_spend').eq('id', id).single(),
        // The totals view comes with a later migration: without it the page just leaves those figures out.
        supabase.from('customer_order_totals').select('first_order_at, last_order_at, spent_total').eq('customer_id', id).maybeSingle(),
        // Names and addresses the customer used, from the most recent orders.
        supabase.from('orders').select('customer_name, address_text').eq('customer_id', id).order('created_at', { ascending: false }).limit(100),
      ])
      if (customer.error) throw customer.error
      const names = [...new Set((used.data ?? []).map((order) => order.customer_name))]
      const addresses = [...new Set((used.data ?? []).map((order) => order.address_text))]
      return { customer: customer.data, totals: totals.data, names, addresses }
    },
  })
  const save = useDbMutation(key, ['admin-customers'])

  if (data.isPending) return <p>{t('admin.loading')}</p>
  if (data.isError) return <p role="alert">{t('admin.errors.loadFailed')}</p>
  const { customer, totals, names, addresses } = data.data
  const phone = phoneLabel(customer.phone ?? '')

  return (
    <>
      <title>{`${customer.name} · ${t('brand')}`}</title>
      <Link to="/admin/customers" className="flex items-center gap-1 text-brand-deep underline">
        <ArrowLeft aria-hidden className="size-4" />
        {t('admin.customers.back')}
      </Link>
      <h1 className={`${headingClass} mt-3`}>{customer.name}</h1>
      <p className="mt-1">
        <a href={`tel:+${customer.phone}`} className="font-bold underline">
          {phone}
        </a>{' '}
        · {t('admin.customers.orders', { count: customer.order_count ?? 0 })} ·{' '}
        {t('admin.customers.spent', { amount: t('price', { amount: formatAmount(customer.delivered_spend ?? 0) }) })}
      </p>
      {totals && (
        <p className="mt-1 text-sm text-ink-muted">
          {[
            totals.first_order_at ? t('admin.customers.firstOrder', { date: dateLabel(totals.first_order_at) }) : null,
            totals.last_order_at ? t('admin.customers.lastOrder', { date: dateLabel(totals.last_order_at) }) : null,
            t('admin.customers.spentTotal', { amount: t('price', { amount: formatAmount(totals.spent_total ?? 0) }) }),
          ]
            .filter(Boolean)
            .join(' · ')}
        </p>
      )}

      <section className={`${card} mt-4 flex flex-wrap items-center gap-3`}>
        {customer.is_blocked && <p className="font-bold text-danger">{t('admin.customers.blockedHelp')}</p>}
        <button
          type="button"
          disabled={save.isPending}
          onClick={() => {
            if (!customer.is_blocked && !window.confirm(t('admin.customers.blockConfirm', { phone }))) return
            save.mutate(supabase.from('customers').update({ is_blocked: !customer.is_blocked }).eq('id', id))
          }}
          className={customer.is_blocked ? primaryButton : dangerButton}
        >
          {t(customer.is_blocked ? 'admin.customers.unblock' : 'admin.customers.block')}
        </button>
        <SaveError error={save.error} />
      </section>

      {(names.length > 1 || addresses.length > 0) && (
        <section className={`${card} mt-4`}>
          {names.length > 1 && (
            <p>
              <span className="font-bold">{t('admin.customers.namesUsed')}:</span> {names.join(', ')}
            </p>
          )}
          {addresses.length > 0 && (
            <>
              <h2 className={`${sectionHeading} ${names.length > 1 ? 'mt-3' : ''}`}>{t('admin.customers.addresses')}</h2>
              <ul className="mt-1 flex flex-col gap-1 text-sm">
                {addresses.map((address) => (
                  <li key={address} className="whitespace-pre-line">{address}</li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      <CustomerOrders customerId={id} />
    </>
  )
}
