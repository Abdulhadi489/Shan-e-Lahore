import { useState } from 'react'
import { menuImageUrl } from '../lib/images'

// Arch-topped dish photo for the cart and checkout rows. The picture comes from the menu data by dish id; with no
// photo, or if it fails to load, the espresso arch of the menu cards stands in, so there is never a broken-image icon.
// The photo is decoration (the dish name is beside it), so it has no alt text.
export function DishThumb({ imagePath, className }: { imagePath: string | null | undefined; className: string }) {
  const [failed, setFailed] = useState(false)
  const shape = `${className} shrink-0 rounded-t-full rounded-b-control`
  return imagePath && !failed ? (
    <img
      src={menuImageUrl(imagePath, 'card')}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setFailed(true)}
      className={`${shape} bg-espresso object-cover`}
    />
  ) : (
    <span aria-hidden className={`${shape} bg-linear-to-b from-brand-deep to-espresso`} />
  )
}
