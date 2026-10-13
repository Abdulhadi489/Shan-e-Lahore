import { lazy, Suspense } from 'react'
import { Link, Route, Routes } from 'react-router'
import { useTranslation } from 'react-i18next'
import { CustomerLayout } from './CustomerLayout'
import { EmptyPage } from './EmptyPage'
import { MenuPage } from '../features/menu/MenuPage'
import { CartPage } from '../features/checkout/CartPage'
import { HomePage } from '../features/home/HomePage'
import { TrackingPage } from '../features/tracking/TrackingPage'
import { InfoPage } from '../features/info/InfoPage'
import { ContactPage } from '../features/info/ContactPage'

// Staff code downloads only when someone opens /admin, and the map library only at checkout,
// so customers on mobile data download them only when needed.
const AdminApp = lazy(() => import('../features/admin/AdminApp').then((module) => ({ default: module.AdminApp })))
const CheckoutPage = lazy(() => import('../features/checkout/CheckoutPage').then((module) => ({ default: module.CheckoutPage })))

export function AppRoutes() {
  const { t } = useTranslation()
  return (
    <Routes>
      <Route element={<CustomerLayout />}>
        <Route index element={<HomePage />} />
        <Route path="menu" element={<MenuPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route
          path="checkout"
          element={
            <Suspense>
              <CheckoutPage />
            </Suspense>
          }
        />
        <Route path="track/:token" element={<TrackingPage />} />
        <Route path="about" element={<InfoPage page="about" />} />
        <Route path="contact" element={<ContactPage />} />
        <Route path="terms" element={<InfoPage page="terms" />} />
        <Route path="privacy" element={<InfoPage page="privacy" />} />
        <Route path="refund-policy" element={<InfoPage page="refund" />} />
        <Route
          path="*"
          element={
            <EmptyPage title="pages.notFound">
              <p className="mt-2">{t('notFound.body')}</p>
              <Link to="/" className="mt-4 inline-block text-brand-deep underline">
                {t('notFound.goHome')}
              </Link>
            </EmptyPage>
          }
        />
      </Route>
      <Route
        path="admin/*"
        element={
          <Suspense>
            <AdminApp />
          </Suspense>
        }
      />
    </Routes>
  )
}
