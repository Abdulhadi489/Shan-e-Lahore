import { describe, expect, it } from 'vitest'
import { buildTimeline, durationParts } from './timeline'

const at = (time: string) => `2026-11-20T${time}:00Z`

describe('buildTimeline', () => {
  it('gives the time between recorded steps and the total', () => {
    const { steps, totalSeconds } = buildTimeline([
      { to_status: 'pending_confirmation', changed_by: null, created_at: at('10:00') },
      { to_status: 'confirmed', changed_by: 'a', created_at: at('10:04') },
      { to_status: 'preparing', changed_by: 'a', created_at: at('10:06') },
      { to_status: 'out_for_delivery', changed_by: 'b', created_at: at('10:31') },
      { to_status: 'delivered', changed_by: 'b', created_at: at('10:49') },
    ])
    expect(steps.map((step) => step.secondsSincePrevious)).toEqual([null, 240, 120, 1500, 1080])
    expect(totalSeconds).toBe(49 * 60)
  })

  it('shows a step that was never recorded as missing and does not invent its time', () => {
    const { steps, totalSeconds } = buildTimeline([
      { to_status: 'pending_confirmation', changed_by: null, created_at: at('10:00') },
      { to_status: 'confirmed', changed_by: 'a', created_at: at('10:04') },
      { to_status: 'delivered', changed_by: 'a', created_at: at('11:00') },
    ])
    expect(steps.find((step) => step.status === 'preparing')?.event).toBeNull()
    expect(steps.find((step) => step.status === 'delivered')?.secondsSincePrevious).toBeNull()
    expect(totalSeconds).toBe(3600)
  })

  it('includes the cancelled step only when it happened', () => {
    const open = buildTimeline([{ to_status: 'pending_confirmation', changed_by: null, created_at: at('10:00') }])
    expect(open.steps.some((step) => step.status === 'cancelled')).toBe(false)
    const cancelled = buildTimeline([
      { to_status: 'pending_confirmation', changed_by: null, created_at: at('10:00') },
      { to_status: 'cancelled', changed_by: null, created_at: at('10:09') },
    ])
    expect(cancelled.steps.at(-1)?.status).toBe('cancelled')
    expect(cancelled.totalSeconds).toBe(540)
  })
})

describe('durationParts', () => {
  it('splits into hours and minutes', () => {
    expect(durationParts(65 * 60)).toEqual({ hours: 1, minutes: 5 })
    expect(durationParts(20)).toEqual({ hours: 0, minutes: 0 })
  })
})
