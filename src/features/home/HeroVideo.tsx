import topVideo from '../../assets/topvideo.mp4'

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Decorative: the shop's video filling the hero behind the headline. The poster shows until the video plays,
// stays if autoplay is blocked, and replaces the video for visitors who prefer less motion. The dark wash
// (espresso, heavier at the top and bottom) keeps the cream text readable on bright frames.
export function HeroVideo({ poster }: { poster: string | undefined }) {
  return (
    <div aria-hidden className="absolute inset-0 -z-10 bg-espresso">
      {reducedMotion ? (
        poster && <img src={poster} alt="" className="size-full object-cover" />
      ) : (
        <video src={topVideo} poster={poster} autoPlay muted loop playsInline preload="metadata" className="size-full object-cover" />
      )}
      <div className="absolute inset-0 bg-linear-to-b from-ink/55 via-ink/35 to-ink/75" />
    </div>
  )
}
