import { useEffect, useRef, useState } from 'react'
import type { LiveOrder } from './useLiveOrders'

// Three short tones made by the browser, so there is no sound file to download.
function playChime(audio: AudioContext) {
  void audio.resume()
  ;[880, 660, 880].forEach((frequency, index) => {
    const start = audio.currentTime + index * 0.2
    const tone = audio.createOscillator()
    const volume = audio.createGain()
    tone.frequency.value = frequency
    volume.gain.setValueAtTime(0.5, start)
    volume.gain.exponentialRampToValueAtTime(0.001, start + 0.18)
    tone.connect(volume).connect(audio.destination)
    tone.start(start)
    tone.stop(start + 0.18)
  })
}

const newestTime = (orders: LiveOrder[] | undefined) => Math.max(0, ...(orders ?? []).map((o) => Date.parse(o.created_at)))

// Rings every few seconds while an order is waiting that nobody on this device has acknowledged.
// Times come from the database, so a wrong clock on this device can't hide an order.
export function useNewOrderAlarm(orders: LiveOrder[] | undefined, notificationTitle: (order: LiveOrder) => string) {
  // Browsers allow sound only after a tap on the page, so alerts start switched off on every visit.
  const [audio, setAudio] = useState<AudioContext | null>(null)
  const [seenUpTo, setSeenUpTo] = useState(0)
  const notified = useRef(new Set<string>())

  const unseen = audio
    ? (orders ?? []).filter((o) => o.status === 'pending_confirmation' && Date.parse(o.created_at) > seenUpTo)
    : []
  const ringing = unseen.length > 0

  useEffect(() => () => void audio?.close(), [audio])

  useEffect(() => {
    if (!audio || !ringing) return
    playChime(audio)
    const timer = setInterval(() => playChime(audio), 5000)
    return () => clearInterval(timer)
  }, [audio, ringing])

  useEffect(() => {
    if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return
    for (const order of unseen) {
      if (notified.current.has(order.id)) continue
      notified.current.add(order.id)
      try {
        new Notification(notificationTitle(order), { tag: order.id }).onclick = () => window.focus()
      } catch {
        // Android Chrome only shows notifications from a service worker; the sound still plays.
      }
    }
  })

  // Keeps a laptop or phone from sleeping while this page is on screen; asked again after switching back to the tab.
  useEffect(() => {
    if (!audio || !('wakeLock' in navigator)) return
    let lock: WakeLockSentinel | undefined
    const keepAwake = () => {
      if (document.visibilityState === 'visible') {
        navigator.wakeLock.request('screen').then((sentinel) => (lock = sentinel), () => {})
      }
    }
    keepAwake()
    document.addEventListener('visibilitychange', keepAwake)
    return () => {
      document.removeEventListener('visibilitychange', keepAwake)
      void lock?.release()
    }
  }, [audio])

  return {
    on: audio !== null,
    unseen,
    turnOn() {
      const context = new AudioContext()
      playChime(context)
      setAudio(context)
      setSeenUpTo(newestTime(orders))
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') void Notification.requestPermission()
    },
    acknowledge: () => setSeenUpTo(newestTime(unseen)),
  }
}
