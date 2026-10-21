import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { PageBanner, PanelDivider } from '../../components/PageBanner'
import about from '../../assets/banners/about.webp'
import privacy from '../../assets/banners/privacy.webp'
import terms from '../../assets/banners/terms.webp'

type Section = { heading: string; body: string }

// To change a banner photo, replace its file in src/assets/banners keeping the name (credits: IMAGE_CREDITS.md).
const banners = { about, terms, privacy }

// About, terms and privacy: the banner, then the dictionary's sections stacked in one centred panel.
export function InfoPage({ page }: { page: 'about' | 'terms' | 'privacy' }) {
  const { t } = useTranslation()
  const title = t(`pages.${page}`)
  const sections = t(`info.${page}`, { returnObjects: true }) as Section[]
  return (
    <>
      <title>{`${title} · ${t('brand')}`}</title>
      <PageBanner image={banners[page]} title={title}>
        {sections.map((section, index) => (
          <Fragment key={index}>
            {index > 0 && <PanelDivider />}
            <section>
              {section.heading && <h2 className="font-heading text-2xl font-semibold">{section.heading}</h2>}
              <p className={section.heading ? 'mt-2' : ''}>{section.body}</p>
            </section>
          </Fragment>
        ))}
      </PageBanner>
    </>
  )
}
