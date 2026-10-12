import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useTranslation } from 'react-i18next'
import { isAuthRetryableFetchError, type AuthError } from '@supabase/supabase-js'
import { supabase } from '../../lib/supabase'
import { Turnstile } from '../../components/Turnstile'

// Only checks that something was typed; Supabase decides whether the password is right.
const loginSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
})
type LoginValues = z.infer<typeof loginSchema>

// Never says whether the email or the password was wrong, so the form can't be used to find staff emails.
function loginErrorKey(error: AuthError) {
  if (error.code === 'invalid_credentials') return 'admin.login.errors.wrongCredentials'
  if (error.code === 'captcha_failed') return 'admin.login.errors.botCheckFailed'
  if (error.code === 'over_request_rate_limit' || error.status === 429) return 'admin.login.errors.tooManyAttempts'
  if (isAuthRetryableFetchError(error)) return 'admin.login.errors.network'
  return 'admin.login.errors.unexpected'
}

const inputClass = 'rounded-control border border-ink-muted bg-raised px-3 py-2'

export function LoginPage() {
  const { t } = useTranslation(undefined, { lng: 'en' })
  const [captchaToken, setCaptchaToken] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  const [errorKey, setErrorKey] = useState<ReturnType<typeof loginErrorKey> | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema) })

  async function logIn({ email, password }: LoginValues) {
    if (!captchaToken) return
    setErrorKey(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password, options: { captchaToken } })
    if (error) {
      setErrorKey(loginErrorKey(error))
      // A Turnstile token works once, so show a fresh check for the next try.
      setCaptchaToken(null)
      setAttempt((n) => n + 1)
    }
    // On success the session listener in AdminApp redirects to /admin.
  }

  return (
    <main className="mx-auto max-w-sm px-4 py-12">
      <title>{`${t('admin.login.title')} · ${t('brand')}`}</title>
      <p className="font-heading text-xl font-bold text-brand-deep">{t('brand')}</p>
      <h1 className="font-heading text-3xl font-bold">{t('admin.login.title')}</h1>

      <form onSubmit={handleSubmit(logIn)} noValidate className="mt-6 flex flex-col gap-4">
        <label className="flex flex-col gap-1">
          {t('admin.login.email')}
          <input type="email" autoComplete="username" aria-invalid={!!errors.email} className={inputClass} {...register('email')} />
          {errors.email && <span className="text-sm text-danger">{t('admin.login.errors.email')}</span>}
        </label>

        <label className="flex flex-col gap-1">
          {t('admin.login.password')}
          <input
            type="password"
            autoComplete="current-password"
            aria-invalid={!!errors.password}
            className={inputClass}
            {...register('password')}
          />
          {errors.password && <span className="text-sm text-danger">{t('admin.login.errors.password')}</span>}
        </label>

        <Turnstile key={attempt} onToken={setCaptchaToken} unavailableMessage={t('admin.login.botCheckUnavailable')} />

        {errorKey && (
          <p role="alert" className="text-danger">
            {t(errorKey)}
          </p>
        )}

        <button
          type="submit"
          disabled={!captchaToken || isSubmitting}
          className="rounded-control bg-brand px-4 py-2 font-bold text-ink hover:bg-peach disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? t('admin.login.submitting') : t('admin.login.submit')}
        </button>
        {!captchaToken && <p className="text-sm text-ink-muted">{t('admin.login.botCheckPending')}</p>}

        <p className="text-sm text-ink-muted">{t('admin.login.forgotPassword')}</p>
      </form>
    </main>
  )
}
