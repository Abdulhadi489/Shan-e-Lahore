import type { TFunction } from 'i18next'
import type { Tables } from '../types/database'
import { localPhone, phoneLabel } from './format'
import { formatAmount } from './money'

// Prefilled WhatsApp chat links (CLAUDE.md section 12): the text is always URL-encoded.
export const whatsappLink = (phone: string, text: string) => `https://wa.me/${phone}?text=${encodeURIComponent(text)}`

export const googleMapsLink = (lat: number, lng: number) => `https://maps.google.com/?q=${lat},${lng}`

type MessageOrder = Pick<
  Tables<'orders'>,
  | 'status'
  | 'customer_name'
  | 'customer_phone'
  | 'total'
  | 'payment_method'
  | 'payment_status'
  | 'cancel_reason'
  | 'address_text'
  | 'landmark'
  | 'lat'
  | 'lng'
> & { riders: { name: string; phone: string } | null }

type PaymentSettings = Pick<
  Tables<'branch_settings'>,
  | 'estimated_delivery_minutes'
  | 'bank_name'
  | 'bank_account_title'
  | 'bank_account_number'
  | 'bank_iban'
  | 'jazzcash_account_title'
  | 'jazzcash_number'
  | 'easypaisa_account_title'
  | 'easypaisa_number'
>

function paymentLines(order: MessageOrder, settings: PaymentSettings, t: TFunction) {
  const total = t('price', { amount: formatAmount(order.total) })
  const method = t(`payment.${order.payment_method}`)
  const account = {
    cod: null,
    bank_transfer: { title: settings.bank_account_title, number: settings.bank_account_number },
    jazzcash: { title: settings.jazzcash_account_title, number: settings.jazzcash_number && localPhone(settings.jazzcash_number) },
    easypaisa: { title: settings.easypaisa_account_title, number: settings.easypaisa_number && localPhone(settings.easypaisa_number) },
  }[order.payment_method]
  if (!account?.number) return [t('tracking.payTransferOnCall', { total, method })]
  return [
    t('tracking.payTransfer', { total, method }),
    order.payment_method === 'bank_transfer' && settings.bank_name && `${t('tracking.bank')}: ${settings.bank_name}`,
    `${t('tracking.accountTitle')}: ${account.title ?? ''}`,
    `${t('tracking.accountNumber')}: ${account.number}`,
    order.payment_method === 'bank_transfer' && settings.bank_iban && `IBAN: ${settings.bank_iban}`,
    t('whatsapp.screenshot'),
    t('tracking.transferNote'),
  ].filter((line): line is string => Boolean(line))
}

// The message for the order's current status. `t` must be fixed to the order's language.
// Delivered orders have no prepared message, so the chat opens empty.
export function customerMessage(
  t: TFunction,
  order: MessageOrder,
  number: string,
  trackingLink: string,
  settings: PaymentSettings,
) {
  let lines: string[]
  switch (order.status) {
    case 'pending_confirmation':
      lines = [t('whatsapp.received', { name: order.customer_name, number, total: t('price', { amount: formatAmount(order.total) }) })]
      if (order.payment_method !== 'cod' && order.payment_status === 'unpaid') lines.push(...paymentLines(order, settings, t))
      break
    case 'confirmed':
    case 'preparing':
      lines = [t('whatsapp.confirmed', { number, minutes: settings.estimated_delivery_minutes })]
      break
    case 'out_for_delivery':
      lines = [
        t('whatsapp.outForDelivery', { number, rider: order.riders?.name, phone: order.riders && phoneLabel(order.riders.phone) }),
      ]
      break
    case 'cancelled':
      lines = [t('whatsapp.cancelled', { number }), t(`tracking.reasons.${order.cancel_reason ?? 'other'}`)]
      if (order.payment_status === 'refund_due') lines.push(t('tracking.refundDue'))
      break
    case 'delivered':
      return ''
  }
  return [...lines, t('whatsapp.track', { link: trackingLink })].join('\n')
}

// For the rider, in English like the rest of the staff side.
export function riderMessage(t: TFunction, order: MessageOrder, number: string) {
  const collect =
    order.payment_method === 'cod'
      ? t('admin.whatsapp.collectCash', { amount: t('price', { amount: formatAmount(order.total) }) })
      : t('admin.whatsapp.collectNothing')
  return [
    t('admin.whatsapp.order', { number }),
    t('admin.whatsapp.customer', { name: order.customer_name, phone: phoneLabel(order.customer_phone) }),
    t('admin.whatsapp.address', { address: order.address_text }),
    order.landmark && t('admin.whatsapp.landmark', { landmark: order.landmark }),
    collect,
    t('admin.whatsapp.map', { link: googleMapsLink(order.lat, order.lng) }),
  ]
    .filter(Boolean)
    .join('\n')
}
