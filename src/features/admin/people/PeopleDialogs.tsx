import { useEffect, useRef, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { inputClass, labelClass, primaryButton, secondaryButton } from '../ui'

// Native <dialog>: the browser handles focus, Escape and the backdrop. No browser alert boxes.
function Dialog({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const { i18n } = useTranslation()
  const ref = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (open && !ref.current?.open) ref.current?.showModal()
    if (!open && ref.current?.open) ref.current.close()
  }, [open])
  return (
    <dialog
      ref={ref}
      onClose={onClose}
      lang={i18n.language}
      dir={i18n.dir()}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-card bg-raised p-5 text-ink backdrop:bg-ink/60"
    >
      <h2 className="font-heading text-2xl font-bold">{title}</h2>
      <div className="mt-3 flex flex-col gap-3">{open && children}</div>
    </dialog>
  )
}

// The temporary password is shown once, here, and is gone when the Super Admin closes this. It is never stored.
export function PasswordDialog({ login, onClose }: { login: { email: string; password: string } | null; onClose: () => void }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)
  return (
    <Dialog open={login !== null} onClose={() => { setCopied(false); onClose() }} title={t('admin.people.passwordTitle')}>
      <p>{t('admin.people.passwordHelp')}</p>
      <dl className="grid gap-1 rounded-control border border-line bg-surface p-3" dir="ltr">
        <dt className="text-sm text-ink-muted">{t('admin.people.loginEmail')}</dt>
        <dd className="font-bold break-all">{login?.email}</dd>
        <dt className="mt-2 text-sm text-ink-muted">{t('admin.people.temporaryPassword')}</dt>
        <dd className="font-mono text-xl font-bold break-all select-all">{login?.password}</dd>
      </dl>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            if (login) void navigator.clipboard.writeText(`${login.email}\n${login.password}`).then(() => setCopied(true))
          }}
          className={`${secondaryButton} min-h-11`}
        >
          {copied ? t('admin.people.copied') : t('admin.people.copy')}
        </button>
        <form method="dialog">
          <button className={`${primaryButton} min-h-11`}>{t('admin.people.done')}</button>
        </form>
      </div>
    </Dialog>
  )
}

// Permanent delete: the Super Admin has to type the person's name.
export function DeleteDialog({
  name,
  open,
  busy,
  onConfirm,
  onClose,
}: {
  name: string
  open: boolean
  busy: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [typed, setTyped] = useState('')
  return (
    <Dialog open={open} onClose={() => { setTyped(''); onClose() }} title={t('admin.people.deleteTitle')}>
      <p>{t('admin.people.deleteHelp', { name })}</p>
      <label className={labelClass}>
        {t('admin.people.deleteType', { name })}
        <input value={typed} onChange={(event) => setTyped(event.target.value)} autoComplete="off" className={`${inputClass} min-h-11`} />
      </label>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={busy || typed.trim() !== name}
          onClick={onConfirm}
          className="min-h-11 rounded-control bg-danger px-4 py-2 font-bold text-raised disabled:cursor-not-allowed disabled:opacity-50"
        >
          {t('admin.people.deleteConfirm')}
        </button>
        <form method="dialog">
          <button className={`${secondaryButton} min-h-11`}>{t('admin.people.cancel')}</button>
        </form>
      </div>
    </Dialog>
  )
}
