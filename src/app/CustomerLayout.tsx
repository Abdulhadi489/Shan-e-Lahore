import { useEffect, useRef } from 'react'
import { Link, NavLink, Outlet } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useCart } from '../features/checkout/cart'

export const infoPages = [
  { path: 'about', title: 'pages.about' },
  { path: 'contact', title: 'pages.contact' },
  { path: 'terms', title: 'pages.terms' },
  { path: 'privacy', title: 'pages.privacy' },
  { path: 'refund-policy', title: 'pages.refund' },
] as const

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? 'font-bold text-brand-deep underline underline-offset-4' : 'hover:text-brand-deep'

function LanguageSwitch() {
  const { t, i18n } = useTranslation()
  const other = i18n.language === 'ur' ? 'en' : 'ur'
  return (
    <button
      type="button"
      lang={other}
      onClick={() => void i18n.changeLanguage(other)}
      className="rounded-control border border-line px-3 py-1 hover:border-brand-deep"
    >
      {t('languageName', { lng: other })}
    </button>
  )
}

export function CustomerLayout() {
  const { t } = useTranslation()
  const cartCount = useCart().reduce((sum, line) => sum + line.quantity, 0)
  const root = useRef<HTMLDivElement>(null)
  const header = useRef<HTMLElement>(null)

  // The top bar stays on screen; its height (taller when it wraps on small phones) is shared as --header-h
  // so the menu's category bar, the checkout summary and jump links stop just below it.
  useEffect(() => {
    const bar = header.current
    if (!bar) return
    const observer = new ResizeObserver(() => root.current?.style.setProperty('--header-h', `${bar.offsetHeight}px`))
    observer.observe(bar)
    return () => observer.disconnect()
  }, [])

  return (
    <div ref={root} className="flex min-h-dvh flex-col [--header-h:0px] [--page-pad:clamp(1rem,3vw,2.5rem)]">
      {/* Spans the whole window like a shop's top bar and stays visible; the page below stays in the reading column. */}
      <header ref={header} className="sticky top-0 z-20 border-b border-line bg-raised">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-(--page-pad) py-3">
          <Link to="/" className="font-heading text-2xl font-bold text-brand-deep">
            {t('brand')}
          </Link>
          <nav aria-label={t('nav.main')} className="ms-auto flex items-center gap-4">
            <NavLink to="/menu" className={navLinkClass}>
              {t('nav.menu')}
            </NavLink>
            <NavLink to="/cart" className={navLinkClass}>
              {t('nav.cart')}
              {cartCount > 0 && (
                <span className="ms-1 rounded-full bg-brand px-2 text-sm font-bold text-ink">{cartCount}</span>
              )}
            </NavLink>
          </nav>
          <LanguageSwitch />
        </div>
      </header>

      <main className="mx-auto w-full max-w-[120rem] flex-1 px-(--page-pad) py-6">
        <Outlet />
      </main>

      <footer className="border-t border-line bg-peach">
        <nav aria-label={t('nav.info')} className="mx-auto flex max-w-[120rem] flex-wrap justify-center gap-x-6 gap-y-2 px-(--page-pad) py-6">
          {infoPages.map((page) => (
            <NavLink key={page.path} to={`/${page.path}`} className={navLinkClass}>
              {t(page.title)}
            </NavLink>
          ))}
        </nav>
      </footer>
    </div>
  )
}
