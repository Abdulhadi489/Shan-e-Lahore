import { useEffect, useRef } from 'react'

// The top bar stays on screen; its height (taller when it wraps on small phones) is shared as --header-h
// so sticky parts of the page and jump links stop just below it.
export function useHeaderHeight() {
  const header = useRef<HTMLElement>(null)
  useEffect(() => {
    const bar = header.current
    if (!bar) return
    const root = document.documentElement
    const observer = new ResizeObserver(() => root.style.setProperty('--header-h', `${bar.offsetHeight}px`))
    observer.observe(bar)
    return () => {
      observer.disconnect()
      root.style.removeProperty('--header-h')
    }
  }, [])
  return header
}
