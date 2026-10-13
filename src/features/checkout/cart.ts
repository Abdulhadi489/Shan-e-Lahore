import { useSyncExternalStore } from 'react'
import { z } from 'zod'
import { MAX_QUANTITY } from '../../../supabase/functions/_shared/pricing'
import { cartLine } from '../../../supabase/functions/_shared/schemas'

// Only dish choices and quantities: names and prices are always read fresh from the menu.
export type CartLine = z.infer<typeof cartLine>

const storageKey = 'cart'
const listeners = new Set<() => void>()

function readSavedCart(): CartLine[] {
  try {
    const parsed = z.array(cartLine).max(50).safeParse(JSON.parse(localStorage.getItem(storageKey) ?? '[]'))
    return parsed.success ? parsed.data : []
  } catch {
    return []
  }
}

let lines = readSavedCart()

function save(next: CartLine[]) {
  lines = next
  try {
    localStorage.setItem(storageKey, JSON.stringify(next))
  } catch {
    // Not saved, but the cart still works for this visit.
  }
  listeners.forEach((notify) => notify())
}

// Two lines are the same dish only if every choice matches.
export function lineKey(line: Omit<CartLine, 'quantity'>) {
  return [line.itemId, line.variantId ?? '', ...[...line.addonOptionIds].sort()].join('|')
}

export function addToCart(line: CartLine) {
  const key = lineKey(line)
  const existing = lines.find((l) => lineKey(l) === key)
  save(
    existing
      ? lines.map((l) => (l === existing ? { ...l, quantity: Math.min(l.quantity + line.quantity, MAX_QUANTITY) } : l))
      : [...lines, line],
  )
}

export function setQuantity(key: string, quantity: number) {
  save(
    quantity < 1
      ? lines.filter((l) => lineKey(l) !== key)
      : lines.map((l) => (lineKey(l) === key ? { ...l, quantity: Math.min(quantity, MAX_QUANTITY) } : l)),
  )
}

export function clearCart() {
  save([])
}

function subscribe(notify: () => void) {
  listeners.add(notify)
  return () => listeners.delete(notify)
}

export function useCart() {
  return useSyncExternalStore(subscribe, () => lines)
}
