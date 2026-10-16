import { Link, NavLink, Outlet, useLocation } from 'react-router'
import { useTranslation } from 'react-i18next'
import { useCart } from '../features/checkout/cart'
import { HomeBanner } from '../features/home/HomeBanner'

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
  const isHome = useLocation().pathname === '/'
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-line bg-raised">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
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

      {isHome && <HomeBanner />}
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t border-line bg-peach">
        <nav aria-label={t('nav.info')} className="mx-auto flex max-w-7xl flex-wrap gap-x-6 gap-y-2 px-4 py-6">
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
