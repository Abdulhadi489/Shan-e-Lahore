import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { useTranslation } from 'react-i18next'
import { Mail, Menu, PhoneCall, ShoppingBag, X } from 'lucide-react'
import { InstagramIcon, social, TikTokIcon } from '../components/SocialIcons'
import { useCart } from '../features/checkout/cart'
import { phoneLabel } from '../lib/format'
import laceBand from '../assets/lace-folk-band.webp'
import { CartBar } from './CartBar'
import { InfoPanel } from './InfoPanel'
import { SkylineBackdrop } from './SkylineBackdrop'
import { Wordmark } from './Wordmark'
import { useBranch } from './useBranch'
import { useHeaderHeight } from './useHeaderHeight'
import { useSiteFonts } from './useSiteFonts'

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

// The same pills as the desktop bar, full width and at least 48 px high inside the mobile menu.
const menuLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-12 w-full items-center justify-start rounded-full px-5 text-sm font-medium ltr:uppercase ltr:tracking-[0.15em] ${isActive ? 'bg-surface' : 'hover:bg-surface/50'}`

const footerLinkClass = ({ isActive }: { isActive: boolean }) =>
  `inline-flex min-h-11 items-center ${isActive ? 'font-medium underline underline-offset-4' : 'hover:underline'}`

// Icon-only footer links: a 44 px tap area with the same hover tint as the language button.
const socialLinkClass = 'flex size-11 items-center justify-center rounded-full hover:bg-surface/50'

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
  const { t } = useTranslation()
  const cartCount = useCart().reduce((sum, line) => sum + line.quantity, 0)
  const header = useHeaderHeight()
  const phone = useBranch().data?.phone
  useSiteFonts()
  const { pathname } = useLocation()
  // Not where the cart already is, or where the order is placed or followed.
  const showCartBar = cartCount > 0 && pathname !== '/cart' && pathname !== '/checkout' && !pathname.startsWith('/track/')

  // Mobile menu: open for the page it was opened on, so any route change closes it without extra code.
  const [openAt, setOpenAt] = useState<string | null>(null)
  const menuOpen = openAt === pathname
  const toggle = useRef<HTMLButtonElement>(null)
  const panel = useRef<HTMLDivElement>(null)
  const closeMenu = () => {
    setOpenAt(null)
    toggle.current?.focus()
  }

  // While it is open: focus moves in, Escape closes it, the page behind stops scrolling, and widening the window to
  // the desktop bar closes it so the scroll lock cannot be left on.
  useEffect(() => {
    if (!menuOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setOpenAt(null)
      toggle.current?.focus()
    }
    const desktop = window.matchMedia('(min-width: 48rem)')
    const onWide = () => {
      if (desktop.matches) setOpenAt(null)
    }
    document.addEventListener('keydown', onKey)
    desktop.addEventListener('change', onWide)
    document.body.style.overflow = 'hidden'
    panel.current?.querySelector<HTMLElement>('a, button')?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      desktop.removeEventListener('change', onWide)
      document.body.style.overflow = ''
    }
  }, [menuOpen])

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
        <div className="flex min-h-[76px] flex-wrap items-center gap-x-4 gap-y-2 bg-brand px-(--page-pad) py-3 max-md:flex-nowrap max-md:gap-x-2">
          <Link to="/" aria-label={t('brand')} className="inline-flex min-h-11 min-w-0 items-center">
            <Wordmark />
          </Link>
          {/* Below 768 px the links move into the menu; the cart stays one tap away with its count. */}
          <div className="ms-auto flex items-center gap-1 md:hidden">
            <NavLink
              to="/cart"
              className={({ isActive }) => `relative flex size-11 items-center justify-center rounded-full ${isActive ? 'bg-surface' : 'hover:bg-surface/50'}`}
            >
              <ShoppingBag aria-hidden className="size-6" />
              <span className="sr-only">{t('nav.cart')}</span>
              {cartCount > 0 && (
                <span className="absolute -end-1 -top-1 min-w-5 rounded-full bg-ink px-1.5 text-center text-xs leading-5 font-medium text-surface">{cartCount}</span>
              )}
            </NavLink>
            <button
              ref={toggle}
              type="button"
              aria-label={t(menuOpen ? 'nav.closeMenu' : 'nav.openMenu')}
              aria-expanded={menuOpen}
              aria-controls="mobile-menu"
              onClick={() => (menuOpen ? closeMenu() : setOpenAt(pathname))}
              className="flex size-11 items-center justify-center rounded-full hover:bg-surface/50"
            >
              {menuOpen ? <X aria-hidden className="size-6" /> : <Menu aria-hidden className="size-6" />}
            </button>
          </div>
          <nav aria-label={t('nav.main')} className="ms-auto hidden items-center gap-1 md:flex">
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
          <div className="hidden md:block">
            <LanguageSwitch />
          </div>
          {/* The phone is in the hero and footer too; on phones it lives in the menu. */}
          <div className="hidden md:block">{phoneLink}</div>
        </div>
        <LaceTrim />

        {/* Mobile menu: drops in under the lace, full width, scrolls inside if the screen is short. Tapping a link, the
            language button or the dimmed page closes it. */}
        <div hidden={!menuOpen} aria-hidden onClick={closeMenu} className="fixed inset-0 -z-10 bg-ink/40 md:hidden" />
        <div
          id="mobile-menu"
          ref={panel}
          hidden={!menuOpen}
          onClick={(event) => {
            if ((event.target as HTMLElement).closest('a, button')) closeMenu()
          }}
          className="absolute inset-x-0 top-full max-h-[calc(100dvh-var(--header-h))] overflow-y-auto overscroll-contain bg-brand px-(--page-pad) pt-2 pb-5 motion-safe:animate-menu-down md:hidden"
        >
          <nav aria-label={t('nav.main')} className="flex flex-col gap-1">
            <NavLink to="/" end className={menuLinkClass}>
              {t('nav.home')}
            </NavLink>
            <NavLink to="/menu" className={menuLinkClass}>
              {t('nav.menu')}
            </NavLink>
            <NavLink to="/cart" className={menuLinkClass}>
              {t('nav.cart')}
              {cartCount > 0 && <span className="ms-2 rounded-full bg-ink px-2 text-sm font-medium text-surface">{cartCount}</span>}
            </NavLink>
          </nav>
          <div className="mt-3 flex flex-col gap-3">
            <div className="[&>button]:w-full [&>button]:justify-start [&>button]:px-5">
              <LanguageSwitch />
            </div>
            {phoneLink && <div className="[&>a]:min-h-12 [&>a]:w-full [&>a]:px-5">{phoneLink}</div>}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-[120rem] flex-1 px-(--page-pad) py-6">
        <Outlet />
      </main>

      <InfoPanel />

      {/* Extra room at the bottom while the cart bar floats there, so it never covers the footer links. */}
      <footer className={`border-t-8 border-dotted border-gold bg-brand [&_:focus-visible]:outline-ink ${showCartBar ? 'pb-24' : ''}`}>
        <div className="mx-auto flex min-h-16 max-w-[120rem] flex-wrap items-center gap-x-6 gap-y-2 px-(--page-pad) py-3">
          {/* The English wordmark in both languages (no Urdu name here); lang and the fixed font keep it right on Urdu pages. */}
          <Link to="/" lang="en" className="inline-flex min-h-11 items-center font-[Cormorant_Garamond] text-xl font-semibold uppercase tracking-[0.12em]">
            {t('brand', { lng: 'en' })}
          </Link>
          <nav aria-label={t('nav.info')} className="flex flex-wrap gap-x-5">
            {infoPages.map((page) => (
              <NavLink key={page.path} to={`/${page.path}`} className={footerLinkClass}>
                {t(page.title)}
              </NavLink>
            ))}
          </nav>
          {/* Icons and phone wrap together as one group at the end of the row. */}
          <div className="ms-auto flex flex-wrap items-center gap-x-2">
            <div className="flex items-center">
              {([['instagram', InstagramIcon], ['tiktok', TikTokIcon]] as const).map(([name, Icon]) => (
                <a key={name} href={social[name].url} target="_blank" rel="noopener noreferrer" aria-label={t(`info.${name}`)} className={socialLinkClass}>
                  <Icon className="size-5" />
                </a>
              ))}
              <a href={`mailto:${social.email}`} aria-label={t('info.email')} className={socialLinkClass}>
                <Mail aria-hidden className="size-5" />
              </a>
            </div>
            {phoneLink}
          </div>
        </div>
      </footer>
      {showCartBar && <CartBar />}
    </div>
  )
}
