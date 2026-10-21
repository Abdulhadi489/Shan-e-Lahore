import { lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { MapPin, PhoneCall } from 'lucide-react'
import { localized } from '../../i18n'
import { phoneLabel } from '../../lib/format'
import { useBranch } from '../../app/useBranch'
import { OpeningHoursList } from '../../app/OpeningHoursList'
import { ArchFrame } from '../../components/ArchFrame'
import { PageBanner, PanelDivider } from '../../components/PageBanner'
import banner from '../../assets/banners/contact.webp'

const DeliveryAreaMap = lazy(() => import('../checkout/LocationPicker').then((module) => ({ default: module.DeliveryAreaMap })))

// Address, phone, hours and the pin all come from the database, so they stay right when the Super Admin changes them.
export function ContactPage() {
  const { t, i18n } = useTranslation()
  const lng = i18n.language
  const branch = useBranch()
  const b = branch.data
  const whatsapp = b?.branch_settings?.whatsapp_number

  // Small dark-orange labels over each detail, like a printed menu card.
  const label = 'text-sm font-medium text-brand-deep ltr:uppercase ltr:tracking-[0.18em]'

  return (
    <>
      <title>{`${t('pages.contact')} · ${t('brand')}`}</title>
      <PageBanner image={banner} title={t('pages.contact')} urdu={t('pages.contact', { lng: 'ur' })}>
        <p>{t('info.contactIntro')}</p>
        {branch.isError && <p role="alert" className="mt-4">{t('menu.error')}</p>}

        {b && (
          <>
            <PanelDivider />
            <section>
              <h2 className={label}>{t('info.address')}</h2>
              <p className="mt-2 flex justify-center gap-2">
                <MapPin aria-hidden className="mt-1 size-5 shrink-0 text-brand-deep" />
                {localized(lng, b.address_en, b.address_ur)}
              </p>
            </section>
            <PanelDivider />
            <section>
              <h2 className={label}>{t('info.hours')}</h2>
              <div className="mx-auto mt-2 w-full max-w-xs">
                <OpeningHoursList hours={b.opening_hours} />
              </div>
            </section>
            <PanelDivider />
            <section>
              <h2 className={label}>{t('info.phone')}</h2>
              <div className="mt-3 flex flex-wrap justify-center gap-3">
                <a href={`tel:+${b.phone}`} className="flex min-h-12 items-center gap-2 rounded-full bg-brand px-6 font-medium hover:bg-peach">
                  <PhoneCall aria-hidden className="size-5" />
                  <span dir="ltr">{phoneLabel(b.phone)}</span>
                </a>
                {whatsapp && (
                  <a href={`https://wa.me/${encodeURIComponent(whatsapp)}`} className="flex min-h-12 items-center gap-2 rounded-full border border-ink px-6 font-medium hover:bg-raised">
                    {t('info.whatsapp')} <span dir="ltr">{phoneLabel(whatsapp)}</span>
                  </a>
                )}
              </div>
            </section>
            <PanelDivider />
            <section>
              <h2 className={label}>{t('info.map')}</h2>
              <div className="mt-3">
                <ArchFrame>
                  <Suspense fallback={<p className="p-6 pt-24 text-center text-sm">{t('home.mapLoading')}</p>}>
                    <DeliveryAreaMap branch={{ lat: Number(b.lat), lng: Number(b.lng) }} radiusKm={0} zoom={15} boxClass="h-full" />
                  </Suspense>
                </ArchFrame>
              </div>
            </section>
          </>
        )}
      </PageBanner>
    </>
  )
}
