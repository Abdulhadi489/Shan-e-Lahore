import { ArchFrame } from '../../components/ArchFrame'
import topVideo from '../../assets/topvideo.mp4'

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Decorative: the shop's video inside the arch beside the headline. The poster shows until the video plays,
// stays if autoplay is blocked, and replaces the video for visitors who prefer less motion. Without a poster
// the arch is plain orange.
export function HeroVideo({ poster }: { poster: string | undefined }) {
  return (
    <div aria-hidden className="mx-auto w-[min(100%,360px)] shrink-0">
      <ArchFrame>
        {reducedMotion ? (
          poster && <img src={poster} alt="" className="size-full object-cover" />
        ) : (
          <video src={topVideo} poster={poster} autoPlay muted loop playsInline preload="metadata" className="size-full object-cover" />
        )}
        <div className="absolute inset-x-0 bottom-0 h-1/3 bg-linear-to-t from-ink/45 to-transparent" />
      </ArchFrame>
    </div>
  )
}
