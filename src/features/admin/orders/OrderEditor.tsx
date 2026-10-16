import { lazy, Suspense, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Minus, Plus } from 'lucide-react'
import { unitPrice } from '../../../../supabase/functions/_shared/pricing'
import { useBranch } from '../../../app/useBranch'
import { formatAmount } from '../../../lib/money'
import type { CartLine } from '../../checkout/cart'
import { invoke, OrderApiError } from '../../checkout/orderApi'
import { ItemDialog } from '../../menu/ItemDialog'
import { useMenu, type MenuItem } from '../../menu/useMenu'
import { useStaff } from '../StaffLayout'
import { card, headingClass, inputClass, labelClass, primaryButton, secondaryButton, sectionHeading } from '../ui'
import type { LiveOrder } from './useLiveOrders'

const LocationPicker = lazy(() => import('../../checkout/LocationPicker').then((module) => ({ default: module.LocationPicker })))

// itemId is null for a dish deleted from the menu since the order; it must be removed before saving.
type EditLine = Omit<CartLine, 'itemId'> & { itemId: string | null; key: string; label: string }
export type EditResult = { total: number; discountRemoved: boolean }

const editErrors = ['OUTSIDE_DELIVERY_AREA', 'ITEM_UNAVAILABLE_OR_CHANGED', 'BELOW_MINIMUM', 'ORDER_NOT_EDITABLE', 'NOT_ALLOWED'] as const

function choiceLabel(item: MenuItem, line: CartLine) {
  const variant = item.variants.find((v) => v.id === line.variantId)
  const addons = item.addon_groups.flatMap((g) => g.options).filter((o) => line.addonOptionIds.includes(o.id))
  return [item.name_en + (variant ? ` (${variant.name_en})` : ''), ...addons.map((a) => a.name_en)].join(', ')
}

