import { lazy, Suspense, useState } from 'react'
import { Link } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ArrowRight, Bike, MapPin, PhoneCall, ShoppingBag } from 'lucide-react'
import { localized } from '../../i18n'
import { formatAmount } from '../../lib/money'
import { dayLabel, phoneLabel, timeLabel } from '../../lib/format'
import { OpeningHoursList } from '../../app/OpeningHoursList'
import { karachiWeekMinute, openingStatus } from '../../../supabase/functions/_shared/opening-hours'
import { useBranch } from '../../app/useBranch'
import { ItemDialog } from '../menu/ItemDialog'
import { ItemCard } from '../menu/MenuPage'
import { HeroPhoto } from './HeroPhoto'

// The three arches from the printed menu and the shop's signboard: ثقافت، اپنائیت، روایت.
import archesSmall from '../../assets/menu-arches-800.webp'
import archesLarge from '../../assets/menu-arches-1600.webp'
import { useMenu, type MenuItem } from '../menu/useMenu'

// The map library is large, so the delivery-area map loads only when someone asks for it.
const DeliveryAreaMap = lazy(() => import('../checkout/LocationPicker').then((module) => ({ default: module.DeliveryAreaMap })))

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

      <img
        src={archesSmall}
        srcSet={`${archesSmall} 800w, ${archesLarge} 1600w`}
        sizes="(min-width: 120rem) 2000px, 100vw"
        width={1600}
        height={269}
        fetchPriority="high"
        alt={t('home.archesAlt')}
        className="block w-full rounded-card"
      />

      {/* Text sizes follow the window smoothly; the photo (HeroPhoto) sits beside the headline or wraps below it. */}
      <div className="mt-8 flex flex-wrap items-center gap-x-[clamp(1.5rem,3vw,3rem)] gap-y-6">
        <section className="min-w-0 flex-[1_1_26rem]">
          {status && (
            <p className={`flex items-center gap-2 font-bold text-[clamp(1rem,0.85rem+0.3vw,1.5rem)] ${status.open ? 'text-success' : 'text-danger'}`}>
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
          <h1 className="mt-3 font-heading text-[clamp(2.25rem,1.5rem+3.2vw,7rem)] font-bold rtl:text-[clamp(1.875rem,1.25rem+2.4vw,5.5rem)]">{t('home.headline')}</h1>
          <p className="mt-[0.75em] max-w-[45ch] text-[clamp(1.0625rem,0.9rem+0.45vw,1.875rem)] text-ink-muted">{t('home.subhead')}</p>
          {settings && !settings.delivery_enabled && <p className="mt-3 font-bold text-danger">{t('home.deliveryPaused')}</p>}
          <div className="mt-[clamp(1.5rem,1rem+1vw,2.5rem)] flex flex-wrap gap-3 text-[clamp(1.0625rem,0.95rem+0.35vw,1.5rem)]">
            <Link
              to="/menu"
              className="flex items-center gap-2 rounded-control bg-brand px-[1.4em] py-[0.7em] font-bold text-ink hover:bg-peach active:scale-[0.98]"
            >
              {t('home.order')}
              <ArrowRight aria-hidden className="size-5 rtl:-scale-x-100" />
            </Link>
            {branch.data && (
              <a
                href={`tel:+${branch.data.phone}`}
                className="flex items-center gap-2 rounded-control border border-ink-muted bg-raised px-[1.4em] py-[0.7em] font-bold active:scale-[0.98]"
              >
                <PhoneCall aria-hidden className="size-5" />
                {t('home.call')} <span dir="ltr">{phoneLabel(branch.data.phone)}</span>
              </a>
            )}
          </div>
        </section>
        <HeroPhoto items={allItems} featuredDish={heroDish} onOpen={setSelected} />
      </div>

      {deals.length > 0 && (
        <section className="mt-14">
          <h2 className="font-heading text-3xl font-bold">{t('home.deals')}</h2>
          <ul className="mt-5 grid grid-cols-[repeat(auto-fill,minmax(min(20rem,100%),1fr))] gap-5">
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
          <ul className="-mx-(--page-pad) mt-5 flex snap-x gap-3 overflow-x-auto px-(--page-pad) pb-2">
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
          <ul className="mt-5 grid grid-cols-cards gap-3">
            {popular.map((item) => (
              <li key={item.id}>
                <ItemCard item={item} onSelect={setSelected} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-14 rounded-card bg-peach px-[clamp(1.25rem,3vw,2.5rem)] py-8">
        <h2 className="font-heading text-3xl font-bold">{t('home.how')}</h2>
        <ol className="mt-6 grid grid-cols-[repeat(auto-fit,minmax(min(16rem,100%),1fr))] gap-6">
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

      <section className="mt-14 grid grid-cols-[repeat(auto-fit,minmax(min(16rem,100%),1fr))] gap-10">
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
          <div className="mt-3">
            <OpeningHoursList hours={hours} />
          </div>
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
