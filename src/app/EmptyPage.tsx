import type { ReactNode } from 'react'
import type { ParseKeys } from 'i18next'
import { useTranslation } from 'react-i18next'

// A heading with optional content; used for "page not found".
export function EmptyPage({ title, children }: { title: ParseKeys; children?: ReactNode }) {
  const { t } = useTranslation()
  const heading = t(title)
  return (
    <>
      <title>{`${heading} · ${t('brand')}`}</title>
      <h1 className="font-heading text-3xl font-bold">{heading}</h1>
      {children}
    </>
  )
}
