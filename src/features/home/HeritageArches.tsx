import { useTranslation } from 'react-i18next'

// The three arches from the printed menu and the shop's signboard, left to right as printed. The words are part
// of the artwork (like a painted sign), so they stay in Urdu in both languages; screen readers get home.archesAlt.
const words = ['ثقافت', 'اپنائیت', 'روایت']

// An ogee arch with a finial dot, in a 300 x 130 box.
const ARCH = 'M2 130V78C2 44 112 36 150 4C188 36 298 44 298 78V130'

// Full-width orange band right under the lace trim: carved jaali lattice in the orange, three peach arches on top.
export function HeritageArches() {
  const { t } = useTranslation()
  return (
    <div role="img" aria-label={t('home.archesAlt')} className="relative -mx-(--page-pad) -mt-6 overflow-hidden bg-brand">
      <svg aria-hidden className="absolute inset-0 size-full text-brand-deep">
        <defs>
          {/* Diamond lattice with a small rosette at each crossing, like carved jaali screens. */}
          <pattern id="jaali" width="28" height="28" patternUnits="userSpaceOnUse">
            <path d="M14 0L28 14L14 28L0 14Z" fill="none" stroke="currentColor" strokeWidth="1.2" />
            <circle cx="14" cy="14" r="3.2" fill="none" stroke="currentColor" strokeWidth="1.2" />
            <circle cx="0" cy="0" r="1.6" fill="currentColor" />
            <circle cx="28" cy="0" r="1.6" fill="currentColor" />
            <circle cx="0" cy="28" r="1.6" fill="currentColor" />
            <circle cx="28" cy="28" r="1.6" fill="currentColor" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#jaali)" />
      </svg>

      <div dir="ltr" className="relative flex items-end justify-evenly gap-2 px-(--page-pad) pt-4 sm:pt-6">
        {words.map((word) => (
          <div key={word} className="relative aspect-[300/130] w-[min(31%,22rem)]">
            <svg aria-hidden viewBox="0 0 300 130" className="absolute inset-0 size-full overflow-visible">
              <path d={`${ARCH}Z`} className="fill-peach" />
              <path d={ARCH} fill="none" className="stroke-espresso" strokeWidth="3" vectorEffect="non-scaling-stroke" />
              <circle cx="150" cy="18" r="5" className="fill-espresso" />
            </svg>
            <span
              lang="ur"
              dir="rtl"
              className="absolute inset-x-0 bottom-[6%] text-center font-[Noto_Nastaliq_Urdu] text-[clamp(1.125rem,4.2vw,3rem)] leading-[1.9] text-espresso"
            >
              {word}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
