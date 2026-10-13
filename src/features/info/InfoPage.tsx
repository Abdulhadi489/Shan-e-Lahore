import { useTranslation } from 'react-i18next'

type Section = { heading: string; body: string }

// About, terms, privacy and refund policy: plain text sections from the dictionaries.
export function InfoPage({ page }: { page: 'about' | 'terms' | 'privacy' | 'refund' }) {
  const { t } = useTranslation()
  const title = t(`pages.${page}`)
  const sections = t(`info.${page}`, { returnObjects: true }) as Section[]
  return (
    <article className="max-w-[65ch]">
      <title>{`${title} · ${t('brand')}`}</title>
      <h1 className="font-heading text-3xl font-bold">{title}</h1>
      {sections.map((section, index) => (
        <section key={index} className="mt-5">
          {section.heading && <h2 className="font-heading text-xl font-bold">{section.heading}</h2>}
          <p className="mt-1">{section.body}</p>
        </section>
      ))}
    </article>
  )
}
