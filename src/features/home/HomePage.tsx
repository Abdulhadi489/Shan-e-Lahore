import { lazy, Suspense, useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Bike, MapPin, PhoneCall, ShoppingBag } from 'lucide-react'
import { localized } from '../../i18n'
import { formatAmount } from '../../lib/money'
import { karachiWeekMinute, openingStatus } from '../../../supabase/functions/_shared/opening-hours'
import { useBranch } from '../../app/useBranch'
import { ItemDialog } from '../menu/ItemDialog'
import { ItemCard } from '../menu/MenuPage'
import { useMenu, type MenuItem } from '../menu/useMenu'

// The map library is large, so the delivery-area map loads only when someone asks for it.
const DeliveryAreaMap = lazy(() => import('../checkout/LocationPicker').then((module) => ({ default: module.DeliveryAreaMap })))
// The three arches from the printed menu and the shop's signboard: ثقافت، اپنائیت، روایت.
import archesSmall from '../../assets/menu-arches-800.webp'
import archesLarge from '../../assets/menu-arches-1600.webp'

// Western digits in both languages; Intl supplies day names and AM/PM in Urdu.
const locale = (lng: string) => `${lng === 'ur' ? 'ur-PK' : 'en-PK'}-u-nu-latn`
// Wrapped in Unicode isolate marks so "2:00 AM" isn't reordered to "AM 2:00" inside an Urdu sentence.
const timeLabel = (lng: string, hhmm: string) =>
  `⁨${new Date(`2000-01-01T${hhmm}:00Z`).toLocaleTimeString(locale(lng), { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' })}⁩`
// 2023-01-01 was a Sunday, matching weekday 0.
const dayLabel = (lng: string, weekday: number) =>
  new Date(Date.UTC(2023, 0, 1 + weekday)).toLocaleDateString(locale(lng), { weekday: 'long', timeZone: 'UTC' })
// Shown as 042 35242650 or 0300 1234567.
const phoneLabel = (phone: string) => {
  const split = phone.startsWith('923') ? 5 : 4
  return `0${phone.slice(2, split)} ${phone.slice(split)}`
}

const steps = [
  { icon: ShoppingBag, title: 'home.stepOrder', body: 'home.stepOrderBody' },
  { icon: PhoneCall, title: 'home.stepCall', body: 'home.stepCallBody' },
  { icon: Bike, title: 'home.stepDeliver', body: 'home.stepDeliverBody' },
] as const

