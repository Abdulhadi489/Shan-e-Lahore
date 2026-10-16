import { useState } from 'react'
import { Link, useLocation, useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, MapPin, MessageCircle, Pencil, Phone, Printer } from 'lucide-react'
import i18n from '../../../i18n'
import { clockLabel, phoneLabel } from '../../../lib/format'
import { formatAmount } from '../../../lib/money'
import { supabase } from '../../../lib/supabase'
import { customerMessage, googleMapsLink, riderMessage, whatsappLink } from '../../../lib/whatsapp'
import { Constants, type Enums, type TablesUpdate } from '../../../types/database'
import { useStaff } from '../StaffLayout'
import { card, dangerButton, inputClass, primaryButton, secondaryButton, useDbMutation } from '../ui'
import type { EditResult } from './OrderEditor'

// wa.me and Google Maps open in a new tab so this page, and its new-order alarm, stays open.
const newTab = { target: '_blank', rel: 'noopener noreferrer' }

export function OrderPage() {
  const { t } = useTranslation(undefined, { lng: 'en' })
  const { id } = useParams()
  const edited = (useLocation().state as { edited?: EditResult } | null)?.edited
  const { branch, orders } = useStaff()
  const [transactionId, setTransactionId] = useState('')
  const [cancelReason, setCancelReason] = useState<Enums<'cancel_reason'> | ''>('')
  // Every rule (allowed steps, paid before confirm, rider before delivery) is checked by the database trigger.
  const save = useDbMutation(['live-orders', branch.id])

  const o = orders.data?.find((order) => order.id === id)
  if (orders.isPending) return <p>{t('admin.loading')}</p>
  if (!o) {
    return (
      <>
        <p role="alert">{t('admin.orders.notFound')}</p>
        <Link to="/admin" className="mt-4 inline-block text-brand-deep underline">
          {t('admin.orders.back')}
        </Link>
      </>
    )
  }

  const update = (change: TablesUpdate<'orders'>) => save.mutate(supabase.from('orders').update(change).eq('id', o.id))
  const price = (amount: number) => t('price', { amount: formatAmount(amount) })
  const number = `${branch.order_prefix}-${o.order_number}`
  const isTransfer = o.payment_method !== 'cod'
  const isOpen = o.status !== 'delivered' && o.status !== 'cancelled'
  const missedCalls = o.call_attempts[0]?.count ?? 0
  const riders = branch.riders.filter((rider) => rider.is_active || rider.id === o.rider_id)
  const settings = branch.branch_settings
  const customerText =
    settings &&
    customerMessage(i18n.getFixedT(o.language), o, number, `${window.location.origin}/track/${o.tracking_token}`, settings)

  return (
    <>
      <title>{`${t('admin.orders.heading', { number })} · ${t('brand')}`}</title>
      <Link to="/admin" className="flex items-center gap-1 text-brand-deep underline">
        <ArrowLeft aria-hidden className="size-4" />
        {t('admin.orders.back')}
      </Link>
      <h1 className="mt-3 font-heading text-3xl font-bold">{t('admin.orders.heading', { number })}</h1>
      <p className={`mt-1 font-bold ${o.status === 'cancelled' ? 'text-danger' : ''}`}>
        {t(`admin.orders.status.${o.status}`)}
        {o.cancel_reason && `: ${t(`admin.orders.reasons.${o.cancel_reason}`)}`}
        <span className="ms-2 font-normal text-ink-muted">{t('admin.orders.placedAt', { time: clockLabel('en', o.created_at) })}</span>
      </p>

      {edited && (
        <div role="status" className="mt-3 rounded-card bg-peach p-3 font-bold">
          <p>{t('admin.orders.edited', { total: price(edited.total) })}</p>
          {edited.discountRemoved && <p>{t('admin.orders.discountRemoved')}</p>}
        </div>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_24rem]">
        <div className="flex flex-col gap-4">
          <section className={card}>
            <h2 className="font-heading text-2xl font-bold">{t('admin.orders.customer')}</h2>
            <p className="mt-1 text-lg">{o.customer_name}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <a href={`tel:+${o.customer_phone}`} className={secondaryButton}>
                <Phone aria-hidden className="size-5" />
                {phoneLabel(o.customer_phone)}
              </a>
              <a href={whatsappLink(o.customer_phone, customerText ?? '')} {...newTab} className={secondaryButton}>
                <MessageCircle aria-hidden className="size-5" />
                {t('admin.orders.whatsappCustomer')}
              </a>
            </div>
          </section>

          <section className={card}>
            <h2 className="font-heading text-2xl font-bold">{t('admin.orders.address')}</h2>
            <p className="mt-1 whitespace-pre-line">{o.address_text}</p>
            {o.landmark && <p>{t('admin.orders.landmark', { landmark: o.landmark })}</p>}
            <p className="text-ink-muted">{t('admin.orders.distance', { km: o.distance_km })}</p>
            <a href={googleMapsLink(o.lat, o.lng)} {...newTab} className={`mt-3 w-fit ${secondaryButton}`}>
              <MapPin aria-hidden className="size-5" />
              {t('admin.orders.openMap')}
            </a>
            {o.notes && (
              <>
                <h3 className="mt-4 font-bold">{t('admin.orders.notes')}</h3>
                <p className="whitespace-pre-line">{o.notes}</p>
              </>
            )}
          </section>

          <section className={card}>
            <h2 className="font-heading text-2xl font-bold">{t('admin.orders.items')}</h2>
            <ul className="mt-2 flex flex-col gap-2">
              {o.order_items.map((item) => (
                <li key={item.id} className="flex justify-between gap-3">
                  <span>
                    <span className="font-bold">{item.quantity} ×</span> {item.name_en}
                    {item.variant_name_en && ` (${item.variant_name_en})`}
                    {item.order_item_addons.length > 0 && (
                      <span className="block text-sm text-ink-muted">
                        {item.order_item_addons.map((addon) => addon.name_en).join(', ')}
                      </span>
                    )}
                  </span>
                  <span className="shrink-0">{price(item.line_total)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 flex flex-col gap-1 border-t border-line pt-3">
              <div className="flex justify-between"><dt>{t('cart.subtotal')}</dt><dd>{price(o.subtotal)}</dd></div>
              <div className="flex justify-between"><dt>{t('checkout.delivery')}</dt><dd>{price(o.delivery_charge)}</dd></div>
              {o.discount_amount > 0 && (
                <div className="flex justify-between"><dt>{t('checkout.discount')}</dt><dd>− {price(o.discount_amount)}</dd></div>
              )}
              <div className="flex justify-between text-lg font-bold"><dt>{t('checkout.total')}</dt><dd>{price(o.total)}</dd></div>
            </dl>
            <p className="mt-3 border-t border-line pt-3">
              <span className="font-bold">{t(`payment.${o.payment_method}`)}</span> ·{' '}
              {t(`admin.orders.paymentStatus.${o.payment_status}`)}
            </p>
            {o.transaction_id && o.payment_verified_at && (
              <p className="text-sm text-ink-muted">
                {t('admin.orders.verifiedAt', { time: clockLabel('en', o.payment_verified_at), id: o.transaction_id })}
              </p>
            )}
          </section>
        </div>

        <div className="flex flex-col gap-4 lg:sticky lg:top-4 lg:self-start">
          {(isOpen || o.payment_status === 'refund_due') && (
            <section className={`${card} flex flex-col gap-3`}>
              {o.status === 'pending_confirmation' && (
                <>
                  <Link to="edit" className={secondaryButton}>
                    <Pencil aria-hidden className="size-5" />
                    {t('admin.orders.edit')}
                  </Link>
                  <p>{t('admin.orders.missedCallHelp', { count: missedCalls })}</p>
                  <button
                    type="button"
                    disabled={save.isPending}
                    onClick={() => {
                      if (missedCalls < 2 || window.confirm(t('admin.orders.missedCallCancels'))) {
                        save.mutate(supabase.from('call_attempts').insert({ order_id: o.id }))
                      }
                    }}
                    className={secondaryButton}
                  >
                    {t('admin.orders.missedCall')}
                  </button>
                  {isTransfer && o.payment_status === 'unpaid' && (
                    <form
                      onSubmit={(event) => {
                        event.preventDefault()
                        update({ payment_status: 'paid', transaction_id: transactionId.trim() })
                      }}
                      className="flex flex-col gap-2 border-t border-line pt-3"
                    >
                      <label className="flex flex-col gap-1">
                        {t('admin.orders.transactionId')}
                        <input
                          value={transactionId}
                          onChange={(event) => setTransactionId(event.target.value)}
                          maxLength={60}
                          autoComplete="off"
                          className={inputClass}
                        />
                      </label>
                      <p className="text-sm text-ink-muted">{t('admin.orders.paidHelp')}</p>
                      <button type="submit" disabled={save.isPending || !transactionId.trim()} className={secondaryButton}>
                        {t('admin.orders.markPaid')}
                      </button>
                    </form>
                  )}
                  <button
                    type="button"
                    disabled={save.isPending || (isTransfer && o.payment_status !== 'paid')}
                    onClick={() => update({ status: 'confirmed' })}
                    className={primaryButton}
                  >
                    {t('admin.orders.confirm')}
                  </button>
                  {isTransfer && o.payment_status !== 'paid' && (
                    <p className="text-sm text-ink-muted">{t('admin.orders.confirmNeedsPayment')}</p>
                  )}
                </>
              )}

              {o.status === 'confirmed' && (
                <button type="button" disabled={save.isPending} onClick={() => update({ status: 'preparing' })} className={primaryButton}>
                  {t('admin.orders.startPreparing')}
                </button>
              )}

              {(o.status === 'confirmed' || o.status === 'preparing') && (
                <label className="flex flex-col gap-1">
                  {t('admin.orders.rider')}
                  <select
                    value={o.rider_id ?? ''}
                    disabled={save.isPending}
                    onChange={(event) => update({ rider_id: event.target.value })}
                    className={inputClass}
                  >
                    <option value="" disabled>
                      {t('admin.orders.chooseRider')}
                    </option>
                    {riders.map((rider) => (
                      <option key={rider.id} value={rider.id}>
                        {rider.name}
                      </option>
                    ))}
                  </select>
                  {riders.length === 0 && <span className="text-sm text-ink-muted">{t('admin.orders.noRiders')}</span>}
                </label>
              )}

              {o.status === 'preparing' && (
                <>
                  <button
                    type="button"
                    disabled={save.isPending || !o.rider_id}
                    onClick={() => update({ status: 'out_for_delivery' })}
                    className={primaryButton}
                  >
                    {t('admin.orders.outForDelivery')}
                  </button>
                  {!o.rider_id && <p className="text-sm text-ink-muted">{t('admin.orders.needsRider')}</p>}
                </>
              )}

              {o.status === 'out_for_delivery' && (
                <button type="button" disabled={save.isPending} onClick={() => update({ status: 'delivered' })} className={primaryButton}>
                  {t('admin.orders.delivered')}
                </button>
              )}

              {o.riders && isOpen && (
                <a href={whatsappLink(o.riders.phone, riderMessage(t, o, number))} {...newTab} className={secondaryButton}>
                  <MessageCircle aria-hidden className="size-5" />
                  {t('admin.orders.whatsappRider')}
                </a>
              )}

              {(o.status === 'confirmed' || o.status === 'preparing') && (
                <Link to="ticket" className={secondaryButton}>
                  <Printer aria-hidden className="size-5" />
                  {t('admin.orders.ticket')}
                </Link>
              )}

              {o.payment_status === 'refund_due' && (
                <button
                  type="button"
                  disabled={save.isPending}
                  onClick={() => {
                    if (window.confirm(t('admin.orders.refundedConfirm', { amount: price(o.total) }))) {
                      update({ payment_status: 'refunded' })
                    }
                  }}
                  className={primaryButton}
                >
                  {t('admin.orders.markRefunded')}
                </button>
              )}

              {save.isError && (
                <p role="alert" className="text-danger">
                  {t('admin.orders.saveFailed')}
                </p>
              )}
            </section>
          )}

          {isOpen && o.status !== 'out_for_delivery' && (
            <details className={card}>
              <summary className="cursor-pointer font-bold text-danger">{t('admin.orders.cancel')}</summary>
              <form
                onSubmit={(event) => {
                  event.preventDefault()
                  if (cancelReason && window.confirm(t('admin.orders.cancelConfirm', { number }))) {
                    update({ status: 'cancelled', cancel_reason: cancelReason })
                  }
                }}
                className="mt-3 flex flex-col gap-2"
              >
                <label className="flex flex-col gap-1">
                  {t('admin.orders.cancelReason')}
                  <select
                    required
                    value={cancelReason}
                    onChange={(event) => setCancelReason(event.target.value as Enums<'cancel_reason'>)}
                    className={inputClass}
                  >
                    <option value="" disabled>
                      {t('admin.orders.chooseReason')}
                    </option>
                    {Constants.public.Enums.cancel_reason.map((reason) => (
                      <option key={reason} value={reason}>
                        {t(`admin.orders.reasons.${reason}`)}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="submit"
                  disabled={save.isPending}
                  className={dangerButton}
                >
                  {t('admin.orders.cancel')}
                </button>
              </form>
            </details>
          )}
        </div>
      </div>
    </>
  )
}
