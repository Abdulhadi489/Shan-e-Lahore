import type { ReactNode } from 'react'
import { PageTitle } from '../app/PageTitle'

// Small dotted gold rule between the sections of a banner page, echoing the dotted edge of the footer.
export function PanelDivider() {
  return <div aria-hidden className="mx-auto my-8 w-20 border-t-4 border-dotted border-gold" />
}

// About, contact, terms and privacy: a full-width photo under the header with the page title centred on it, then one
// cream panel, overlapping the photo a little, for the text. The photo is decoration (the title says what the page
// is), so it has no alt text. `urdu` adds the Urdu name beside the title, as on the other pages.
export function PageBanner({ image, title, urdu, children }: { image: string; title: string; urdu?: string; children: ReactNode }) {
  return (
    <>
      <div className="relative isolate -mx-(--page-pad) -mt-6 flex h-40 items-center justify-center overflow-hidden px-(--page-pad) text-center md:h-65">
        <img src={image} alt="" width={1600} height={450} className="absolute inset-0 -z-10 size-full object-cover" />
        <div aria-hidden className="absolute inset-0 -z-10 bg-linear-to-b from-espresso/55 via-brand-deep/60 to-espresso/80" />
        {/* The shadow keeps the cream title readable on the photo's lightest parts, as on the Home hero. */}
        <div className="text-raised [text-shadow:0_2px_16px_var(--color-ink)] [&_h1]:justify-center [&_span]:text-peach">
          {urdu ? (
            <PageTitle title={title} urdu={urdu} />
          ) : (
            <h1 className="font-heading text-[clamp(2.25rem,1.75rem+2vw,3.5rem)] leading-tight font-semibold rtl:leading-[1.9]">{title}</h1>
          )}
        </div>
      </div>
      <div className="surface-panel relative mx-auto -mt-10 max-w-[760px] px-5 py-8 text-center text-base sm:px-10 sm:py-10 ltr:leading-[1.7]">
        {children}
      </div>
    </>
  )
}
