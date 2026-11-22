import type { Enums } from '../../../types/database'

export type PerformanceEvent = { order_id: string; to_status: Enums<'order_status'>; changed_by: string | null; created_at: string }
export type PerformanceOrder = { id: string; status: Enums<'order_status'>; rider_id: string | null }

export type Stats = { count: number; avg: number; median: number; max: number }

const seconds = (from: PerformanceEvent | undefined, to: PerformanceEvent | undefined) =>
  from && to ? Math.round((Date.parse(to.created_at) - Date.parse(from.created_at)) / 1000) : null

function stats(values: number[]): Stats | null {
  if (values.length === 0) return null
  const sorted = [...values].sort((a, b) => a - b)
  const middle = Math.floor(sorted.length / 2)
  return {
    count: sorted.length,
    avg: Math.round(sorted.reduce((sum, value) => sum + value, 0) / sorted.length),
    median: sorted.length % 2 ? (sorted[middle] ?? 0) : Math.round(((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2),
    max: sorted.at(-1) ?? 0,
  }
}

const push = (map: Map<string, number[]>, key: string, value: number) => map.set(key, [...(map.get(key) ?? []), value])

// Fair by design: each step's time belongs to the person who ended it, the kitchen is shown for the whole shop and
// not per person, delivery belongs to the assigned rider, cancelled orders never count towards a time, and an order
// placed while the restaurant was closed is left out of "time to confirm" (the wait overnight is not slowness).
export function buildPerformance(events: PerformanceEvent[], orders: PerformanceOrder[], wasOpen: (iso: string) => boolean) {
  const byOrder = new Map<string, Map<string, PerformanceEvent>>()
  for (const event of [...events].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    const own = byOrder.get(event.order_id) ?? new Map<string, PerformanceEvent>()
    if (!own.has(event.to_status)) own.set(event.to_status, event)
    byOrder.set(event.order_id, own)
  }

  const confirm = new Map<string, number[]>()
  const toKitchen = new Map<string, number[]>()
  const delivery = new Map<string, number[]>()
  const handled = new Map<string, Set<string>>()
  const cancelledBy = new Map<string, number>()
  const kitchen: number[] = []
  const allConfirm: number[] = []
  const allToKitchen: number[] = []
  const allDelivery: number[] = []
  let customerCancelled = 0
  let outsideHours = 0

  for (const order of orders) {
    const own = byOrder.get(order.id)
    if (!own) continue
    for (const [status, event] of own) {
      if (status !== 'pending_confirmation' && event.changed_by) {
        handled.set(event.changed_by, (handled.get(event.changed_by) ?? new Set()).add(order.id))
      }
    }
    const cancelled = own.get('cancelled')
    if (order.status === 'cancelled' || cancelled) {
      if (cancelled?.changed_by) cancelledBy.set(cancelled.changed_by, (cancelledBy.get(cancelled.changed_by) ?? 0) + 1)
      else customerCancelled += 1
      continue
    }
    const placed = own.get('pending_confirmation')
    const confirmed = own.get('confirmed')
    const confirmTime = seconds(placed, confirmed)
    if (confirmTime !== null && confirmed?.changed_by) {
      if (placed && !wasOpen(placed.created_at)) outsideHours += 1
      else {
        push(confirm, confirmed.changed_by, confirmTime)
        allConfirm.push(confirmTime)
      }
    }
    const preparing = own.get('preparing')
    const toKitchenTime = seconds(confirmed, preparing)
    if (toKitchenTime !== null && preparing?.changed_by) {
      push(toKitchen, preparing.changed_by, toKitchenTime)
      allToKitchen.push(toKitchenTime)
    }
    const kitchenTime = seconds(preparing, own.get('out_for_delivery'))
    if (kitchenTime !== null) kitchen.push(kitchenTime)
    const deliveryTime = seconds(own.get('out_for_delivery'), own.get('delivered'))
    if (deliveryTime !== null) {
      allDelivery.push(deliveryTime)
      if (order.rider_id) push(delivery, order.rider_id, deliveryTime)
    }
  }

  const people = new Set([...confirm.keys(), ...toKitchen.keys(), ...handled.keys(), ...cancelledBy.keys()])
  return {
    staff: [...people].map((id) => ({
      id,
      handled: handled.get(id)?.size ?? 0,
      confirm: stats(confirm.get(id) ?? []),
      toKitchen: stats(toKitchen.get(id) ?? []),
      cancelled: cancelledBy.get(id) ?? 0,
    })),
    riders: [...delivery].flatMap(([id, values]) => {
      const own = stats(values)
      return own ? [{ id, delivery: own }] : []
    }),
    overall: {
      confirm: stats(allConfirm),
      toKitchen: stats(allToKitchen),
      kitchen: stats(kitchen),
      delivery: stats(allDelivery),
      customerCancelled,
      outsideHours,
    },
  }
}

export type Performance = ReturnType<typeof buildPerformance>

// One row per person and step, for Excel (UTF-8 byte-order mark; a leading = + - @ is neutralised).
export function performanceCsv(performance: Performance, names: (id: string) => string) {
  const cell = (value: string | number) => {
    const text = String(value)
    const safe = /^[=+\-@]/.test(text) ? `'${text}` : text
    return /[",\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe
  }
  const minutes = (value: number) => (value / 60).toFixed(1)
  const row = (group: string, name: string, step: string, s: Stats | null) =>
    s ? [group, name, step, s.count, minutes(s.avg), minutes(s.median), minutes(s.max)] : [group, name, step, 0, '', '', '']
  const rows = [
    ...performance.staff.flatMap((person) => [
      row('Staff', names(person.id), 'Time to confirm (placed to confirmed)', person.confirm),
      row('Staff', names(person.id), 'Time to send to kitchen (confirmed to preparing)', person.toKitchen),
      ['Staff', names(person.id), 'Orders handled', person.handled, '', '', ''],
      ['Staff', names(person.id), 'Orders cancelled', person.cancelled, '', '', ''],
    ]),
    ...performance.riders.map((rider) => row('Rider', names(rider.id), 'Delivery time (out for delivery to delivered)', rider.delivery)),
    row('Whole shop', '', 'Kitchen and dispatch (preparing to out for delivery)', performance.overall.kitchen),
  ]
  const header = ['Group', 'Name', 'What is measured', 'Orders', 'Average min', 'Median min', 'Slowest min']
  return '﻿' + [header, ...rows].map((r) => r.map(cell).join(',')).join('\r\n')
}
