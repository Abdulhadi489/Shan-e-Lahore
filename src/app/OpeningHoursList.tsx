import { useTranslation } from 'react-i18next'
import { karachiWeekMinute } from '../../supabase/functions/_shared/opening-hours'
import { dayLabel, timeLabel } from '../lib/format'

type Hours = { weekday: number; open_time: string; close_time: string; is_closed: boolean }[]

// The week's opening hours, today in bold. Week starts on Monday, as Lahore calendars do.
export function OpeningHoursList({ hours }: { hours: Hours }) {
  const { t, i18n } = useTranslation()
  const lng = i18n.language
  const today = Math.floor(karachiWeekMinute(new Date()) / (24 * 60))
  return (
    <dl>
      {[1, 2, 3, 4, 5, 6, 0].map((weekday) => {
        const day = hours.find((h) => h.weekday === weekday)
        return (
          <div key={weekday} className={`flex justify-between gap-4 py-0.5 ${weekday === today ? 'font-bold' : ''}`}>
            <dt>{dayLabel(lng, weekday)}</dt>
            <dd>
              {!day || day.is_closed
                ? t('home.closedDay')
                : `${timeLabel(lng, day.open_time.slice(0, 5))} – ${timeLabel(lng, day.close_time.slice(0, 5))}`}
            </dd>
          </div>
        )
      })}
    </dl>
  )
}
