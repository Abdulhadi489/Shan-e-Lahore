import { useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { localized } from '../../i18n'
import { formatAmount } from '../../lib/money'
import { karachiWeekMinute, openingStatus } from '../../../supabase/functions/_shared/opening-hours'
import { useBranch } from '../../app/useBranch'
import { ItemDialog } from '../menu/ItemDialog'
import { ItemCard } from '../menu/MenuPage'
import { useMenu, type MenuItem } from '../menu/useMenu'

// Western digits in both languages; Intl supplies the day names and AM/PM in Urdu.
const locale = (lng: string) => `${lng === 'ur' ? 'ur-PK' : 'en-PK'}-u-nu-latn`
// Wrapped in Unicode isolate marks so "2:00 AM" isn't reordered to "AM 2:00" inside an Urdu sentence.
const timeLabel = (lng: string, hhmm: string) =>
  `\u2068${new Date(`2000-01-01T${hhmm}:00Z`).toLocaleTimeString(locale(lng), { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' })}\u2069`
// 2023-01-01 was a Sunday, matching weekday 0.
const dayLabel = (lng: string, weekday: number) =>
  new Date(Date.UTC(2023, 0, 1 + weekday)).toLocaleDateString(locale(lng), { weekday: 'long', timeZone: 'UTC' })
// Shown as 042 35242650 or 0300 1234567.
const phoneLabel = (phone: string) => `0${phone.slice(2, phone.startsWith('923') ? 5 : 4)} ${phone.slice(phone.startsWith('923') ? 5 : 4)}`

function ItemGrid({ items, onSelect }: { items: MenuItem[]; onSelect: (item: MenuItem) => void }) {
  return (
    <ul className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <li key={item.id}>
          <ItemCard item={item} onSelect={onSelect} />
        </li>
      ))}
    </ul>
  )
}

export function HomePage() {
  const { t, i18n } = useTranslation()
  const lng = i18n.language
  const branch = useBranch()
  const menu = useMenu()
  const [selected, setSelected] = useState<MenuItem | null>(null)

  const featured = menu.data?.flatMap((c) => c.items).filter((item) => item.is_featured) ?? []
  const deals = featured.filter((item) => item.is_deal)
  const popular = featured.filter((item) => !item.is_deal)

  const settings = branch.data?.branch_settings
  const hours = branch.data?.opening_hours ?? []
  const status = branch.data ? openingStatus(hours, new Date()) : null
  const today = Math.floor(karachiWeekMinute(new Date()) / (24 * 60))
  const tiers = [...(branch.data?.delivery_tiers ?? [])].sort((a, b) => a.upper_km - b.upper_km)
  const price = (amount: number) => t('price', { amount: formatAmount(amount) })

  return (
    <>
      <title>{t('brand')}</title>
      <section className="rounded-card bg-peach p-5">
        <h1 className="font-heading text-4xl font-bold text-brand-deep">{t('brand')}</h1>
        {branch.data && <p className="mt-1">{localized(lng, branch.data.address_en, branch.data.address_ur)}</p>}

        {status && (
          <p className={`mt-3 font-bold ${status.open ? 'text-success' : 'text-danger'}`}>
            {status.open
              ? t('home.openNow', { time: timeLabel(lng, status.closesAt) })
              : !status.opensAt
                ? t('home.closed')
                : status.opensAt.weekday === today
                  ? t('home.closedOpensToday', { time: timeLabel(lng, status.opensAt.time) })
                  : t('home.closedOpensOn', { day: dayLabel(lng, status.opensAt.weekday), time: timeLabel(lng, status.opensAt.time) })}
          </p>
        )}
        {settings && !settings.delivery_enabled && <p className="mt-1 font-bold text-danger">{t('home.deliveryPaused')}</p>}

        <div className="mt-4 flex flex-wrap gap-3">
          <Link to="/menu" className="rounded-control bg-brand px-5 py-3 font-bold text-ink hover:bg-raised">
            {t('home.order')}
          </Link>
          {branch.data && (
            <a href={`tel:+${branch.data.phone}`} className="rounded-control border border-ink-muted bg-raised px-5 py-3 font-bold">
              {t('home.call')} <span dir="ltr">{phoneLabel(branch.data.phone)}</span>
            </a>
          )}
          {settings?.whatsapp_number && (
            <a
              href={`https://wa.me/${encodeURIComponent(settings.whatsapp_number)}`}
              className="rounded-control border border-ink-muted bg-raised px-5 py-3 font-bold"
            >
              {t('home.whatsapp')}
            </a>
          )}
        </div>
      </section>

      {deals.length > 0 && (
        <section className="mt-8">
          <h2 className="font-heading text-2xl font-bold">{t('home.deals')}</h2>
          <ItemGrid items={deals} onSelect={setSelected} />
        </section>
      )}
      {popular.length > 0 && (
        <section className="mt-8">
          <h2 className="font-heading text-2xl font-bold">{t('home.popular')}</h2>
          <ItemGrid items={popular} onSelect={setSelected} />
        </section>
      )}

      <div className="mt-8 grid gap-6 sm:grid-cols-2">
        <section className="rounded-card border border-line bg-raised p-4">
          <h2 className="font-heading text-2xl font-bold">{t('home.hours')}</h2>
          <dl className="mt-2">
            {/* Week starts on Monday, as Lahore calendars do. */}
            {[1, 2, 3, 4, 5, 6, 0].map((weekday) => {
              const day = hours.find((h) => h.weekday === weekday)
              return (
                <div key={weekday} className={`flex justify-between py-1 ${weekday === today ? 'font-bold' : ''}`}>
                  <dt>{dayLabel(lng, weekday)}</dt>
                  <dd>
                    {!day || day.is_closed ? (
                      t('home.closedDay')
                    ) : (
                      <span dir="ltr">{`${timeLabel(lng, day.open_time.slice(0, 5))} – ${timeLabel(lng, day.close_time.slice(0, 5))}`}</span>
                    )}
                  </dd>
                </div>
              )
            })}
          </dl>
        </section>

        {tiers.length > 0 && (
          <section className="rounded-card border border-line bg-raised p-4">
            <h2 className="font-heading text-2xl font-bold">{t('home.delivery')}</h2>
            <dl className="mt-2">
              {tiers.map((tier) => (
                <div key={tier.upper_km} className="flex justify-between py-1">
                  <dt>{t('home.tier', { km: tier.upper_km })}</dt>
                  <dd>{price(tier.charge)}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 text-sm text-ink-muted">{t('home.beyond', { km: tiers.at(-1)?.upper_km })}</p>
            {settings && settings.min_order_amount > 0 && (
              <p className="mt-1 text-sm text-ink-muted">{t('home.minimumOrder', { amount: price(settings.min_order_amount) })}</p>
            )}
          </section>
        )}
      </div>

      <ItemDialog item={selected} onClose={() => setSelected(null)} />
    </>
  )
}
