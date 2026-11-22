import type { Enums } from '../../../types/database'

export type StatusEvent = { to_status: Enums<'order_status'>; changed_by: string | null; created_at: string }

// The steps an order passes through, in order. "cancelled" is shown only when it happened.
export const timelineSteps = ['pending_confirmation', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled'] as const
export type TimelineStep = {
  status: (typeof timelineSteps)[number]
  event: StatusEvent | null
  // Seconds since the step before it that was recorded; null when this or the earlier step was not recorded.
  secondsSincePrevious: number | null
}

// One row per step: the first event for that status, or null where nothing was recorded (never guessed).
export function buildTimeline(events: StatusEvent[]): { steps: TimelineStep[]; totalSeconds: number | null } {
  const first = new Map<string, StatusEvent>()
  for (const event of [...events].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
    if (!first.has(event.to_status)) first.set(event.to_status, event)
  }
  const shown = timelineSteps.filter((status) => status !== 'cancelled' || first.has('cancelled'))
  const gap = (from: StatusEvent | null | undefined, to: StatusEvent | null | undefined) =>
    from && to ? Math.round((Date.parse(to.created_at) - Date.parse(from.created_at)) / 1000) : null
  const steps = shown.map((status, index) => {
    const before = shown[index - 1]
    return { status, event: first.get(status) ?? null, secondsSincePrevious: before ? gap(first.get(before), first.get(status)) : null }
  })
  const end = first.get('delivered') ?? first.get('cancelled')
  return { steps, totalSeconds: gap(first.get('pending_confirmation'), end) }
}

// 4 min, 1 h 5 min, under 1 min.
export function durationParts(seconds: number) {
  const minutes = Math.round(seconds / 60)
  if (minutes < 1) return { hours: 0, minutes: 0 }
  return { hours: Math.floor(minutes / 60), minutes: minutes % 60 }
}
