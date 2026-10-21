import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { useTranslation } from 'react-i18next'
import { PhoneCall } from 'lucide-react'
import { useCart } from '../features/checkout/cart'
import { phoneLabel } from '../lib/format'
import laceBand from '../assets/lace-folk-band.webp'
import { CartBar } from './CartBar'
import { SkylineBackdrop } from './SkylineBackdrop'
import { Wordmark } from './Wordmark'
import { useBranch } from './useBranch'
import { useHeaderHeight } from './useHeaderHeight'

export const infoPages = [
  { path: 'about', title: 'pages.about' },
  { path: 'contact', title: 'pages.contact' },
  { path: 'terms', title: 'pages.terms' },
  { path: 'privacy', title: 'pages.privacy' },
] as const

export const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? 'font-bold text-brand-deep underline underline-offset-4' : 'hover:text-brand-deep'

function LanguageSwitch() {
  const { t, i18n } = useTranslation()
  const other = i18n.language === 'ur' ? 'en' : 'ur'
  return (
    <button
      type="button"
      lang={other}
      onClick={() => void i18n.changeLanguage(other)}
      className="flex h-12 min-w-12 shrink-0 items-center justify-center rounded-full border border-ink px-3 hover:bg-surface/50"
    >
      {t('languageName', { lng: other })}
    </button>
  )
}

// Header pills sit on orange, where only espresso text passes contrast; the active page is a cream pill.
const pillClass = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-11 min-w-11 items-center justify-center rounded-full px-3 text-sm font-medium ltr:uppercase ltr:tracking-[0.08em] sm:px-4 ltr:sm:tracking-[0.15em] ${isActive ? 'bg-surface' : 'hover:bg-surface/50'}`

const footerLinkClass = ({ isActive }: { isActive: boolean }) =>
  `inline-flex min-h-11 items-center ${isActive ? 'font-medium underline underline-offset-4' : 'hover:underline'}`

// Folk-art border of flowers and birds under the header. The tile is exactly one repeat of the band, so it
// repeats sideways without a seam; it is scaled to the strip's height.
function LaceTrim() {
  return (
    <div
      aria-hidden
      className="h-10 w-full bg-repeat-x bg-[length:auto_100%] sm:h-14"
      style={{ backgroundImage: `url(${laceBand})` }}
    />
  )
}

export function CustomerLayout() {
  const { t, i18n } = useTranslation()
  const cartCount = useCart().reduce((sum, line) => sum + line.quantity, 0)
  const header = useHeaderHeight()
  const phone = useBranch().data?.phone
  const { pathname } = useLocation()
  // Not where the cart already is, or where the order is placed or followed.
  const showCartBar = cartCount > 0 && pathname !== '/cart' && pathname !== '/checkout' && !pathname.startsWith('/track/')

  const phoneLink = phone && (
    <a href={`tel:+${phone}`} className="flex min-h-11 items-center gap-2 rounded-full bg-raised px-4 font-medium ltr:tracking-[0.08em]">
      <PhoneCall aria-hidden className="size-4 text-brand-deep" />
      <span dir="ltr">{phoneLabel(phone)}</span>
    </a>
  )

  return (
    <div className="heritage flex min-h-dvh flex-col text-ink">
      <SkylineBackdrop />

      {/* Spans the whole window like a shop's top bar and stays visible; the page below stays in the reading column.
          The lace trim is inside so sticky parts of the page stop below it. */}
      <header ref={header} className="sticky top-0 z-20 [&_:focus-visible]:outline-ink">
        <div className="flex min-h-[76px] flex-wrap items-center gap-x-4 gap-y-2 bg-brand px-(--page-pad) py-3">
          <Link to="/" aria-label={t('brand')} className="inline-flex min-h-11 items-center">
            <Wordmark />
          </Link>
          <nav aria-label={t('nav.main')} className="ms-auto flex items-center gap-1">
            <NavLink to="/" end className={pillClass}>
              {t('nav.home')}
            </NavLink>
            <NavLink to="/menu" className={pillClass}>
              {t('nav.menu')}
            </NavLink>
            <NavLink to="/cart" className={pillClass}>
              {t('nav.cart')}
              {cartCount > 0 && (
                <span className="ms-1 rounded-full bg-ink px-2 text-sm font-medium text-surface">{cartCount}</span>
              )}
            </NavLink>
          </nav>
          <LanguageSwitch />
          {/* The phone is in the hero and footer too; on phones the bar keeps to one row without it. */}
          <div className="hidden sm:block">{phoneLink}</div>
        </div>
        <LaceTrim />
      </header>

      <main className="mx-auto w-full max-w-[120rem] flex-1 px-(--page-pad) py-6">
        <Outlet />
      </main>

      {/* Extra room at the bottom while the cart bar floats there, so it never covers the footer links. */}
      <footer className={`border-t-8 border-dotted border-gold bg-brand [&_:focus-visible]:outline-ink ${showCartBar ? 'pb-24' : ''}`}>
        <div className="mx-auto flex min-h-16 max-w-[120rem] flex-wrap items-center gap-x-6 gap-y-2 px-(--page-pad) py-3">
          <Link to="/" className="inline-flex min-h-11 items-center gap-3 font-heading text-xl font-semibold ltr:uppercase ltr:tracking-[0.12em]">
            {t('brand')}
            {i18n.language !== 'ur' && (
              <span lang="ur" className="font-[Noto_Nastaliq_Urdu] text-base font-normal tracking-normal normal-case">{t('brand', { lng: 'ur' })}</span>
            )}
          </Link>
          <nav aria-label={t('nav.info')} className="flex flex-wrap gap-x-5">
            {infoPages.map((page) => (
              <NavLink key={page.path} to={`/${page.path}`} className={footerLinkClass}>
                {t(page.title)}
              </NavLink>
            ))}
          </nav>
          <div className="ms-auto">{phoneLink}</div>
        </div>
      </footer>
      {showCartBar && <CartBar />}
    </div>
  )
}
