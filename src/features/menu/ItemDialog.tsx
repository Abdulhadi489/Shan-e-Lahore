import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { localized } from '../../i18n'
import { formatAmount } from '../../lib/money'
import { menuImageUrl } from '../../lib/images'
import { MAX_QUANTITY, unitPrice } from '../../../supabase/functions/_shared/pricing'
import { addToCart, type CartLine } from '../checkout/cart'
import { SidesRow } from './SidesRow'
import type { MenuItem } from './useMenu'

type AddonGroup = MenuItem['addon_groups'][number]

function groupRule(group: AddonGroup) {
  if (group.min_select === group.max_select) return { key: 'item.chooseExactly', count: group.max_select } as const
  if (group.min_select === 0) return { key: 'item.chooseUpTo', count: group.max_select } as const
  return { key: 'item.chooseBetween', min: group.min_select, max: group.max_select } as const
}

function ItemChoices({ item, onDone, onAdd }: { item: MenuItem; onDone: () => void; onAdd: (line: CartLine) => void }) {
  const { t, i18n } = useTranslation()
  const lng = i18n.language
  const [variantId, setVariantId] = useState(item.variants.find((v) => v.is_available)?.id ?? null)
  const [addonIds, setAddonIds] = useState<string[]>([])
  const [quantity, setQuantity] = useState(1)
  const result = unitPrice(item, { variantId, addonOptionIds: addonIds })
  const price = (amount: number) => t('price', { amount: formatAmount(amount) })

  function toggleOption(group: AddonGroup, optionId: string) {
    const inGroup = new Set(group.options.map((o) => o.id))
    setAddonIds((ids) =>
      group.max_select === 1
        ? [...ids.filter((id) => !inGroup.has(id)), optionId]
        : ids.includes(optionId)
          ? ids.filter((id) => id !== optionId)
          : [...ids, optionId],
    )
  }

  function submit(event: FormEvent) {
    event.preventDefault()
    if ('error' in result) return
    onAdd({ itemId: item.id, variantId, addonOptionIds: addonIds, quantity })
    onDone()
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-5 p-5">
      {item.image_path && (
        <img
          src={menuImageUrl(item.image_path, 'full')}
          alt={localized(lng, item.name_en, item.name_ur)}
          className="aspect-[4/3] w-full rounded-card bg-peach object-cover"
        />
      )}
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h2 className="font-heading text-2xl font-bold">{localized(lng, item.name_en, item.name_ur)}</h2>
          {item.description_en && (
            <p className="mt-1 text-ink-muted">{localized(lng, item.description_en, item.description_ur)}</p>
          )}
        </div>
        <button type="button" onClick={onDone} className="rounded-control border border-line px-3 py-1">
          {t('item.close')}
        </button>
      </div>

      {item.variants.length > 0 && (
        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 font-bold">
            {t('item.size')} <span className="text-sm font-normal text-ink-muted">· {t('item.required')}</span>
          </legend>
          {item.variants.map((variant) => (
            <label key={variant.id} className="flex items-center gap-3 rounded-control border border-line px-3 py-2">
              <input
                type="radio"
                name="variant"
                checked={variantId === variant.id}
                disabled={!variant.is_available}
                onChange={() => setVariantId(variant.id)}
              />
              <span className="flex-1">{localized(lng, variant.name_en, variant.name_ur)}</span>
              <span>{variant.is_available ? price(variant.price) : t('menu.soldOut')}</span>
            </label>
          ))}
        </fieldset>
      )}

      {item.addon_groups.map((group) => {
        const picked = group.options.filter((o) => addonIds.includes(o.id)).length
        return (
          <fieldset key={group.id} className="flex flex-col gap-2">
            <legend className="mb-2 font-bold">
              {localized(lng, group.name_en, group.name_ur)}{' '}
              <span className="text-sm font-normal text-ink-muted">
                · {t(group.min_select > 0 ? 'item.required' : 'item.optional')} · {t(groupRule(group).key, groupRule(group))}
              </span>
            </legend>
            {group.options.map((option) => {
              const checked = addonIds.includes(option.id)
              return (
                <label key={option.id} className="flex items-center gap-3 rounded-control border border-line px-3 py-2">
                  <input
                    type={group.max_select === 1 ? 'radio' : 'checkbox'}
                    name={group.id}
                    checked={checked}
                    disabled={!option.is_available || (!checked && group.max_select > 1 && picked >= group.max_select)}
                    onChange={() => toggleOption(group, option.id)}
                  />
                  <span className="flex-1">{localized(lng, option.name_en, option.name_ur)}</span>
                  {!option.is_available ? (
                    <span>{t('menu.soldOut')}</span>
                  ) : (
                    option.extra_price > 0 && <span>+ {price(option.extra_price)}</span>
                  )}
                </label>
              )
            })}
          </fieldset>
        )
      })}

      <div className="flex items-center gap-3">
        <span className="font-bold">{t('item.quantity')}</span>
        <button
          type="button"
          aria-label={t('item.decrease')}
          disabled={quantity <= 1}
          onClick={() => setQuantity((q) => q - 1)}
          className="size-10 rounded-control border border-ink-muted text-xl disabled:opacity-40"
        >
          −
        </button>
        <output aria-live="polite" className="min-w-8 text-center text-lg font-bold">
          {quantity}
        </output>
        <button
          type="button"
          aria-label={t('item.increase')}
          disabled={quantity >= MAX_QUANTITY}
          onClick={() => setQuantity((q) => q + 1)}
          className="size-10 rounded-control border border-ink-muted text-xl disabled:opacity-40"
        >
          +
        </button>
      </div>

      <button
        type="submit"
        disabled={'error' in result}
        className="rounded-control bg-brand px-4 py-3 font-bold text-ink hover:bg-peach disabled:cursor-not-allowed disabled:opacity-60"
      >
        {'error' in result ? t('item.add') : t('item.addWithPrice', { price: price(result.price * quantity) })}
      </button>

      {onAdd === addToCart && <SidesRow excludeItemId={item.id} />}
    </form>
  )
}

// Native <dialog>: the browser handles focus, Escape and the backdrop.
// Customers add to their cart; staff editing an order on the call pass onAdd to take the choice instead.
export function ItemDialog({
  item,
  onClose,
  onAdd = addToCart,
}: {
  item: MenuItem | null
  onClose: () => void
  onAdd?: (line: CartLine) => void
}) {
  const dialog = useRef<HTMLDialogElement>(null)
  useEffect(() => {
    if (item) dialog.current?.showModal()
  }, [item])

  return (
    <dialog
      ref={dialog}
      onClose={onClose}
      className="m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-card bg-raised text-ink backdrop:bg-ink/60"
    >
      {item && <ItemChoices key={item.id} item={item} onAdd={onAdd} onDone={() => dialog.current?.close()} />}
    </dialog>
  )
}
