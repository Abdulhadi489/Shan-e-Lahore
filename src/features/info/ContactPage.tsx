import { lazy, Suspense } from 'react'
import { useTranslation } from 'react-i18next'
import { Mail, MapPin, PhoneCall } from 'lucide-react'
import { localized } from '../../i18n'
import { phoneLabel } from '../../lib/format'
import { useBranch } from '../../app/useBranch'
import { OpeningHoursList } from '../../app/OpeningHoursList'
import { ArchFrame } from '../../components/ArchFrame'
import { PageBanner, PanelDivider } from '../../components/PageBanner'
import { InstagramIcon, social, TikTokIcon } from '../../components/SocialIcons'
import { banners } from '../../assets/banners/banners'

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
      <PageBanner image={banners.contact} title={t('pages.contact')}>
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
              <h2 className={label}>{t('info.follow')}</h2>
              <div className="mt-3 flex flex-wrap justify-center gap-3">
                {([['instagram', InstagramIcon], ['tiktok', TikTokIcon]] as const).map(([name, Icon]) => (
                  <a
                    key={name}
                    href={social[name].url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${t(`info.${name}`)} ${social[name].handle}`}
                    className="flex min-h-12 items-center gap-2 rounded-full border border-ink px-6 font-medium hover:bg-raised"
                  >
                    <Icon className="size-5" />
                    <span dir="ltr">{social[name].handle}</span>
                  </a>
                ))}
              </div>
            </section>
            <PanelDivider />
            <section>
              <h2 className={label}>{t('info.email')}</h2>
              <div className="mt-2">
                <a href={`mailto:${social.email}`} className="inline-flex min-h-11 items-center gap-2 text-ink underline">
                  <Mail aria-hidden className="size-5 shrink-0 text-brand-deep" />
                  <span dir="ltr" className="break-all">{social.email}</span>
                </a>
              </div>
            </section>
            <PanelDivider />
            <section>
              <h2 className={label}>{t('info.map')}</h2>
              <div className="mt-3">
                <ArchFrame>
                  <Suspense fallback={<p className="p-6 pt-24 text-center text-sm">{t('home.mapLoading')}</p>}>
                    <DeliveryAreaMap branch={{ lat: Number(b.lat), lng: Number(b.lng) }} zoom={15} boxClass="h-full" />
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
