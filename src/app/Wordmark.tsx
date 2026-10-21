import { useId } from 'react'
import { useTranslation } from 'react-i18next'

// The "O" of the signboard: a ring with a fork and a spoon inside, drawn here (no logo file exists yet).
function ForkSpoonO() {
  return (
    <svg aria-hidden viewBox="0 0 24 24" className="mx-[0.04em] inline-block size-[0.82em] align-[-0.06em]">
      <g fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="10.4" strokeWidth="2.4" />
        <path d="M7.6 5.6v3.8M9.2 5.6v3.8M10.8 5.6v3.8M7.6 9.4q0 2 1.6 2t1.6-2M9.2 11.4v7.2" strokeWidth="1.3" />
        <path d="M15 10.8v7.8" strokeWidth="1.3" />
      </g>
      <ellipse cx="15" cy="8" rx="1.9" ry="2.8" fill="currentColor" />
    </svg>
  )
}

// The round emblem from the restaurant's logo, redrawn: an orange ring with the name above and
// "RESTAURANT" below between two stars, and the Urdu name in the centre. The ring texts are part of the
// mark (like a printed logo), so they stay the same in both languages. A cream edge keeps it visible on the
// orange bar.
function Emblem() {
  const { t } = useTranslation()
  const id = useId().replace(/\W/g, '')
  return (
    <svg aria-hidden viewBox="0 0 100 100" className="size-12 shrink-0 sm:size-15">
      <defs>
        <path id={`${id}-top`} d="M13 50A37 37 0 0 1 87 50" />
        <path id={`${id}-bottom`} d="M6.5 50A43.5 43.5 0 0 0 93.5 50" />
      </defs>
      <circle cx="50" cy="50" r="48" className="fill-brand stroke-raised" strokeWidth="2.5" />
      <circle cx="50" cy="50" r="31.5" className="fill-raised" />
      <g className="fill-raised font-[Cormorant_Garamond] font-semibold" fontSize="11.5" letterSpacing="0.6">
        <text textAnchor="middle">
          <textPath href={`#${id}-top`} startOffset="50%">
            {t('brand', { lng: 'en' }).toUpperCase()}
          </textPath>
        </text>
        <text textAnchor="middle" fontSize="9.5" letterSpacing="1">
          <textPath href={`#${id}-bottom`} startOffset="50%">
            RESTAURANT
          </textPath>
        </text>
        <text x="11" y="64" fontSize="8" textAnchor="middle">★</text>
        <text x="89" y="64" fontSize="8" textAnchor="middle">★</text>
      </g>
      <text x="50" y="58" textAnchor="middle" fontSize="15" className="fill-brand font-[Noto_Nastaliq_Urdu]">
        {t('brand', { lng: 'ur' })}
      </text>
    </svg>
  )
}

// Header brand: the round emblem, then the name. In English the name is styled after the shop's signboard
// (heavy capitals with the fork-and-spoon "O"); in Urdu it is the Urdu name in Nastaliq.
export function Wordmark() {
  const { t, i18n } = useTranslation()
  const brand = t('brand')
  // The last "o" of the name becomes the fork-and-spoon ring.
  const o = brand.toLowerCase().lastIndexOf('o')

  return (
    <span className="flex items-center gap-3">
      <Emblem />
      {i18n.language === 'ur' ? (
        <span className="font-heading text-2xl sm:text-3xl">{brand}</span>
      ) : (
        <span className="font-[Jost] text-[22px] leading-none font-extrabold tracking-[0.03em] text-raised uppercase sm:text-[28px]">
          {o < 0 ? brand : (
            <>
              {brand.slice(0, o)}
              <ForkSpoonO />
              {brand.slice(o + 1)}
            </>
          )}
        </span>
      )}
    </span>
  )
}