function Editor({ order }: { order: LiveOrder }) {
  const { t } = useTranslation(undefined, { lng: 'en' })
  const { branch } = useStaff()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const menu = useMenu()
  const place = useBranch()
  const [lines, setLines] = useState<EditLine[]>(() =>
    order.order_items.map((line) => ({
      key: line.id,
      itemId: line.item_id,
      variantId: line.variant_id,
      addonOptionIds: line.order_item_addons.flatMap((addon) => (addon.addon_option_id ? [addon.addon_option_id] : [])),
      quantity: line.quantity,
      label: [
        line.name_en + (line.variant_name_en ? ` (${line.variant_name_en})` : ''),
        ...line.order_item_addons.map((addon) => addon.name_en),
      ].join(', '),
    })),
  )
  const [pin, setPin] = useState({ lat: order.lat, lng: order.lng })
  const [adding, setAdding] = useState<MenuItem | null>(null)
  const items = menu.data?.flatMap((category) => category.items) ?? []
  const itemFor = (line: EditLine) => items.find((item) => item.id === line.itemId)
  const subtotal = lines.reduce((sum, line) => {
    const item = itemFor(line)
    const price = item && line.itemId ? unitPrice(item, line) : null
    return sum + (price && 'price' in price ? price.price * line.quantity : 0)
  }, 0)
  const save = useMutation({
    mutationFn: (body: object) =>
      invoke<{ total: number; discountRemoved: boolean }>('edit-order', body),
    onSuccess: (result) => {
      void queryClient.invalidateQueries({ queryKey: ['live-orders', branch.id] })
      void navigate(`/admin/orders/${order.id}`, { state: { edited: result satisfies EditResult } })
    },
  })
  const errorCode = save.error instanceof OrderApiError ? save.error.code : null
  const number = `${branch.order_prefix}-${order.order_number}`
  const setQuantity = (key: string, quantity: number) =>
    setLines((all) => all.map((line) => (line.key === key ? { ...line, quantity: Math.min(50, Math.max(1, quantity)) } : line)))
  const tiers = place.data?.delivery_tiers ?? []

  return (
    <>
      <form
        onSubmit={(event) => {
          event.preventDefault()
          const form = new FormData(event.currentTarget)
          save.mutate({
            orderId: order.id,
            lines: lines.map(({ itemId, variantId, addonOptionIds, quantity }) => ({ itemId, variantId, addonOptionIds, quantity })),
            lat: pin.lat,
            lng: pin.lng,
            address: String(form.get('address')).trim(),
            landmark: String(form.get('landmark')).trim(),
          })
        }}
        className="flex flex-col gap-4"
      >
        <title>{`${t('admin.editOrder.heading', { number })} · ${t('brand')}`}</title>
        <Link to={`/admin/orders/${order.id}`} className="flex items-center gap-1 text-brand-deep underline">
          <ArrowLeft aria-hidden className="size-4" />
          {t('admin.editOrder.cancel')}
        </Link>
        <h1 className={headingClass}>{t('admin.editOrder.heading', { number })}</h1>
        <p className="text-ink-muted">{t('admin.editOrder.help')}</p>

        <section className={card}>
          <h2 className={sectionHeading}>{t('admin.editOrder.dishes')}</h2>
          <ul className="mt-2 flex flex-col divide-y divide-line">
            {lines.map((line) => (
              <li key={line.key} className="flex flex-wrap items-center gap-3 py-2">
                <span className="flex-1">
                  {line.label}
                  {!line.itemId && <span className="block text-sm text-danger">{t('admin.editOrder.removed')}</span>}
                </span>
                {line.itemId && (
                  <span className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setQuantity(line.key, line.quantity - 1)}
                      aria-label={t('admin.editOrder.decrease', { name: line.label })}
                      className="rounded-control border border-ink-muted p-1"
                    >
                      <Minus aria-hidden className="size-4" />
                    </button>
                    <span className="w-6 text-center font-bold tabular-nums">{line.quantity}</span>
                    <button
                      type="button"
                      onClick={() => setQuantity(line.key, line.quantity + 1)}
                      aria-label={t('admin.editOrder.increase', { name: line.label })}
                      className="rounded-control border border-ink-muted p-1"
                    >
                      <Plus aria-hidden className="size-4" />
                    </button>
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => setLines((all) => all.filter((other) => other.key !== line.key))}
                  className="text-danger underline"
                >
                  {t('admin.editOrder.remove')}
                </button>
              </li>
            ))}
          </ul>
          <label className={`${labelClass} mt-3 max-w-sm`}>
            {t('admin.editOrder.addDish')}
            <select
              value=""
              onChange={(event) => setAdding(items.find((item) => item.id === event.target.value) ?? null)}
              className={inputClass}
            >
              <option value="" disabled>
                {t('admin.editOrder.chooseDish')}
              </option>
              {menu.data?.map((category) => (
                <optgroup key={category.id} label={category.name_en}>
                  {category.items.map((item) => (
                    <option key={item.id} value={item.id} disabled={!item.is_available}>
                      {item.name_en}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <p className="mt-3 font-bold">{t('admin.editOrder.itemsSubtotal', { amount: t('price', { amount: formatAmount(subtotal) }) })}</p>
        </section>

        <section className={`${card} flex flex-col gap-3`}>
          <h2 className={sectionHeading}>{t('admin.editOrder.address')}</h2>
          <label className={labelClass}>
            {t('admin.editOrder.address')}
            <textarea name="address" required maxLength={300} rows={2} defaultValue={order.address_text} className={inputClass} />
          </label>
          <label className={labelClass}>
            {t('admin.editOrder.landmark')}
            <input name="landmark" maxLength={150} defaultValue={order.landmark} className={inputClass} />
          </label>
          <p className="font-bold">{t('admin.editOrder.pin')}</p>
          {place.data && (
            <Suspense fallback={<p>{t('admin.loading')}</p>}>
              <LocationPicker
                branch={{ lat: place.data.lat, lng: place.data.lng }}
                radiusKm={Math.max(0, ...tiers.map((tier) => tier.upper_km))}
                pin={pin}
                onChange={setPin}
              />
            </Suspense>
          )}
        </section>

        <div className="flex flex-col gap-2">
          <button
            type="submit"
            disabled={save.isPending || lines.length === 0 || lines.some((line) => !line.itemId)}
            className={`${primaryButton} w-fit`}
          >
            {t('admin.editOrder.save')}
          </button>
          {save.isError && (
            <p role="alert" className="text-danger">
              {t(`admin.editOrder.errors.${editErrors.find((code) => code === errorCode) ?? 'other'}`)}
            </p>
          )}
          <Link to={`/admin/orders/${order.id}`} className={`${secondaryButton} w-fit`}>
            {t('admin.editOrder.cancel')}
          </Link>
        </div>
      </form>
      {/* Outside the form above: the dialog has its own form, and forms can't be nested. */}
      <ItemDialog
          item={adding}
          onClose={() => setAdding(null)}
          onAdd={(line) => {
            const item = items.find((candidate) => candidate.id === line.itemId)
            if (item) setLines((all) => [...all, { ...line, key: crypto.randomUUID(), label: choiceLabel(item, line) }])
          }}
        />
    </>
  )
}

export function OrderEditor() {
  const { t } = useTranslation(undefined, { lng: 'en' })
  const { id } = useParams()
  const { orders } = useStaff()
  const order = orders.data?.find((candidate) => candidate.id === id)
  if (orders.isPending) return <p>{t('admin.loading')}</p>
  if (!order) return <p role="alert">{t('admin.orders.notFound')}</p>
  if (order.status !== 'pending_confirmation') return <p role="alert">{t('admin.editOrder.notEditable')}</p>
  return <Editor order={order} />
}
