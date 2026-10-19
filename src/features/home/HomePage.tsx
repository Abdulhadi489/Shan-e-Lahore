import { lazy, Suspense, useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Bike, MapPin, PhoneCall, ShoppingBag } from 'lucide-react'
import { localized } from '../../i18n'
import { formatAmount } from '../../lib/money'
import { menuImageUrl } from '../../lib/images'
import { dayLabel, phoneLabel, timeLabel } from '../../lib/format'
import { OpeningHoursList } from '../../app/OpeningHoursList'
import { karachiWeekMinute, openingStatus } from '../../../supabase/functions/_shared/opening-hours'
import { useBranch } from '../../app/useBranch'
import { ItemDialog } from '../menu/ItemDialog'
import { ItemCard } from '../menu/MenuPage'
import { HeroPhoto } from './HeroPhoto'
import { HeritageArches } from './HeritageArches'
import { HeroVideo } from './HeroVideo'

import { useMenu, type MenuItem } from '../menu/useMenu'

// The map library is large, so the delivery-area map loads only when someone asks for it.
const DeliveryAreaMap = lazy(() => import('../checkout/LocationPicker').then((module) => ({ default: module.DeliveryAreaMap })))

const steps = [
  { icon: ShoppingBag, title: 'home.stepOrder', body: 'home.stepOrderBody' },
  { icon: PhoneCall, title: 'home.stepCall', body: 'home.stepCallBody' },
  { icon: Bike, title: 'home.stepDeliver', body: 'home.stepDeliverBody' },
] as const

