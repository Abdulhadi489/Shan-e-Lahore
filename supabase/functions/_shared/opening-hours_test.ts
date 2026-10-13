import { assertEquals } from 'jsr:@std/assert@1.0.19'
import { type OpeningHours, openingStatus } from './opening-hours.ts'

// Lahore is UTC+5. 2026-10-12 is a Monday (weekday 1).
const lahore = (iso: string) => new Date(`${iso}+05:00`)

const noonToTwoAm: OpeningHours = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({
  weekday,
  open_time: '12:00:00',
  close_time: '02:00:00',
  is_closed: false,
}))

Deno.test('open during the day, closing after midnight', () => {
  assertEquals(openingStatus(noonToTwoAm, lahore('2026-10-12T18:30')), { open: true, closesAt: '02:00' })
})

Deno.test("still open after midnight on the previous day's hours", () => {
  assertEquals(openingStatus(noonToTwoAm, lahore('2026-10-13T01:59')), { open: true, closesAt: '02:00' })
})

Deno.test('closed between closing and opening, opens at noon the same day', () => {
  assertEquals(openingStatus(noonToTwoAm, lahore('2026-10-13T02:00')), {
    open: false,
    opensAt: { weekday: 2, time: '12:00' },
  })
  assertEquals(openingStatus(noonToTwoAm, lahore('2026-10-13T11:59')), {
    open: false,
    opensAt: { weekday: 2, time: '12:00' },
  })
})

Deno.test("Saturday's late hours run into Sunday morning", () => {
  // 2026-10-18 is a Sunday; 01:00 belongs to Saturday's 12:00-02:00.
  assertEquals(openingStatus(noonToTwoAm, lahore('2026-10-18T01:00')), { open: true, closesAt: '02:00' })
})

Deno.test('a closed day is skipped when finding the next opening', () => {
  const closedTuesday = noonToTwoAm.map((h) => (h.weekday === 2 ? { ...h, is_closed: true } : h))
  // Tuesday 15:00: closed today, opens Wednesday at noon.
  assertEquals(openingStatus(closedTuesday, lahore('2026-10-13T15:00')), {
    open: false,
    opensAt: { weekday: 3, time: '12:00' },
  })
  // Tuesday 01:00 still belongs to Monday's late hours.
  assertEquals(openingStatus(closedTuesday, lahore('2026-10-13T01:00')), { open: true, closesAt: '02:00' })
})

Deno.test('same-day hours and a week with no opening hours', () => {
  const lunchOnly: OpeningHours = [{ weekday: 1, open_time: '11:00:00', close_time: '15:30:00', is_closed: false }]
  assertEquals(openingStatus(lunchOnly, lahore('2026-10-12T15:29')), { open: true, closesAt: '15:30' })
  assertEquals(openingStatus(lunchOnly, lahore('2026-10-12T15:30')), {
    open: false,
    opensAt: { weekday: 1, time: '11:00' },
  })
  assertEquals(openingStatus([], lahore('2026-10-12T12:00')), { open: false, opensAt: null })
})

Deno.test('uses Lahore time whatever the time zone of the Date', () => {
  // 13:00 UTC is 18:00 in Lahore.
  assertEquals(openingStatus(noonToTwoAm, new Date('2026-10-12T13:00Z')), { open: true, closesAt: '02:00' })
  // 20:30 UTC on Monday is 01:30 Tuesday in Lahore, still within Monday's hours.
  assertEquals(openingStatus(noonToTwoAm, new Date('2026-10-12T20:30Z')), { open: true, closesAt: '02:00' })
})