export function HomePage() {
  const { t, i18n } = useTranslation()
  const lng = i18n.language
  const branch = useBranch()
  const menu = useMenu()
  const [selected, setSelected] = useState<MenuItem | null>(null)
  const [showMap, setShowMap] = useState(false)

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

      <img
        src={archesSmall}
        srcSet={`${archesSmall} 800w, ${archesLarge} 1600w`}
        sizes="(min-width: 1024px) 992px, 100vw"
        width={1600}
        height={269}
        fetchPriority="high"
        alt={t('home.archesAlt')}
        className="-mx-4 -mt-6 block w-[calc(100%+2rem)] max-w-none sm:mx-0 sm:mt-0 sm:w-full sm:rounded-card"
      />

      {/* Space beside the text stays free for a dish photo once the team's photos arrive. */}
      <section className="mt-8 max-w-2xl">
        {status && (
          <p className={`flex items-center gap-2 font-bold ${status.open ? 'text-success' : 'text-danger'}`}>
            <span aria-hidden className={`size-2.5 rounded-full ${status.open ? 'bg-success' : 'bg-danger'}`} />
            {status.open
              ? t('home.openNow', { time: timeLabel(lng, status.closesAt) })
              : !status.opensAt
                ? t('home.closed')
                : status.opensAt.weekday === today
                  ? t('home.closedOpensToday', { time: timeLabel(lng, status.opensAt.time) })
                  : t('home.closedOpensOn', { day: dayLabel(lng, status.opensAt.weekday), time: timeLabel(lng, status.opensAt.time) })}
          </p>
        )}
        <h1 className="mt-3 font-heading text-4xl font-bold sm:text-5xl md:text-6xl md:rtl:text-5xl">{t('home.headline')}</h1>
        <p className="mt-4 max-w-[45ch] text-lg text-ink-muted">{t('home.subhead')}</p>
        {settings && !settings.delivery_enabled && <p className="mt-3 font-bold text-danger">{t('home.deliveryPaused')}</p>}
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            to="/menu"
            className="flex items-center gap-2 rounded-control bg-brand px-6 py-3 text-lg font-bold text-ink hover:bg-peach active:scale-[0.98]"
          >
            {t('home.order')}
            <ArrowRight aria-hidden className="size-5 rtl:-scale-x-100" />
          </Link>
          {branch.data && (
            <a
              href={`tel:+${branch.data.phone}`}
              className="flex items-center gap-2 rounded-control border border-ink-muted bg-raised px-6 py-3 text-lg font-bold active:scale-[0.98]"
            >
              <PhoneCall aria-hidden className="size-5" />
              {t('home.call')} <span dir="ltr">{phoneLabel(branch.data.phone)}</span>
            </a>
          )}
        </div>
      </section>

      {deals.length > 0 && (
        <section className="mt-14">
          <h2 className="font-heading text-3xl font-bold">{t('home.deals')}</h2>
          <ul className="mt-5 grid gap-5 md:grid-cols-2">
            {deals.map((deal) => (
              <li key={deal.id}>
                {/* Arch-topped tiles echo the printed menu. */}
                <button
                  type="button"
                  onClick={() => setSelected(deal)}
                  className="flex h-full w-full flex-col items-center rounded-t-[10rem] rounded-b-card border-4 border-brand bg-peach px-6 pt-14 pb-6 text-center hover:border-brand-deep active:scale-[0.99]"
                >
                  <span className="font-heading text-3xl font-bold">{localized(lng, deal.name_en, deal.name_ur)}</span>
                  <span className="mt-2 max-w-[38ch] text-ink-muted">{localized(lng, deal.description_en, deal.description_ur)}</span>
                  <span className="mt-4 font-heading text-4xl font-bold text-brand-deep">{price(deal.base_price)}</span>
                  <span className="mt-4 rounded-control bg-brand px-5 py-2 font-bold text-ink">{t('item.add')}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {menu.data && menu.data.length > 0 && (
        <section className="mt-14">
          <h2 className="font-heading text-3xl font-bold">{t('home.browse')}</h2>
          <ul className="-mx-4 mt-5 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
            {menu.data.map((category) => (
              <li key={category.id} className="snap-start">
                <Link
                  to={`/menu#category-${category.id}`}
                  className="flex h-full w-40 flex-col justify-between gap-3 rounded-card border border-line bg-raised p-4 hover:border-brand-deep"
                >
                  <span className="font-heading text-xl font-bold">{localized(lng, category.name_en, category.name_ur)}</span>
                  <span className="text-sm text-ink-muted">{t('home.dishCount', { count: category.items.length })}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {popular.length > 0 && (
        <section className="mt-14">
          <h2 className="font-heading text-3xl font-bold">{t('home.popular')}</h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {popular.map((item) => (
              <li key={item.id}>
                <ItemCard item={item} onSelect={setSelected} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-14 rounded-card bg-peach px-5 py-8 md:px-8">
        <h2 className="font-heading text-3xl font-bold">{t('home.how')}</h2>
        <ol className="mt-6 grid gap-6 md:grid-cols-3">
          {steps.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-4">
              <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand text-ink">
                <Icon aria-hidden className="size-6" />
              </span>
              <span>
                <span className="block font-bold">{t(title)}</span>
                <span className="mt-1 block text-ink-muted">{t(body)}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-14 grid gap-10 md:grid-cols-3">
        <div>
          <h2 className="font-heading text-2xl font-bold">{t('home.findUs')}</h2>
          {branch.data && (
            <>
              <p className="mt-3 flex gap-2">
                <MapPin aria-hidden className="mt-1 size-5 shrink-0 text-brand-deep" />
                {localized(lng, branch.data.address_en, branch.data.address_ur)}
              </p>
              <p className="mt-2 flex gap-2">
                <PhoneCall aria-hidden className="mt-1 size-5 shrink-0 text-brand-deep" />
                <a href={`tel:+${branch.data.phone}`} dir="ltr" className="underline">
                  {phoneLabel(branch.data.phone)}
                </a>
              </p>
              {settings?.whatsapp_number && (
                <a href={`https://wa.me/${encodeURIComponent(settings.whatsapp_number)}`} className="mt-2 inline-block font-bold text-brand-deep underline">
                  {t('home.whatsapp')}
                </a>
              )}
            </>
          )}
        </div>

        <div>
          <h2 className="font-heading text-2xl font-bold">{t('home.hours')}</h2>
          <dl className="mt-3">
            {/* Week starts on Monday, as Lahore calendars do. */}
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
        </div>

        {tiers.length > 0 && (
          <div>
            <h2 className="font-heading text-2xl font-bold">{t('home.delivery')}</h2>
            <dl className="mt-3">
              {tiers.map((tier) => (
                <div key={tier.upper_km} className="flex justify-between gap-4 py-0.5">
                  <dt>{t('home.tier', { km: tier.upper_km })}</dt>
                  <dd>{price(tier.charge)}</dd>
                </div>
              ))}
            </dl>
            <p className="mt-2 text-sm text-ink-muted">{t('home.beyond', { km: tiers.at(-1)?.upper_km })}</p>
            {settings && settings.min_order_amount > 0 && (
              <p className="mt-1 text-sm text-ink-muted">{t('home.minimumOrder', { amount: price(settings.min_order_amount) })}</p>
            )}
            <div className="mt-4">
              {showMap && branch.data ? (
                <Suspense fallback={<p className="text-sm text-ink-muted">{t('home.mapLoading')}</p>}>
                  <DeliveryAreaMap
                    branch={{ lat: Number(branch.data.lat), lng: Number(branch.data.lng) }}
                    radiusKm={(tiers.at(-1)?.upper_km ?? 0) / Number(settings?.road_distance_factor ?? 1)}
                  />
                </Suspense>
              ) : (
                <button type="button" onClick={() => setShowMap(true)} className="font-bold text-brand-deep underline">
                  {t('home.showMap')}
                </button>
              )}
            </div>
          </div>
        )}
      </section>

      <ItemDialog item={selected} onClose={() => setSelected(null)} />
    </>
  )
}
