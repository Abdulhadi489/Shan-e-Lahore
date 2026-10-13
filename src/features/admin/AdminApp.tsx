import { useEffect, useLayoutEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { Session } from '@supabase/supabase-js'
import i18n, { applyDocumentLanguage } from '../../i18n'
import { supabase } from '../../lib/supabase'
import { LoginPage } from './LoginPage'
import { StaffLayout } from './StaffLayout'
import { LiveOrdersPage } from './orders/LiveOrdersPage'
import { OrderPage } from './orders/OrderPage'
import { KitchenTicket } from './orders/KitchenTicket'

// undefined while the saved session is still being read from storage.
function useSession() {
  const queryClient = useQueryClient()
  const [session, setSession] = useState<Session | null>()
  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, newSession) => {
      // Covers the sign-out button, sign-out in another tab and an expired session: drop all fetched data.
      if (event === 'SIGNED_OUT') queryClient.clear()
      setSession(newSession)
    })
    return () => data.subscription.unsubscribe()
  }, [queryClient])
  return session
}

// The admin panel is English only, whatever language the customer site was last set to.
export function AdminApp() {
  const { t } = useTranslation(undefined, { lng: 'en' })
  const session = useSession()

  useLayoutEffect(() => {
    applyDocumentLanguage('en')
    return () => applyDocumentLanguage(i18n.language)
  }, [])

  if (session === undefined) return <p className="p-4">{t('admin.loading')}</p>

  // These redirects only choose which screen to show. Data is protected by the database's RLS policies.
  return (
    <Routes>
      <Route path="login" element={session ? <Navigate to="/admin" replace /> : <LoginPage />} />
      <Route element={session ? <StaffLayout userId={session.user.id} /> : <Navigate to="/admin/login" replace />}>
        <Route index element={<LiveOrdersPage />} />
        <Route path="orders/:id" element={<OrderPage />} />
        <Route path="orders/:id/ticket" element={<KitchenTicket />} />
      </Route>
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  )
}
