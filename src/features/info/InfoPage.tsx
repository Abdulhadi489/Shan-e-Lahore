import { Fragment } from 'react'
import { useTranslation } from 'react-i18next'
import { PageBanner, PanelDivider } from '../../components/PageBanner'
import { banners } from '../../assets/banners/banners'

type Section = { heading: string; body: string }


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
              {/* Justified from 640 px up (the html lang lets the browser hyphenate English); centred on phones, where justified lines leave wide gaps. */}
              <p className={`${section.heading ? 'mt-2 ' : ''}text-center hyphens-auto [text-align-last:center] sm:text-justify`}>{section.body}</p>
            </section>
          </Fragment>
        ))}
      </PageBanner>
    </>
  )
}
