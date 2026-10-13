// Shared by the website ("Open now") and place-order (refuse orders when closed). No imports.
// Rows come from opening_hours: weekday 0 = Sunday; close_time earlier than open_time closes after midnight.

export type OpeningHours = { weekday: number; open_time: string; close_time: string; is_closed: boolean }[]

export type OpeningStatus =
  | { open: true; closesAt: string }
  | { open: false; opensAt: { weekday: number; time: string } | null }

const DAY = 24 * 60
const WEEK = 7 * DAY

const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3, 5))
const clock = (m: number) => `${String(Math.floor((m % DAY) / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`

// Minutes since Sunday 00:00 in Lahore, whatever the server's or phone's own time zone is.
export function karachiWeekMinute(now: Date) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Karachi',
      weekday: 'short',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  )
  const weekday = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(parts.weekday ?? '')
  return weekday * DAY + Number(parts.hour) * 60 + Number(parts.minute)
}

export function openingStatus(hours: OpeningHours, now: Date): OpeningStatus {
  const current = karachiWeekMinute(now)
  const intervals = hours
    .filter((h) => !h.is_closed)
    .map((h) => {
      const start = h.weekday * DAY + minutes(h.open_time)
      const length = (minutes(h.close_time) - minutes(h.open_time) + DAY) % DAY
      return { start, end: start + length }
    })

  // Saturday night can run past midnight into Sunday, so also test the current time one week later.
  for (const { start, end } of intervals) {
    for (const m of [current, current + WEEK]) {
      if (m >= start && m < end) return { open: true, closesAt: clock(end) }
    }
  }

  const next = intervals
    .map(({ start }) => (start > current ? start : start + WEEK))
    .sort((a, b) => a - b)[0]
  return { open: false, opensAt: next === undefined ? null : { weekday: Math.floor(next / DAY) % 7, time: clock(next) } }
}