// One heading style for every section keeps the page calm and consistent.
const sectionHeading = 'font-heading text-3xl font-semibold text-ink sm:text-4xl'

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
  const heroDish = [...deals, ...popular].find((item) => item.image_path)
  const allItems = menu.data?.flatMap((c) => c.items) ?? []

  const settings = branch.data?.branch_settings
  const hours = branch.data?.opening_hours ?? []
  const status = branch.data ? openingStatus(hours, new Date()) : null
  const today = Math.floor(karachiWeekMinute(new Date()) / (24 * 60))
  const tiers = [...(branch.data?.delivery_tiers ?? [])].sort((a, b) => a.upper_km - b.upper_km)
  const price = (amount: number) => t('price', { amount: formatAmount(amount) })

  return (
    <>
      <title>{t('brand')}</title>

      <HeritageArches />

      <div className="mt-10 flex flex-wrap items-center gap-x-[clamp(1.5rem,4vw,4rem)] gap-y-10">
        <section className="min-w-0 flex-[1_1_26rem]">
          {status && (
            <p
              className={`inline-flex items-center gap-2 rounded-full bg-raised px-3 py-1 text-sm font-medium ring-1 ring-line ${status.open ? 'text-success' : 'text-danger'}`}
            >
              <span aria-hidden className={`size-2 rounded-full ${status.open ? 'bg-success' : 'bg-danger'}`} />
              {status.open
                ? t('home.openNow', { time: timeLabel(lng, status.closesAt) })
                : !status.opensAt
                  ? t('home.closed')
                  : status.opensAt.weekday === today
                    ? t('home.closedOpensToday', { time: timeLabel(lng, status.opensAt.time) })
                    : t('home.closedOpensOn', { day: dayLabel(lng, status.opensAt.weekday), time: timeLabel(lng, status.opensAt.time) })}
            </p>
          )}

          <h1 className="mt-4 font-heading text-[clamp(2.5rem,1.6rem+3vw,5rem)] leading-[1.05] font-semibold text-ink rtl:text-[clamp(1.875rem,1.25rem+2vw,3.75rem)] rtl:leading-snug">
            {t('home.headline')}
          </h1>
          <p className="mt-4 max-w-[45ch] text-[clamp(1.0625rem,0.95rem+0.3vw,1.375rem)] text-ink-muted">{t('home.subhead')}</p>
          {settings && !settings.delivery_enabled && <p className="mt-3 font-medium text-danger">{t('home.deliveryPaused')}</p>}

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/menu"
              className="flex min-h-12 items-center gap-2 rounded-control bg-brand px-6 font-medium text-ink hover:bg-brand-deep hover:text-raised active:scale-[0.98]"
            >
              {t('home.order')}
              <ArrowRight aria-hidden className="size-5 rtl:-scale-x-100" />
            </Link>
            {branch.data && (
              <a
                href={`tel:+${branch.data.phone}`}
                className="flex min-h-12 items-center gap-2 rounded-control border-2 border-ink px-6 font-medium text-ink hover:bg-raised active:scale-[0.98]"
              >
                <PhoneCall aria-hidden className="size-5 text-brand-deep" />
                <span dir="ltr">{phoneLabel(branch.data.phone)}</span>
              </a>
            )}
          </div>
        </section>
        <HeroVideo poster={heroDish?.image_path ? menuImageUrl(heroDish.image_path, 'full') : undefined} />
      </div>

      {/* The arch took HeroPhoto's place beside the headline; the admin's home banner or featured dish follows it. */}
      <div className="mt-16 flex max-w-4xl">
        <HeroPhoto items={allItems} featuredDish={heroDish} onOpen={setSelected} />
      </div>

      {deals.length > 0 && (
        <section className="mt-20">
          <h2 className={sectionHeading}>{t('home.deals')}</h2>
          <ul className="mt-6 grid grid-cols-[repeat(auto-fill,minmax(min(18rem,100%),1fr))] gap-5">
            {deals.map((deal) => (
              <li key={deal.id}>
                {/* Arch-topped tiles echo the printed menu, with a gold hairline and card fill. */}
                <button
                  type="button"
                  onClick={() => setSelected(deal)}
                  className="flex h-full w-full flex-col items-center rounded-t-[10rem] rounded-b-card border border-gold bg-raised px-6 pt-12 pb-6 text-center shadow-sm hover:border-brand-deep active:scale-[0.99]"
                >
                  <span className="font-heading text-2xl font-semibold text-ink">{localized(lng, deal.name_en, deal.name_ur)}</span>
                  <span className="mt-2 max-w-[38ch] text-sm text-ink-muted">{localized(lng, deal.description_en, deal.description_ur)}</span>
                  <span className="mt-4 font-heading text-3xl font-semibold text-brand-deep">{price(deal.base_price)}</span>
                  <span className="mt-4 rounded-control bg-brand px-5 py-2 text-sm font-medium text-ink">{t('item.add')}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {menu.data && menu.data.length > 0 && (
        <section className="mt-20">
          <h2 className={sectionHeading}>{t('home.browse')}</h2>
          <ul className="-mx-(--page-pad) mt-6 flex snap-x gap-3 overflow-x-auto scrollbar-none px-(--page-pad) pb-2">
            {menu.data.map((category) => (
              <li key={category.id} className="snap-start">
                <Link
                  to={`/menu#category-${category.id}`}
                  className="flex h-full w-40 flex-col justify-between gap-2 rounded-card border border-line bg-raised p-4 hover:border-brand-deep"
                >
                  <span className="font-heading text-lg font-semibold text-ink">{localized(lng, category.name_en, category.name_ur)}</span>
                  <span className="text-sm text-ink-muted">{t('home.dishCount', { count: category.items.length })}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {popular.length > 0 && (
        <section className="mt-20">
          <h2 className={sectionHeading}>{t('home.popular')}</h2>
          <ul className="mt-6 grid grid-cols-cards gap-3">
            {popular.map((item) => (
              <li key={item.id}>
                <ItemCard item={item} onSelect={setSelected} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Light panel so it stands out against the sand background. */}
      <section className="mt-20 rounded-card bg-raised/90 shadow-sm px-[clamp(1.25rem,3vw,2.5rem)] py-8">
        <h2 className={sectionHeading}>{t('home.how')}</h2>
        <ol className="mt-6 grid grid-cols-[repeat(auto-fit,minmax(min(16rem,100%),1fr))] gap-6">
          {steps.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-4">
              <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand text-ink">
                <Icon aria-hidden className="size-5" />
              </span>
              <span>
                <span className="block font-medium text-ink">{t(title)}</span>
                <span className="mt-1 block text-sm text-ink-muted">{t(body)}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-20 grid grid-cols-[repeat(auto-fit,minmax(min(16rem,100%),1fr))] gap-10 border-t border-line pt-10">
        <div>
          <h2 className="font-heading text-xl font-semibold text-ink">{t('home.findUs')}</h2>
          {branch.data && (
            <>
              <p className="mt-3 flex gap-2 text-ink-muted">
                <MapPin aria-hidden className="mt-1 size-5 shrink-0 text-brand-deep" />
                {localized(lng, branch.data.address_en, branch.data.address_ur)}
              </p>
              <p className="mt-2 flex gap-2">
                <PhoneCall aria-hidden className="mt-1 size-5 shrink-0 text-brand-deep" />
                <a href={`tel:+${branch.data.phone}`} dir="ltr" className="inline-flex min-h-11 items-center text-ink underline">
                  {phoneLabel(branch.data.phone)}
                </a>
              </p>
              {settings?.whatsapp_number && (
                <a href={`https://wa.me/${encodeURIComponent(settings.whatsapp_number)}`} className="mt-2 inline-block font-medium text-brand-deep underline">
                  {t('home.whatsapp')}
                </a>
              )}
            </>
          )}
        </div>

        <div>
          <h2 className="font-heading text-xl font-semibold text-ink">{t('home.hours')}</h2>
          <div className="mt-3 text-ink-muted">
            <OpeningHoursList hours={hours} />
          </div>
        </div>

        {tiers.length > 0 && (
          <div>
            <h2 className="font-heading text-xl font-semibold text-ink">{t('home.delivery')}</h2>
            <dl className="mt-3 text-ink-muted">
              {tiers.map((tier) => (
                <div key={tier.upper_km} className="flex justify-between gap-4 py-0.5">
                  <dt>{t('home.tier', { km: tier.upper_km })}</dt>
                  <dd className="font-medium text-ink">{price(tier.charge)}</dd>
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
                <button type="button" onClick={() => setShowMap(true)} className="min-h-11 text-sm font-medium text-brand-deep underline">
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