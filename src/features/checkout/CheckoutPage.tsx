import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { ParseKeys } from 'i18next'
import type { z } from 'zod'
import { localized } from '../../i18n'
import { formatAmount } from '../../lib/money'
import { customerDetails, discountCode } from '../../../supabase/functions/_shared/schemas'
import { unitPrice } from '../../../supabase/functions/_shared/pricing'
import { useBranch } from '../../app/useBranch'
import { Turnstile } from '../../components/Turnstile'
import { useMenu } from '../menu/useMenu'
import { clearCart, useCart } from './cart'
import { LocationPicker, type Pin } from './LocationPicker'
import { getQuote, OrderApiError, placeOrder } from './orderApi'

type Details = z.input<typeof customerDetails>
type DetailsOutput = z.output<typeof customerDetails>

const paymentMethods = ['cod', 'bank_transfer', 'jazzcash', 'easypaisa'] as const

// Every code the order functions can return has a sentence; anything else falls back to a generic one.
const knownErrors = new Set([
  'BRANCH_CLOSED', 'DELIVERY_PAUSED', 'OUTSIDE_DELIVERY_AREA', 'ITEM_UNAVAILABLE_OR_CHANGED', 'BELOW_MINIMUM',
  'DISCOUNT_INVALID', 'DISCOUNT_NOT_STARTED', 'DISCOUNT_EXPIRED', 'DISCOUNT_MIN_ORDER', 'DISCOUNT_USED_UP',
  'DISCOUNT_ALREADY_USED', 'DISCOUNT_FIRST_ORDER_ONLY', 'BOT_CHECK_FAILED', 'RATE_LIMITED', 'NUMBER_BLOCKED',
  'INVALID_INPUT', 'NETWORK',
])
const errorKey = (code: string) => `errors.${knownErrors.has(code) ? code : 'SERVER_ERROR'}` as ParseKeys

const inputClass = 'w-full rounded-control border border-ink-muted bg-raised px-3 py-2'

