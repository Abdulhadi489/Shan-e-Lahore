import { useTranslation } from 'react-i18next'

// Page heading with the page's Urdu name beside it, like the shop's bilingual signboard. The Urdu comes from
// ur.json; in Urdu the heading is already Urdu, so the second name is left out.
export function PageTitle({ title, urdu }: { title: string; urdu: string }) {
  const { i18n } = useTranslation()
  return (
    <h1 className="flex flex-wrap items-baseline gap-x-4 font-heading text-[clamp(2.25rem,1.75rem+2vw,3.5rem)] leading-tight font-semibold rtl:leading-[1.9]">
      {title}
      {i18n.language !== 'ur' && (
        <span lang="ur" dir="rtl" className="font-[Noto_Nastaliq_Urdu] text-[0.6em] leading-[2] font-normal text-brand-deep">
          {urdu}
        </span>
      )}
    </h1>
  )
}
