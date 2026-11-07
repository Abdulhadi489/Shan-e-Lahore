import topVideo from '../../assets/topvideo.mp4'
import topVideoMobile from '../../assets/topvideo-mobile.mp4'

// Visitors who ask for less motion or for less data (Save-Data) get the poster instead of the video; phones get a
// smaller 540p copy of it (under 1 MB instead of 5 MB).
const saveData = Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData)
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches || saveData
const video = window.matchMedia('(max-width: 767px)').matches ? topVideoMobile : topVideo

// Decorative: the shop's video filling the hero behind the headline. The poster shows until the video plays,
// stays if autoplay is blocked, and replaces the video for the visitors above. The dark wash
// (espresso, heavier at the top and bottom) keeps the cream text readable on bright frames.
export function HeroVideo({ poster }: { poster: string | undefined }) {
  return (
    <div aria-hidden className="absolute inset-0 -z-10 bg-espresso">
      {reducedMotion ? (
        poster && <img src={poster} alt="" className="size-full object-cover" />
      ) : (
        <video src={video} poster={poster} autoPlay muted loop playsInline preload="metadata" className="size-full object-cover" />
      )}
      <div className="absolute inset-0 bg-linear-to-b from-ink/55 via-ink/35 to-ink/75" />
    </div>
  )
}
