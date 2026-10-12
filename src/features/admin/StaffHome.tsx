import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { supabase } from '../../lib/supabase'

export function StaffHome({ userId }: { userId: string }) {
  const { t } = useTranslation(undefined, { lng: 'en' })
  const profile = useQuery({
    queryKey: ['profile', userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('full_name, role, is_active')
        .eq('user_id', userId)
        .single()
      if (error) throw error
      return data
    },
  })

  let content
  if (profile.isPending) {
    content = <p>{t('admin.loading')}</p>
  } else if (profile.isError) {
    content = <p role="alert">{t('admin.profileError')}</p>
  } else if (!profile.data.is_active) {
    content = <p role="alert">{t('admin.deactivated')}</p>
  } else if (profile.data.role === 'customer') {
    content = <p role="alert">{t('admin.noRole')}</p>
  } else {
    content = (
      <>
        <h1 className="font-heading text-3xl font-bold">{t('admin.liveOrders')}</h1>
        <p className="mt-2 text-ink-muted">
          {t('admin.signedInAs', { name: profile.data.full_name, role: t(`admin.roles.${profile.data.role}`) })}
        </p>
      </>
    )
  }

  return (
    <div className="min-h-dvh">
      <title>{`${t('admin.title')} · ${t('brand')}`}</title>
      <header className="border-b border-line bg-raised">
        <div className="mx-auto flex max-w-5xl items-center gap-4 px-4 py-3">
          <p className="font-heading text-xl font-bold text-brand-deep">
            {t('brand')} <span className="text-ink-muted">{t('admin.title')}</span>
          </p>
          <button
            type="button"
            onClick={() => void supabase.auth.signOut()}
            className="ms-auto rounded-control border border-ink-muted px-3 py-1 hover:border-brand-deep"
          >
            {t('admin.signOut')}
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">{content}</main>
    </div>
  )
}
