import { describe, expect, it } from 'vitest'
import i18next from 'i18next'
import en from '../i18n/en.json'
import ur from '../i18n/ur.json'
import { customerMessage, riderMessage, whatsappLink } from './whatsapp'

const i18n = i18next.createInstance({
  resources: { en: { translation: en }, ur: { translation: ur } },
  lng: 'en',
  interpolation: { escapeValue: false },
})
await i18n.init()
const t = i18n.getFixedT('en')

const order = {
  status: 'pending_confirmation' as const,
  customer_name: 'Ali Raza',
  customer_phone: '923001234567',
  total: 1250,
  payment_method: 'cod' as 'cod' | 'bank_transfer' | 'jazzcash' | 'easypaisa',
  payment_status: 'unpaid' as const,
  cancel_reason: null,
  address_text: 'House 12, Street 5, Gulberg II',
  landmark: 'Near the mosque',
  lat: 31.52,
  lng: 74.35,
  riders: null,
}
const noAccounts = {
  estimated_delivery_minutes: 45,
  bank_name: null,
  bank_account_title: null,
  bank_account_number: null,
  bank_iban: null,
  jazzcash_account_title: null,
  jazzcash_number: null,
  easypaisa_account_title: null,
  easypaisa_number: null,
}
const link = 'https://example.test/track/abc'

describe('customerMessage', () => {
  it('says the order was received, with the tracking link, for cash on delivery', () => {
    const text = customerMessage(t, order, 'SL-1001', link, noAccounts)
    expect(text).toContain('order SL-1001 for Rs 1,250')
    expect(text).toContain(`Track your order: ${link}`)
    expect(text).not.toContain('Account')
  })

  it('adds the account details and screenshot request for an unpaid transfer', () => {
    const text = customerMessage(t, { ...order, payment_method: 'jazzcash' }, 'SL-1001', link, {
      ...noAccounts,
      jazzcash_account_title: 'Shan-e-Lahore',
      jazzcash_number: '923009876543',
    })
    expect(text).toContain('Send Rs 1,250 by JazzCash to this account:')
    expect(text).toContain('Account number: 03009876543')
    expect(text).toContain('payment screenshot in this chat')
  })

  it('says the details come on the call when the account is not set up', () => {
    const text = customerMessage(t, { ...order, payment_method: 'bank_transfer' }, 'SL-1001', link, noAccounts)
    expect(text).toContain("We'll give you the account details on the confirmation call.")
  })

  it('gives the rider and refund note at the matching statuses', () => {
    const riders = { name: 'Bilal', phone: '923331112222' }
    expect(customerMessage(t, { ...order, status: 'out_for_delivery', riders }, 'SL-1001', link, noAccounts)).toContain(
      'Your rider is Bilal, 0333 1112222.',
    )
    const cancelled = customerMessage(
      t,
      { ...order, status: 'cancelled', cancel_reason: 'out_of_stock', payment_status: 'refund_due' },
      'SL-1001',
      link,
      noAccounts,
    )
    expect(cancelled).toContain('An item ran out.')
    expect(cancelled).toContain('Your payment will be refunded.')
  })

  it('writes in the language the customer ordered in', () => {
    expect(customerMessage(i18n.getFixedT('ur'), order, 'SL-1001', link, noAccounts)).toContain('السلام علیکم')
  })
})

describe('riderMessage', () => {
  it('lists the address, the cash to collect and a map link', () => {
    const text = riderMessage(t, order, 'SL-1001')
    expect(text).toContain('Customer: Ali Raza, 0300 1234567')
    expect(text).toContain('Landmark: Near the mosque')
    expect(text).toContain('Collect Rs 1,250 in cash.')
    expect(text).toContain('https://maps.google.com/?q=31.52,74.35')
  })

  it('tells the rider to collect nothing for a paid transfer and skips an empty landmark', () => {
    const text = riderMessage(t, { ...order, payment_method: 'easypaisa', landmark: '' }, 'SL-1001')
    expect(text).toContain('Already paid. Collect nothing.')
    expect(text).not.toContain('Landmark')
  })
})

it('encodes the message so & and new lines survive the link', () => {
  expect(whatsappLink('923001234567', 'a & b\nc')).toBe('https://wa.me/923001234567?text=a%20%26%20b%0Ac')
})
