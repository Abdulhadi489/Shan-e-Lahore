import aboutLarge from './banner-about.webp'
import aboutSmall from './banner-about-800.webp'
import cartLarge from './banner-cart.webp'
import cartSmall from './banner-cart-800.webp'
import contactLarge from './banner-contact.webp'
import contactSmall from './banner-contact-800.webp'
import menuLarge from './banner-menu.webp'
import menuSmall from './banner-menu-800.webp'
import privacyLarge from './banner-privacy.webp'
import privacySmall from './banner-privacy-800.webp'
import termsLarge from './banner-terms.webp'
import termsSmall from './banner-terms-800.webp'

// Each banner is the restaurant's own photo in two sizes: 1600 px wide and 800 px wide for phones.
// To change one, replace its two files here keeping the names (crop 1600 x 450 and 800 x 225, WebP, small file).
export type Banner = { large: string; small: string }

export const banners = {
  about: { large: aboutLarge, small: aboutSmall },
  cart: { large: cartLarge, small: cartSmall },
  contact: { large: contactLarge, small: contactSmall },
  menu: { large: menuLarge, small: menuSmall },
  // Terms and privacy: crops of the spices photo and the rice photo; contact: a crop of the naan photo.
  privacy: { large: privacyLarge, small: privacySmall },
  terms: { large: termsLarge, small: termsSmall },
} satisfies Record<string, Banner>
