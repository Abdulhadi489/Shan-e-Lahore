import { PageTitle } from '../../app/PageTitle'
import { useParams } from 'react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { Check, PhoneCall } from 'lucide-react'
import { localized } from '../../i18n'
import { clockLabel, localPhone } from '../../lib/format'
import { formatAmount } from '../../lib/money'
import { whatsappLink } from '../../lib/whatsapp'
import { cancelOrder, getOrder, OrderApiError, type TrackedOrder } from '../checkout/orderApi'

const steps = [
  { status: 'pending_confirmation', time: 'placed' },
  { status: 'confirmed', time: 'confirmed' },
  { status: 'preparing', time: 'preparing' },
  { status: 'out_for_delivery', time: 'outForDelivery' },
  { status: 'delivered', time: 'delivered' },
] as const

const finished = (order: TrackedOrder | undefined) => order?.status === 'delivered' || order?.status === 'cancelled'

// A mistyped or cut-off link fails the token check (INVALID_INPUT); retrying can't help, and it is a missing order.
const isNotFound = (error: Error) => error instanceof OrderApiError && (error.code === 'ORDER_NOT_FOUND' || error.code === 'INVALID_INPUT')

export function TrackingPage() {
  const { t, i18n } = useTranslation()
  const lng = i18n.language
  const { token = '' } = useParams()
  // Staff move the order along by phone call, so check for updates until it is delivered or cancelled.
  const order = useQuery({
    queryKey: ['order', token],
    queryFn: () => getOrder(token),
    refetchInterval: (query) => (finished(query.state.data) ? false : 30_000),
    retry: (count, error) => !isNotFound(error) && count < 3,
  })
  const cancel = useMutation({ mutationFn: () => cancelOrder(token), onSettled: () => order.refetch() })
  const price = (amount: number) => t('price', { amount: formatAmount(amount) })

  if (order.isPending) return <p>{t('tracking.loading')}</p>
  if (order.isError) {
    const notFound = isNotFound(order.error)
    const code = order.error instanceof OrderApiError ? order.error.code : 'NETWORK'
    const message = notFound ? 'tracking.notFound' : code === 'RATE_LIMITED' || code === 'NETWORK' ? `errors.${code}` as const : 'errors.SERVER_ERROR'
    return (
      <>
        <title>{`${t('pages.tracking')} · ${t('brand')}`}</title>
        <PageTitle title={t('pages.tracking')} />
        <p role="alert" className="mt-3">{t(message)}</p>
      </>
    )
  }

  const o = order.data
  const isTransfer = o.paymentMethod !== 'cod'
  const currentStep = steps.findIndex((step) => step.status === o.status)

  return (
    <>
      <title>{`${t('tracking.heading', { number: o.orderNumber })} · ${t('brand')}`}</title>
      <PageTitle title={t('tracking.heading', { number: o.orderNumber })} />
      <p className="mt-1 text-ink-muted">{t('tracking.thanks', { name: o.firstName })}</p>

      <div className="mt-6 flex max-w-6xl flex-wrap items-start gap-8">
        <div className="flex min-w-0 flex-[999_1_30rem] flex-col gap-6">
          {o.status === 'cancelled' ? (
            <section role="status" className="rounded-card border-2 border-danger bg-raised p-4">
              <p className="text-lg font-medium text-danger">{t('tracking.cancelled')}</p>
              {o.cancelReason && <p className="mt-1">{t(`tracking.reasons.${o.cancelReason as 'other'}`)}</p>}
              {o.paymentStatus === 'refund_due' && <p className="mt-1">{t('tracking.refundDue')}</p>}
              {o.paymentStatus === 'refunded' && <p className="mt-1">{t('tracking.refunded')}</p>}
            </section>
          ) : (
            <section aria-label={t('tracking.progress')}>
              {/* The five stages in order, joined by a gold line; reached stages are orange. */}
              <ol className="relative grid grid-cols-5 gap-1 rounded-card border border-line bg-raised px-2 py-5 text-center text-xs sm:text-sm">
                <span aria-hidden className="absolute inset-x-[10%] top-9 h-px bg-line" />
                {steps.map((step, index) => {
                  const done = index <= currentStep
                  const time = o.times[step.time]
                  return (
                    <li key={step.status} aria-current={index === currentStep ? 'step' : undefined} className="relative flex flex-col items-center gap-2">
                      <span
                        className={`flex size-9 items-center justify-center rounded-full font-medium ${done ? 'bg-brand text-ink' : 'bg-peach text-ink-muted'}`}
                      >
                        {done ? <Check aria-hidden className="size-4" /> : index + 1}
                      </span>
                      <span className={index === currentStep ? 'font-medium' : done ? '' : 'text-ink-muted'}>
                        {t(`tracking.steps.${step.status}`)}
                        {time && <span className="block text-ink-muted">{clockLabel(lng, time)}</span>}
                      </span>
                    </li>
                  )
                })}
              </ol>
              {o.status === 'pending_confirmation' && (
                <p className="mt-4 rounded-card border border-line bg-raised p-5 font-medium">{t('tracking.pendingNotice', { phone: o.maskedPhone })}</p>
              )}
              {o.status === 'confirmed' && o.estimatedDeliveryMinutes && (
                <p className="mt-4">{t('tracking.estimate', { minutes: o.estimatedDeliveryMinutes })}</p>
              )}
              {o.rider && (
                <p className="mt-4 rounded-card border border-line bg-raised p-5">
                  {t('tracking.rider', { name: o.rider.name })}{' '}
                  <a href={`tel:+${o.rider.phone}`} dir="ltr" className="font-medium underline">{localPhone(o.rider.phone)}</a>
                </p>
              )}
            </section>
          )}

          {o.status !== 'cancelled' && (
            <section className="rounded-card border border-line bg-raised p-5">
              <h2 className="font-heading text-2xl font-semibold">{t('tracking.payment')}</h2>
              {!isTransfer && <p className="mt-2">{t('tracking.payCod', { total: price(o.total) })}</p>}
              {isTransfer && o.paymentStatus === 'unpaid' && (
                <>
                  {o.paymentAccount?.number ? (
                    <p className="mt-2">{t('tracking.payTransfer', { total: price(o.total), method: t(`payment.${o.paymentMethod}`) })}</p>
                  ) : (
                    <p className="mt-2">{t('tracking.payTransferOnCall', { total: price(o.total), method: t(`payment.${o.paymentMethod}`) })}</p>
                  )}
                  {o.paymentAccount?.number && (
                    <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
                      {o.paymentAccount.bankName && (
                        <>
                          <dt className="text-ink-muted">{t('tracking.bank')}</dt>
                          <dd>{o.paymentAccount.bankName}</dd>
                        </>
                      )}
                      <dt className="text-ink-muted">{t('tracking.accountTitle')}</dt>
                      <dd>{o.paymentAccount.title}</dd>
                      <dt className="text-ink-muted">{t('tracking.accountNumber')}</dt>
                      <dd dir="ltr" className="font-medium rtl:text-end">
                        {o.paymentMethod === 'bank_transfer' ? o.paymentAccount.number : localPhone(o.paymentAccount.number)}
                      </dd>
                      {o.paymentAccount.iban && (
                        <>
                          <dt className="text-ink-muted">IBAN</dt>
                          <dd dir="ltr" className="rtl:text-end">{o.paymentAccount.iban}</dd>
                        </>
                      )}
                    </dl>
                  )}
                  {o.whatsappNumber && (
                    <a
                      href={whatsappLink(o.whatsappNumber, t('tracking.screenshotMessage', { number: o.orderNumber }))}
                      className="mt-4 inline-flex min-h-12 items-center rounded-full bg-brand px-6 font-medium text-ink hover:bg-peach"
                    >
                      {t('tracking.sendScreenshot')}
                    </a>
                  )}
                  <p className="mt-3 text-sm text-ink-muted">{t('tracking.transferNote')}</p>
                </>
              )}
              {isTransfer && o.paymentStatus === 'paid' && <p className="mt-2 font-medium text-success">{t('tracking.paid')}</p>}
            </section>
          )}

          <div className="flex flex-wrap gap-3">
            {o.branchPhone && (
              <a href={`tel:+${o.branchPhone}`} className="flex min-h-12 items-center gap-2 rounded-full bg-brand px-6 font-medium text-ink hover:bg-peach">
                <PhoneCall aria-hidden className="size-5" />
                {t('tracking.callRestaurant')}
              </a>
            )}
            {o.status === 'pending_confirmation' && (
              <button
                type="button"
                disabled={cancel.isPending}
                onClick={() => {
                  if (window.confirm(t('tracking.cancelConfirm'))) cancel.mutate()
                }}
                className="min-h-12 rounded-full border border-ink px-6 font-medium disabled:opacity-60 ltr:uppercase ltr:tracking-[0.12em]"
              >
                {t('tracking.cancel')}
              </button>
            )}
          </div>
          {cancel.isError && <p role="alert" className="text-danger">{t('tracking.cancelFailed')}</p>}
        </div>

        <aside className="heritage-dark min-w-0 flex-[1_1_20rem] rounded-card border border-gold p-6">
          <h2 className="font-heading text-2xl font-semibold">{t('checkout.summary')}</h2>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {o.items.map((item, index) => (
              <li key={index} className="flex justify-between gap-3">
                <span>
                  {item.quantity} × {localized(lng, item.name_en, item.name_ur)}
                  {item.variant_en && ` (${localized(lng, item.variant_en, item.variant_ur ?? '')})`}
                  {item.addons.length > 0 && (
                    <span className="block text-ink-muted">{item.addons.map((a) => localized(lng, a.name_en, a.name_ur)).join(', ')}</span>
                  )}
                </span>
                <span className="shrink-0">{price(item.lineTotal)}</span>
              </li>
            ))}
          </ul>
          <dl className="mt-3 flex flex-col gap-1 border-t border-line pt-3">
            <div className="flex justify-between"><dt>{t('cart.subtotal')}</dt><dd>{price(o.subtotal)}</dd></div>
            <div className="flex justify-between"><dt>{t('checkout.delivery')}</dt><dd>{price(o.deliveryCharge)}</dd></div>
            {o.discountAmount > 0 && (
              <div className="flex justify-between text-success"><dt>{t('checkout.discount')}</dt><dd>− {price(o.discountAmount)}</dd></div>
            )}
            <div className="flex justify-between text-lg font-medium"><dt>{t('checkout.total')}</dt><dd>{price(o.total)}</dd></div>
          </dl>
        </aside>
      </div>
    </>
  )
}
