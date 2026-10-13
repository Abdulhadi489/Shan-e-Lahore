import type { ReactNode } from 'react'
import type { ParseKeys } from 'i18next'
import { useTranslation } from 'react-i18next'

// Title-only page; each one is replaced by its real feature page in Milestone 2.
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
