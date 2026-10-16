import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ArrowLeft } from 'lucide-react'
import { phoneLabel } from '../../../lib/format'
import { formatAmount } from '../../../lib/money'
import { supabase } from '../../../lib/supabase'
import { card, dangerButton, headingClass, inputClass, primaryButton, SaveError, sectionHeading, secondaryButton, useDbMutation } from '../ui'

const dateLabel = (iso: string) => new Date(iso).toLocaleDateString('en-PK', { dateStyle: 'medium', timeZone: 'Asia/Karachi' })

// Typed numbers match however they were written: 0300 123, 300123 or 92300123.
function phoneDigits(search: string) {
  const digits = search.replace(/\D/g, '')
  return digits.length >= 3 && digits.length === search.replace(/[\s+-]/g, '').length ? digits.replace(/^(92|0)/, '') : null
}

export function CustomersPage() {
  const { t } = useTranslation(undefined, { lng: 'en' })
  const [search, setSearch] = useState('')
  const customers = useQuery({
    queryKey: ['admin-customers', search],
    queryFn: async () => {
      let query = supabase
        .from('customer_summaries')
        .select('id, phone, name, is_blocked, order_count, cancelled_count, delivered_spend, last_order_at')
        .order('last_order_at', { ascending: false, nullsFirst: false })
        .limit(100)
      const digits = phoneDigits(search)
      if (digits) query = query.like('phone', `%${digits}%`)
      else if (search) query = query.ilike('name', `%${search}%`)
      const { data, error } = await query
      if (error) throw error
      return data
    },
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
      {customers.data?.length === 0 && <p className="mt-4 text-ink-muted">{t('admin.customers.empty')}</p>}
      <ul className="mt-4 grid gap-3 sm:grid-cols-2">
        {customers.data?.map((customer) => (
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
      {customers.data?.length === 100 && <p className="mt-3 text-sm text-ink-muted">{t('admin.customers.showing')}</p>}
    </>
  )
}

export function CustomerPage() {
  const { t } = useTranslation(undefined, { lng: 'en' })
  const { id = '' } = useParams()
  const key = ['admin-customer', id]
  const data = useQuery({
    queryKey: key,
    queryFn: async () => {
      const [customer, orders] = await Promise.all([
        supabase.from('customer_summaries').select('phone, name, is_blocked, order_count, delivered_spend').eq('id', id).single(),
        supabase
          .from('orders')
          .select('id, order_number, created_at, status, payment_method, total, branches ( order_prefix )')
          .eq('customer_id', id)
          .order('created_at', { ascending: false }),
      ])
      if (customer.error) throw customer.error
      if (orders.error) throw orders.error
      return { customer: customer.data, orders: orders.data }
    },
  })
  const save = useDbMutation(key, ['admin-customers'])

  if (data.isPending) return <p>{t('admin.loading')}</p>
  if (data.isError) return <p role="alert">{t('admin.errors.loadFailed')}</p>
  const { customer, orders } = data.data
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

      <section className={`${card} mt-4`}>
        <h2 className={sectionHeading}>{t('admin.customers.history')}</h2>
        {orders.length === 0 && <p className="mt-2 text-ink-muted">{t('admin.customers.noOrders')}</p>}
        <ul className="mt-2 flex flex-col divide-y divide-line">
          {orders.map((order) => (
            <li key={order.id} className="flex flex-wrap justify-between gap-2 py-2">
              <span>
                <span className="font-bold">
                  {order.branches?.order_prefix}-{order.order_number}
                </span>{' '}
                · {dateLabel(order.created_at)} · {t(`admin.orders.status.${order.status}`)} · {t(`payment.${order.payment_method}`)}
              </span>
              <span className="font-bold">{t('price', { amount: formatAmount(order.total) })}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  )
}
