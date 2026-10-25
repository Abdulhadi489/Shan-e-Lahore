import { useTranslation } from 'react-i18next'
import { Mail, MapPin, PhoneCall } from 'lucide-react'
import { localized } from '../i18n'
import { phoneLabel } from '../lib/format'
import { InstagramIcon, social, TikTokIcon } from '../components/SocialIcons'
import { OpeningHoursList } from './OpeningHoursList'
import { useBranch } from './useBranch'

// Find us and opening hours, shown above the footer on every customer page (CustomerLayout).
// Everything comes from the database through useBranch, so it stays right when the Super Admin changes it.
export function InfoPanel() {
  const { t, i18n } = useTranslation()
  const lng = i18n.language
  const branch = useBranch()

  const settings = branch.data?.branch_settings
  const hours = branch.data?.opening_hours ?? []

  // The top gap and the main column's bottom padding together make the 5 rem the panel had on the Home page.
  return (
    <div className="mx-auto w-full max-w-[120rem] px-(--page-pad) pt-14 pb-6">
      {/* One off-white panel so the skyline never shows through; dividers run between the columns (stacked on phones). */}
      <section className="surface-panel flex flex-col divide-y divide-line md:flex-row md:divide-x md:divide-y-0">
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
              <div className="mt-2 flex flex-col items-start">
                {([['instagram', InstagramIcon], ['tiktok', TikTokIcon]] as const).map(([name, Icon]) => (
                  <a
                    key={name}
                    href={social[name].url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`${t(`info.${name}`)} ${social[name].handle}`}
                    className="inline-flex min-h-11 items-center gap-2 text-ink underline"
                  >
                    <Icon className="size-5 shrink-0 text-brand-deep" />
                    <span dir="ltr">{social[name].handle}</span>
                  </a>
                ))}
                <a href={`mailto:${social.email}`} className="inline-flex min-h-11 items-center gap-2 text-ink underline">
                  <Mail aria-hidden className="size-5 shrink-0 text-brand-deep" />
                  <span dir="ltr" className="break-all">{social.email}</span>
                </a>
              </div>
            </>
          )}
        </div>

        <div className="min-w-0 flex-1 py-6 first:pt-0 last:pb-0 md:px-8 md:py-0 md:first:ps-0 md:last:pe-0">
          <h2 className="font-heading text-xl font-semibold text-ink">{t('home.hours')}</h2>
          <div className="mt-3 text-ink-muted">
            <OpeningHoursList hours={hours} />
          </div>
        </div>
      </section>
    </div>
  )
}
