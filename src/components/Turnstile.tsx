import { useEffect, useRef, useState } from 'react'

type TurnstileApi = {
  render: (
    container: HTMLElement,
    options: {
      sitekey: string
      theme: 'light'
      size: 'flexible' | 'compact'
      callback: (token: string) => void
      'expired-callback': () => void
      'error-callback': (code: string) => void
    },
  ) => string
  remove: (widgetId: string) => void
}

declare global {
  interface Window {
    turnstile?: TurnstileApi
  }
}

let scriptLoad: Promise<TurnstileApi> | undefined

function loadTurnstile() {
  scriptLoad ??= new Promise((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit'
    script.async = true
    script.onload = () => (window.turnstile ? resolve(window.turnstile) : reject(new Error('Turnstile missing')))
    script.onerror = () => {
      scriptLoad = undefined // let the next mount try again
      script.remove()
      reject(new Error('Turnstile script failed to load'))
    }
    document.head.append(script)
  })
  return scriptLoad
}

// Cloudflare's bot check. Each token works once: give this a new React key to get a fresh widget.
// onToken must be stable (a useState setter), or the widget is rebuilt on every render.
export function Turnstile({
  onToken,
  unavailableMessage,
}: {
  onToken: (token: string | null) => void
  unavailableMessage: string
}) {
  const container = useRef<HTMLDivElement>(null)
  const [errorCode, setErrorCode] = useState<string | null>(null)

  useEffect(() => {
    let widgetId: string | undefined
    let unmounted = false
    loadTurnstile().then(
      (turnstile) => {
        if (unmounted || !container.current) return
        widgetId = turnstile.render(container.current, {
          sitekey: import.meta.env.VITE_TURNSTILE_SITE_KEY,
          theme: 'light',
          // The flexible widget is at least 300 px wide, which would push very small phones sideways.
          size: container.current.clientWidth < 300 ? 'compact' : 'flexible',
          callback: (token) => {
            setErrorCode(null)
            onToken(token)
          },
          'expired-callback': () => onToken(null),
          'error-callback': (code) => {
            setErrorCode(code)
            onToken(null)
          },
        })
      },
      () => setErrorCode('script'),
    )
    return () => {
      unmounted = true
      if (widgetId) window.turnstile?.remove(widgetId)
    }
  }, [onToken])

  return (
    <div>
      <div ref={container} />
      {errorCode && (
        <p role="alert" className="text-sm text-danger">
          {unavailableMessage} ({errorCode})
        </p>
      )}
    </div>
  )
}
