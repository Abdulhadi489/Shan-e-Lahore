// Western digits in both languages; Intl supplies day names and AM/PM in Urdu.
const locale = (lng: string) => `${lng === 'ur' ? 'ur-PK' : 'en-PK'}-u-nu-latn`

// Wrapped in Unicode isolate marks so "2:00 AM" isn't reordered to "AM 2:00" inside an Urdu sentence.
export const timeLabel = (lng: string, hhmm: string) =>
  `⁨${new Date(`2000-01-01T${hhmm}:00Z`).toLocaleTimeString(locale(lng), { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' })}⁩`

// 2023-01-01 was a Sunday, matching weekday 0.
export const dayLabel = (lng: string, weekday: number) =>
  new Date(Date.UTC(2023, 0, 1 + weekday)).toLocaleDateString(locale(lng), { weekday: 'long', timeZone: 'UTC' })

// Stored as 924235242650 or 923001234567; shown as 042 35242650 or 0300 1234567.
export const phoneLabel = (phone: string) => {
  const split = phone.startsWith('923') ? 5 : 4
  return `0${phone.slice(2, split)} ${phone.slice(split)}`
}
