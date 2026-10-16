import { describe, expect, it } from 'vitest'
import { buildReport, ordersCsv, type ReportOrder } from './report'

const order = (overrides: Partial<ReportOrder>): ReportOrder => ({
  order_number: 1001,
  created_at: '2026-10-20T10:00:00Z',
  status: 'delivered',
  cancel_reason: null,
  payment_method: 'cod',
  payment_status: 'paid',
  subtotal: 1000,
  delivery_charge: 100,
  discount_amount: 0,
  total: 1100,
  distance_km: 2.5,
  discount_code_id: null,
  order_items: [{ name_en: 'Chicken Karahi', variant_name_en: 'Half', quantity: 1, line_total: 1000 }],
  ...overrides,
})

const orders = [
  order({}),
  // 20:30 UTC is 01:30 on the 21st in Lahore.
  order({ order_number: 1002, created_at: '2026-10-20T20:30:00Z', payment_method: 'jazzcash', discount_code_id: 'c1', discount_amount: 100, total: 1000, distance_km: 6 }),
  order({ order_number: 1003, status: 'cancelled', cancel_reason: 'unreachable', total: 500 }),
  order({ order_number: 1004, status: 'pending_confirmation', distance_km: 9 }),
]

describe('buildReport', () => {
  const report = buildReport(orders, 'day', [3, 5, 7], new Map([['c1', 'EID10']]))

  it('counts revenue from delivered orders only and the cancellation rate from all', () => {
    expect(report.totals).toMatchObject({ orders: 4, delivered: 2, cancelled: 1, open: 1, cancellationRate: 25, revenue: 2100, averageOrder: 1050, discounts: 100 })
  })

  it('groups by Lahore day, week (from Monday) and month', () => {
    expect(report.periods.map((p) => p.period)).toEqual(['2026-10-20', '2026-10-21'])
    expect(buildReport(orders, 'week', [], new Map()).periods.map((p) => p.period)).toEqual(['2026-10-19'])
    expect(buildReport(orders, 'month', [], new Map()).periods).toEqual([{ period: '2026-10', orders: 4, delivered: 2, revenue: 2100 }])
  })

  it('breaks orders down by payment, items, distance tier and discount code, leaving out cancelled ones', () => {
    expect(report.paymentMethods).toEqual([
      { method: 'cod', amount: 1100, orders: 1 },
      { method: 'jazzcash', amount: 1000, orders: 1 },
    ])
    expect(report.topItems).toEqual([{ name: 'Chicken Karahi (Half)', quantity: 3, revenue: 3000 }])
    expect(report.distanceTiers).toEqual([['≤ 3', 1], ['≤ 7', 1], ['> 7', 1]])
    expect(report.discountCodes).toEqual([{ code: 'EID10', uses: 1, amount: 100 }])
    expect(report.cancelReasons.get('unreachable')).toBe(1)
  })
})

describe('ordersCsv', () => {
  it('starts with a byte-order mark, uses Lahore time and quotes risky cells', () => {
    const csv = ordersCsv([order({ order_items: [{ name_en: '=Naan, "plain"', variant_name_en: null, quantity: 2, line_total: 100 }] })], 'SL')
    const [header, row] = csv.split('\r\n')
    expect(header?.startsWith('\uFEFFOrder,')).toBe(true)
    expect(row).toBe('SL-1001,2026-10-20,15:00,delivered,,cod,paid,1000,100,0,1100,2.5,"2 x =Naan, ""plain"""')
    expect(ordersCsv([order({ cancel_reason: '=cmd' })], 'SL')).toContain(",'=cmd,")
  })
})
