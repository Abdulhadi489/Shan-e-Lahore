import { lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { MapPin, PhoneCall } from 'lucide-react'
import { localized } from '../../i18n'
import { phoneLabel } from '../../lib/format'
import { useBranch } from '../../app/useBranch'
import { OpeningHoursList } from '../../app/OpeningHoursList'

const DeliveryAreaMap = lazy(() => import('../checkout/LocationPicker').then((module) => ({ default: module.DeliveryAreaMap })))

// Address, phone, hours and the pin all come from the database, so they stay right when the Super Admin changes them.
export function ContactPage() {
  const { t, i18n } = useTranslation()
  const lng = i18n.language
  const branch = useBranch()
  const b = branch.data
  const whatsapp = b?.branch_settings?.whatsapp_number

  return (
    <>
      <title>{`${t('pages.contact')} · ${t('brand')}`}</title>
      <h1 className="font-heading text-3xl font-bold">{t('pages.contact')}</h1>
      <p className="mt-2 max-w-[65ch]">{t('info.contactIntro')}</p>
      {branch.isError && <p role="alert" className="mt-4">{t('menu.error')}</p>}

      {b && (
        <div className="mt-6 grid gap-8 md:grid-cols-2">
          <div className="flex flex-col gap-6">
            <section>
              <h2 className="font-heading text-xl font-bold">{t('info.address')}</h2>
              <p className="mt-1 flex gap-2">
                <MapPin aria-hidden className="mt-1 size-5 shrink-0 text-brand-deep" />
                {localized(lng, b.address_en, b.address_ur)}
              </p>
            </section>
            <section>
              <h2 className="font-heading text-xl font-bold">{t('info.phone')}</h2>
              <a href={`tel:+${b.phone}`} className="mt-1 flex items-center gap-2 font-bold text-brand-deep underline">
                <PhoneCall aria-hidden className="size-5" />
                <span dir="ltr">{phoneLabel(b.phone)}</span>
              </a>
              {whatsapp && (
                <a href={`https://wa.me/${encodeURIComponent(whatsapp)}`} className="mt-2 inline-block font-bold text-brand-deep underline">
                  {t('info.whatsapp')} <span dir="ltr">{phoneLabel(whatsapp)}</span>
                </a>
              )}
            </section>
            <section>
              <h2 className="font-heading text-xl font-bold">{t('info.hours')}</h2>
              <div className="mt-1 max-w-sm">
                <OpeningHoursList hours={b.opening_hours} />
              </div>
            </section>
          </div>
          <section>
            <h2 className="font-heading text-xl font-bold">{t('info.map')}</h2>
            <div className="mt-2">
              <Suspense fallback={<p className="text-sm text-ink-muted">{t('home.mapLoading')}</p>}>
                <DeliveryAreaMap branch={{ lat: Number(b.lat), lng: Number(b.lng) }} radiusKm={0} zoom={15} />
              </Suspense>
            </div>
          </section>
        </div>
      )}
    </>
  )
}