export function CheckoutPage() {
  const { t, i18n } = useTranslation()
  const lng = i18n.language
  const navigate = useNavigate()
  const lines = useCart()
  const menu = useMenu()
  const branch = useBranch()
  const [pin, setPin] = useState<Pin | null>(null)
  const [codeInput, setCodeInput] = useState('')
  const [appliedCode, setAppliedCode] = useState<string>()
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const price = (amount: number) => t('price', { amount: formatAmount(amount) })

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<Details, unknown, DetailsOutput>({
    resolver: zodResolver(customerDetails),
    defaultValues: { name: '', phone: '', address: '', landmark: '', notes: '', paymentMethod: 'cod' },
  })
  const paymentMethod = useWatch({ control, name: 'paymentMethod' })

  // Re-priced on the server whenever the pin, the cart or the discount code changes.
  const quote = useQuery({
    queryKey: ['quote', lines, pin, appliedCode],
    queryFn: () => getQuote({ lines, lat: pin?.lat ?? 0, lng: pin?.lng ?? 0, discountCode: appliedCode }),
    enabled: pin !== null && lines.length > 0,
    placeholderData: keepPreviousData,
  })

  const order = useMutation({
    mutationFn: placeOrder,
    onSuccess: ({ trackingToken }) => {
      clearCart()
      navigate(`/track/${trackingToken}`, { replace: true })
    },
    onError: () => {
      // A Turnstile token works once: show a fresh check.
      setCaptchaToken(null)
      setAttempt((n) => n + 1)
    },
  })

  // After a successful order the cart is emptied just before moving to the tracking page.
  if (lines.length === 0 && order.isIdle) return <Navigate to="/cart" replace />

  const settings = branch.data?.branch_settings
  const tiers = branch.data?.delivery_tiers ?? []
  const maxKm = tiers.length > 0 ? Math.max(...tiers.map((tier) => tier.upper_km)) : 0
  const problems = quote.data?.problems ?? []
  const items = new Map(menu.data?.flatMap((c) => c.items).map((item) => [item.id, item]))
  const canPlace = pin !== null && quote.data !== undefined && problems.length === 0 && captchaToken !== null && !quote.isFetching

  function applyCode() {
    const parsed = discountCode.safeParse(codeInput)
    setAppliedCode(parsed.success ? parsed.data : codeInput.trim().toUpperCase() || undefined)
  }

  function submit(details: DetailsOutput) {
    if (!pin || !captchaToken) return
    order.mutate({
      ...details,
      lines,
      lat: pin.lat,
      lng: pin.lng,
      discountCode: appliedCode,
      language: lng === 'ur' ? 'ur' : 'en',
      turnstileToken: captchaToken,
    })
  }

  const fieldError = (field: keyof Details) =>
    errors[field] && <span className="text-sm text-danger">{t(`checkout.errors.${field}`)}</span>

  return (
    <>
      <title>{`${t('pages.checkout')} · ${t('brand')}`}</title>
      <h1 className="font-heading text-3xl font-bold">{t('pages.checkout')}</h1>
      <p className="mt-2 max-w-[60ch] font-bold text-brand-deep">{t('checkout.callNotice')}</p>

      <form onSubmit={handleSubmit(submit)} noValidate className="mt-6 flex max-w-6xl flex-wrap items-start gap-8">
        <div className="flex min-w-0 flex-[999_1_30rem] flex-col gap-8">
          <section>
            <h2 className="font-heading text-2xl font-bold">{t('checkout.location')}</h2>
            {branch.data && (
              <div className="mt-3">
                <LocationPicker
                  branch={{ lat: Number(branch.data.lat), lng: Number(branch.data.lng) }}
                  radiusKm={maxKm / Number(settings?.road_distance_factor ?? 1)}
                  pin={pin}
                  onChange={setPin}
                />
              </div>
            )}
            <p aria-live="polite" className="mt-3 font-bold">
              {!pin
                ? t('checkout.dropPin')
                : quote.isPending
                  ? t('checkout.calculating')
                  : quote.data?.distanceKm === null
                    ? <span className="text-danger">{t('errors.OUTSIDE_DELIVERY_AREA', { km: maxKm })}</span>
                    : quote.data && t('checkout.distance', { km: quote.data.distanceKm, charge: price(quote.data.deliveryCharge) })}
            </p>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="font-heading text-2xl font-bold">{t('checkout.address')}</h2>
            <label className="flex flex-col gap-1">
              {t('checkout.addressLabel')}
              <textarea rows={2} maxLength={300} autoComplete="street-address" className={inputClass} {...register('address')} />
              {fieldError('address')}
            </label>
            <label className="flex flex-col gap-1">
              {t('checkout.landmarkLabel')}
              <input maxLength={150} className={inputClass} {...register('landmark')} />
            </label>
          </section>

          <section className="flex flex-col gap-4">
            <h2 className="font-heading text-2xl font-bold">{t('checkout.details')}</h2>
            <label className="flex flex-col gap-1">
              {t('checkout.nameLabel')}
              <input maxLength={60} autoComplete="name" className={inputClass} {...register('name')} />
              {fieldError('name')}
            </label>
            <label className="flex flex-col gap-1">
              {t('checkout.phoneLabel')}
              <input type="tel" inputMode="tel" autoComplete="tel" dir="ltr" placeholder="0300 1234567" className={`${inputClass} rtl:text-end`} {...register('phone')} />
              <span className="text-sm text-ink-muted">{t('checkout.phoneHelp')}</span>
              {fieldError('phone')}
            </label>
            <label className="flex flex-col gap-1">
              {t('checkout.notesLabel')}
              <textarea rows={2} maxLength={300} className={inputClass} {...register('notes')} />
            </label>
          </section>

          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 font-heading text-2xl font-bold">{t('checkout.payment')}</legend>
            {paymentMethods.map((method) => (
              <label key={method} className="flex items-center gap-3 rounded-control border border-line bg-raised px-3 py-3">
                <input type="radio" value={method} {...register('paymentMethod')} />
                <span className="font-bold">{t(`payment.${method}`)}</span>
              </label>
            ))}
            <p className="text-sm text-ink-muted">
              {paymentMethod === 'cod' ? t('checkout.codHelp') : t('checkout.transferHelp')}
            </p>
          </fieldset>
        </div>

        <aside className="sticky top-[calc(var(--header-h)+1rem)] flex min-w-0 flex-[1_1_20rem] flex-col gap-4 rounded-card border border-line bg-raised p-4">
          <h2 className="font-heading text-2xl font-bold">{t('checkout.summary')}</h2>
          <ul className="flex flex-col gap-2">
            {lines.map((line, index) => {
              const item = items.get(line.itemId)
              const variant = item?.variants.find((v) => v.id === line.variantId)
              const unit = item ? unitPrice(item, line) : null
              const broken = quote.data?.lineErrors.some((e) => e.index === index)
              return (
                <li key={index} className="flex justify-between gap-3 text-sm">
                  <span>
                    {line.quantity} × {item ? localized(lng, item.name_en, item.name_ur) : '…'}
                    {variant && ` (${localized(lng, variant.name_en, variant.name_ur)})`}
                    {broken && <span className="block font-bold text-danger">{t('cart.unavailable')}</span>}
                  </span>
                  {unit && 'price' in unit && <span className="shrink-0">{price(unit.price * line.quantity)}</span>}
                </li>
              )
            })}
          </ul>

          <label htmlFor="discount-code" className="-mb-2 text-sm font-bold">{t('checkout.discountLabel')}</label>
          <div className="flex gap-2">
            <input
              id="discount-code"
              value={codeInput}
              onChange={(event) => setCodeInput(event.target.value)}
              maxLength={20}
              dir="ltr"
              className={`${inputClass} uppercase`}
            />
            <button type="button" onClick={applyCode} className="rounded-control border border-ink-muted px-3 font-bold">
              {t('checkout.apply')}
            </button>
          </div>

          <dl className="flex flex-col gap-1">
            <div className="flex justify-between">
              <dt>{t('cart.subtotal')}</dt>
              <dd>{quote.data ? price(quote.data.subtotal) : '…'}</dd>
            </div>
            <div className="flex justify-between">
              <dt>{t('checkout.delivery')}</dt>
              <dd>{quote.data?.distanceKm != null ? price(quote.data.deliveryCharge) : '…'}</dd>
            </div>
            {quote.data && quote.data.discountAmount > 0 && (
              <div className="flex justify-between text-success">
                <dt>{t('checkout.discount')}</dt>
                <dd>− {price(quote.data.discountAmount)}</dd>
              </div>
            )}
            <div className="mt-1 flex justify-between border-t border-line pt-2 text-lg font-bold">
              <dt>{t('checkout.total')}</dt>
              <dd>{quote.data?.distanceKm != null ? price(quote.data.total) : '…'}</dd>
            </div>
          </dl>

          {problems.length > 0 && (
            <ul role="alert" className="flex flex-col gap-1 text-sm font-bold text-danger">
              {problems.map((problem) => (
                <li key={problem}>{t(errorKey(problem), { km: maxKm, minimum: price(settings?.min_order_amount ?? 0) })}</li>
              ))}
            </ul>
          )}
          {problems.includes('ITEM_UNAVAILABLE_OR_CHANGED') && (
            <Link to="/cart" className="text-sm font-bold text-brand-deep underline">{t('checkout.backToCart')}</Link>
          )}
          {quote.isError && <p role="alert" className="text-sm font-bold text-danger">{t(errorKey(quote.error instanceof OrderApiError ? quote.error.code : 'NETWORK'))}</p>}

          <Turnstile key={attempt} onToken={setCaptchaToken} unavailableMessage={t('checkout.botCheckUnavailable')} />
          {order.isError && (
            <p role="alert" className="text-sm font-bold text-danger">
              {t(errorKey(order.error instanceof OrderApiError ? order.error.code : 'NETWORK'), { km: maxKm, minimum: price(settings?.min_order_amount ?? 0) })}
            </p>
          )}

          <button
            type="submit"
            disabled={!canPlace || order.isPending}
            className="rounded-control bg-brand px-4 py-3 text-lg font-bold text-ink hover:bg-peach active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {order.isPending
              ? t('checkout.placing')
              : quote.data?.distanceKm != null
                ? t('checkout.placeWithTotal', { total: price(quote.data.total) })
                : t('checkout.place')}
          </button>
          <p className="text-sm text-ink-muted">{t('checkout.callNoticeShort')}</p>
        </aside>
      </form>
    </>
  )
}
