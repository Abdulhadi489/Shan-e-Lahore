import { lazy, Suspense } from 'react'
import { Link, Route, Routes } from 'react-router'
import { useTranslation } from 'react-i18next'
import { CustomerLayout, infoPages } from './CustomerLayout'
import { EmptyPage } from './EmptyPage'

// Staff code downloads only when someone opens /admin, so customers on mobile data never load it.
const AdminApp = lazy(() => import('../features/admin/AdminApp').then((module) => ({ default: module.AdminApp })))

export function AppRoutes() {
  const { t } = useTranslation()
  return (
    <Routes>
      <Route element={<CustomerLayout />}>
        <Route index element={<EmptyPage title="brand" />} />
        <Route path="menu" element={<EmptyPage title="pages.menu" />} />
        <Route
          path="cart"
          element={
            <EmptyPage title="pages.cart">
              <Link to="/checkout" className="mt-4 inline-block text-brand-deep underline">
                {t('cart.goToCheckout')}
              </Link>
            </EmptyPage>
          }
        />
        <Route path="checkout" element={<EmptyPage title="pages.checkout" />} />
        <Route path="track/:token" element={<EmptyPage title="pages.tracking" />} />
        {infoPages.map((page) => (
          <Route key={page.path} path={page.path} element={<EmptyPage title={page.title} />} />
        ))}
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
