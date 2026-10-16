// Sales report figures (spec: Reports), worked out in the browser from the period's orders.
// Revenue counts delivered orders only; cancelled orders count towards the cancellation rate.

export type ReportOrder = {
  order_number: number
  created_at: string
  status: string
  cancel_reason: string | null
  payment_method: string
  payment_status: string
  subtotal: number
  delivery_charge: number
  discount_amount: number
  total: number
  distance_km: number
  discount_code_id: string | null
  order_items: { name_en: string; variant_name_en: string | null; quantity: number; line_total: number }[]
}

export type GroupBy = 'day' | 'week' | 'month'

const lahoreDate = (iso: string) => new Date(Date.parse(iso) + 5 * 3_600_000).toISOString().slice(0, 10)

// Weeks start on Monday, as people in Pakistan read a week.
function periodKey(iso: string, groupBy: GroupBy) {
  const day = lahoreDate(iso)
  if (groupBy === 'day') return day
  if (groupBy === 'month') return day.slice(0, 7)
  const date = new Date(`${day}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7))
  return date.toISOString().slice(0, 10)
}

function countBy<T>(rows: T[], key: (row: T) => string, value: (row: T) => number = () => 1) {
  const totals = new Map<string, number>()
  for (const row of rows) totals.set(key(row), (totals.get(key(row)) ?? 0) + value(row))
  return totals
}

export function buildReport(
  orders: ReportOrder[],
  groupBy: GroupBy,
  tierLimits: number[],
  codeNames: Map<string, string>,
) {
  const delivered = orders.filter((o) => o.status === 'delivered')
  const cancelled = orders.filter((o) => o.status === 'cancelled')
  const notCancelled = orders.filter((o) => o.status !== 'cancelled')
  const revenue = delivered.reduce((sum, o) => sum + o.total, 0)

  const periods = [...new Set(orders.map((o) => periodKey(o.created_at, groupBy)))].sort().map((period) => {
    const inPeriod = orders.filter((o) => periodKey(o.created_at, groupBy) === period)
    const done = inPeriod.filter((o) => o.status === 'delivered')
    return { period, orders: inPeriod.length, delivered: done.length, revenue: done.reduce((sum, o) => sum + o.total, 0) }
  })

  const items = new Map<string, { quantity: number; revenue: number }>()
  for (const order of notCancelled) {
    for (const line of order.order_items) {
      const name = line.variant_name_en ? `${line.name_en} (${line.variant_name_en})` : line.name_en
      const row = items.get(name) ?? { quantity: 0, revenue: 0 }
      items.set(name, { quantity: row.quantity + line.quantity, revenue: row.revenue + line.line_total })
    }
  }

  const limits = tierLimits.toSorted((a, b) => a - b)
  const tierOf = (km: number) => {
    const limit = limits.find((upper) => km <= upper)
    return limit === undefined ? `> ${limits.at(-1) ?? 0}` : `≤ ${limit}`
  }

  const tierCounts = countBy(notCancelled, (o) => tierOf(o.distance_km))
  const withCode = notCancelled.filter((o) => o.discount_code_id)

  return {
    totals: {
      orders: orders.length,
      delivered: delivered.length,
      cancelled: cancelled.length,
      open: orders.length - delivered.length - cancelled.length,
      cancellationRate: orders.length ? Math.round((cancelled.length / orders.length) * 100) : 0,
      revenue,
      averageOrder: delivered.length ? Math.round(revenue / delivered.length) : 0,
      deliveryCharges: delivered.reduce((sum, o) => sum + o.delivery_charge, 0),
      discounts: delivered.reduce((sum, o) => sum + o.discount_amount, 0),
    },
    periods,
    statuses: countBy(orders, (o) => o.status),
    cancelReasons: countBy(cancelled, (o) => o.cancel_reason ?? 'other'),
    paymentMethods: [...countBy(delivered, (o) => o.payment_method, (o) => o.total)].map(([method, amount]) => ({
      method,
      amount,
      orders: delivered.filter((o) => o.payment_method === method).length,
    })),
    topItems: [...items].map(([name, row]) => ({ name, ...row })).sort((a, b) => b.quantity - a.quantity).slice(0, 20),
    // Nearest first, then anything past the last tier (the pin was moved or tiers changed since).
    distanceTiers: [...limits.map((limit) => `≤ ${limit}`), `> ${limits.at(-1) ?? 0}`]
      .filter((label) => tierCounts.has(label))
      .map((label) => [label, tierCounts.get(label) ?? 0] as const),
    discountCodes: [...countBy(withCode, (o) => o.discount_code_id ?? '')].map(([id, uses]) => ({
      code: codeNames.get(id) ?? '?',
      uses,
      amount: withCode.filter((o) => o.discount_code_id === id).reduce((sum, o) => sum + o.discount_amount, 0),
    })),
  }
}

// One row per order for Excel. The byte-order mark makes Excel read the file as UTF-8.
// No customer names, phones or addresses: a spreadsheet gets copied around.
export function ordersCsv(orders: ReportOrder[], prefix: string) {
  const header = ['Order', 'Date', 'Time', 'Status', 'Cancel reason', 'Payment', 'Payment status', 'Subtotal', 'Delivery', 'Discount', 'Total', 'Distance km', 'Items']
  const cell = (value: string | number) => {
    const text = String(value)
    // Quotes for commas, quotes and new lines; a leading = + - @ is neutralised so Excel never runs it as a formula.
    const safe = /^[=+\-@]/.test(text) ? `'${text}` : text
    return /[",\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe
  }
  const rows = orders.map((o) => {
    const at = new Date(Date.parse(o.created_at) + 5 * 3_600_000).toISOString()
    return [
      `${prefix}-${o.order_number}`,
      at.slice(0, 10),
      at.slice(11, 16),
      o.status,
      o.cancel_reason ?? '',
      o.payment_method,
      o.payment_status,
      o.subtotal,
      o.delivery_charge,
      o.discount_amount,
      o.total,
      o.distance_km,
      o.order_items.map((line) => `${line.quantity} x ${line.name_en}${line.variant_name_en ? ` (${line.variant_name_en})` : ''}`).join('; '),
    ]
  })
  return '﻿' + [header, ...rows].map((row) => row.map(cell).join(',')).join('\r\n')
}
