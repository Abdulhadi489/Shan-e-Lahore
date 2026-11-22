import { describe, expect, it } from 'vitest'
import { buildPerformance, performanceCsv, type PerformanceEvent } from './performance'

const ev = (order: string, to: PerformanceEvent['to_status'], by: string | null, time: string): PerformanceEvent => ({
  order_id: order,
  to_status: to,
  changed_by: by,
  created_at: `2026-11-20T${time}:00Z`,
})
const always = () => true

describe('buildPerformance', () => {
  const events = [
    ev('o1', 'pending_confirmation', null, '10:00'),
    ev('o1', 'confirmed', 'ali', '10:04'),
    ev('o1', 'preparing', 'ali', '10:06'),
    ev('o1', 'out_for_delivery', 'sara', '10:31'),
    ev('o1', 'delivered', 'sara', '10:49'),
    ev('o2', 'pending_confirmation', null, '11:00'),
    ev('o2', 'confirmed', 'sara', '11:10'),
    ev('o3', 'pending_confirmation', null, '12:00'),
    ev('o3', 'cancelled', 'ali', '12:30'),
    ev('o4', 'pending_confirmation', null, '13:00'),
    ev('o4', 'cancelled', null, '13:02'),
  ]
  const orders = [
    { id: 'o1', status: 'delivered' as const, rider_id: 'r1' },
    { id: 'o2', status: 'confirmed' as const, rider_id: null },
    { id: 'o3', status: 'cancelled' as const, rider_id: null },
    { id: 'o4', status: 'cancelled' as const, rider_id: null },
  ]

  it('measures each step for the person who ended it and the rider for delivery', () => {
    const result = buildPerformance(events, orders, always)
    const ali = result.staff.find((p) => p.id === 'ali')
    expect(ali?.confirm).toEqual({ count: 1, avg: 240, median: 240, max: 240 })
    expect(ali?.toKitchen?.avg).toBe(120)
    expect(result.staff.find((p) => p.id === 'sara')?.confirm?.avg).toBe(600)
    expect(result.riders).toEqual([{ id: 'r1', delivery: { count: 1, avg: 1080, median: 1080, max: 1080 } }])
    expect(result.overall.kitchen?.avg).toBe(1500)
  })

  it('never counts cancelled orders towards a time, and counts who cancelled', () => {
    const result = buildPerformance(events, orders, always)
    expect(result.staff.find((p) => p.id === 'ali')?.cancelled).toBe(1)
    expect(result.overall.customerCancelled).toBe(1)
    expect(result.overall.confirm?.count).toBe(2)
  })

  it('leaves out of time-to-confirm an order placed while closed, and reports how many', () => {
    const result = buildPerformance(events, orders, (iso) => !iso.includes('T11:00'))
    expect(result.overall.outsideHours).toBe(1)
    expect(result.overall.confirm?.count).toBe(1)
  })

  it('does not invent a step that was never recorded', () => {
    const result = buildPerformance(
      [ev('o9', 'pending_confirmation', null, '10:00'), ev('o9', 'delivered', 'ali', '11:00')],
      [{ id: 'o9', status: 'delivered', rider_id: 'r1' }],
      always,
    )
    expect(result.overall.confirm).toBeNull()
    expect(result.overall.delivery).toBeNull()
  })

  it('exports a spreadsheet without formulas running', () => {
    const csv = performanceCsv(buildPerformance(events, orders, always), (who) => (who === 'ali' ? '=Ali' : who))
    expect(csv.startsWith('﻿Group,Name')).toBe(true)
    expect(csv).toContain("'=Ali")
  })
})
