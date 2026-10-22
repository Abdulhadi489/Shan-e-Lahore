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
      {/* Full-width hero right under the lace, the shop video behind centred text. */}
      <div className="relative isolate -mx-(--page-pad) -mt-6 flex min-h-[max(560px,min(720px,85svh))] items-center justify-center overflow-hidden px-(--page-pad) py-16 text-center">
        <HeroVideo poster={heroDish?.image_path ? menuImageUrl(heroDish.image_path, 'full') : undefined} />
        <section className="flex w-full flex-col items-center">
          {/* Only shown when closed (the spec's "Closed now, opens at …"); nothing is said while open. */}
          {status && !status.open && (
            <p className="inline-flex items-center gap-2 rounded-full bg-raised px-3 py-1 text-sm font-medium text-danger ring-1 ring-line">
              <span aria-hidden className="size-2 rounded-full bg-danger" />
              {!status.opensAt
                ? t('home.closed')
                : status.opensAt.weekday === today
                  ? t('home.closedOpensToday', { time: timeLabel(lng, status.opensAt.time) })
                  : t('home.closedOpensOn', { day: dayLabel(lng, status.opensAt.weekday), time: timeLabel(lng, status.opensAt.time) })}
            </p>
          )}

          {/* The shadow keeps the cream text readable on the video's brightest frames. */}
          <h1 className="mt-4 max-w-[1100px] font-heading ltr:font-medium ltr:tracking-[0.03em] text-balance text-[clamp(2.25rem,1.4rem+3vw,4.5rem)] leading-[1.1] font-semibold text-raised [text-shadow:0_2px_16px_var(--color-ink)] rtl:text-[clamp(1.875rem,1.25rem+2vw,3.75rem)] rtl:leading-snug">
            <span className="block">{t('home.headline')}</span>
            <span className="block">{t('home.headlineLast')}</span>
          </h1>
          <p className="mt-4 max-w-[560px] ltr:font-[Montserrat_Variable] text-[clamp(0.875rem,0.8rem+0.25vw,1rem)] text-surface [text-shadow:0_1px_10px_var(--color-ink)]">
            {t('home.subhead')}
          </p>
          {settings && !settings.delivery_enabled && (
            <p className="mt-3 rounded-full bg-raised px-3 py-1 font-medium text-danger">{t('home.deliveryPaused')}</p>
          )}

          <div className="mt-8 flex w-full flex-col items-stretch gap-3 sm:w-auto sm:flex-row sm:justify-center">
            <Link
              to="/menu"
              className="flex min-h-12 items-center justify-center gap-2 rounded-control bg-brand px-6 font-medium text-ink hover:bg-brand-deep hover:text-raised active:scale-[0.98]"
            >
              {t('home.order')}
              <ArrowRight aria-hidden className="size-5 rtl:-scale-x-100" />
            </Link>
            {branch.data && (
              <a
                href={`tel:+${branch.data.phone}`}
                className="flex min-h-12 items-center justify-center gap-2 rounded-control border-2 border-raised bg-ink/45 px-6 font-medium text-raised hover:bg-ink/65 active:scale-[0.98]"
              >
                <PhoneCall aria-hidden className="size-5" />
                <span dir="ltr">{phoneLabel(branch.data.phone)}</span>
              </a>
            )}
          </div>
        </section>
      </div>

      {/* Sits on the cream page under the video, over the faint masjid sketch, so nothing overlaps the footage. Artwork
          like the shop's signboard, so the words stay Urdu in both languages. */}
      <div lang="ur" dir="rtl" className="-mx-(--page-pad) mt-10 flex items-center justify-between px-(--page-pad) font-[Amiri] text-[clamp(1.5rem,1.1rem+1.6vw,2.5rem)] leading-[1.8] text-gold/75">
        <span>ثقافت</span>
        <span>اپنائیت</span>
        <span>روایت</span>
      </div>

      {/* The admin's home banner or featured dish follows the hero. */}
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

      {/* One off-white panel so the skyline never shows through; dividers run between the columns (stacked on phones). */}
      <section className="surface-panel mt-20 flex flex-col divide-y divide-line md:flex-row md:divide-x md:divide-y-0">
        <div className="min-w-0 flex-1 py-6 first:pt-0 last:pb-0 md:px-8 md:py-0 md:first:ps-0 md:last:pe-0">
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

        <div className="min-w-0 flex-1 py-6 first:pt-0 last:pb-0 md:px-8 md:py-0 md:first:ps-0 md:last:pe-0">
          <h2 className="font-heading text-xl font-semibold text-ink">{t('home.hours')}</h2>
          <div className="mt-3 text-ink-muted">
            <OpeningHoursList hours={hours} />
          </div>
        </div>

        {tiers.length > 0 && (
          <div className="min-w-0 flex-1 py-6 first:pt-0 last:pb-0 md:px-8 md:py-0 md:first:ps-0 md:last:pe-0">
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