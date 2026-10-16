import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { fromLahoreInput, toLahoreInput } from '../../../lib/format'
import { formatAmount } from '../../../lib/money'
import { supabase } from '../../../lib/supabase'
import type { Tables } from '../../../types/database'
import { useStaff } from '../StaffLayout'
import {
  card,
  dangerButton,
  headingClass,
  inputClass,
  labelClass,
  primaryButton,
  SaveError,
  secondaryButton,
  submitted,
  text,
  useDbMutation,
} from '../ui'

type Code = Tables<'discount_codes'>

// The same rules the server applies (supabase/functions/_shared/discount.ts); the database CHECKs
// refuse a percent over 100 and an end before the start.
function codeValues(form: FormData) {
  const date = (name: string) => (text(form, name) ? fromLahoreInput(text(form, name)) : null)
  return {
    code: text(form, 'code').toUpperCase(),
    type: text(form, 'type') as Code['type'],
    value: Number(text(form, 'value')),
    min_order: Number(text(form, 'min_order')),
    starts_at: date('starts_at'),
    ends_at: date('ends_at'),
    usage_limit: text(form, 'usage_limit') ? Number(text(form, 'usage_limit')) : null,
    one_per_phone: form.get('one_per_phone') === 'on',
    first_order_only: form.get('first_order_only') === 'on',
    is_active: form.get('is_active') === 'on',
  }
}

export function DiscountsPage() {
  const { t } = useTranslation(undefined, { lng: 'en' })
  const { branch } = useStaff()
  const key = ['admin-discounts', branch.id]
  const data = useQuery({
    queryKey: key,
    queryFn: async () => {
      const [codes, used] = await Promise.all([
        supabase.from('discount_codes').select('*').eq('branch_id', branch.id).order('created_at', { ascending: false }),
        // shortcut: counts uses in the browser from every discounted order; move to a view if codes get thousands of uses.
        supabase.from('orders').select('discount_code_id').not('discount_code_id', 'is', null).neq('status', 'cancelled'),
      ])
      if (codes.error) throw codes.error
      if (used.error) throw used.error
      return { codes: codes.data, uses: (id: string) => used.data.filter((order) => order.discount_code_id === id).length }
    },
  })
  const save = useDbMutation(key)

  const fields = (code?: Code) => (
    <>
      <label className={labelClass}>
        {t('admin.discounts.code')}
        <input
          name="code"
          required
          pattern="[A-Za-z0-9]{3,20}"
          maxLength={20}
          defaultValue={code?.code}
          autoCapitalize="characters"
          className={`${inputClass} uppercase`}
        />
        <span className="text-sm text-ink-muted">{t('admin.discounts.codeHelp')}</span>
      </label>
      <label className={labelClass}>
        {t('admin.discounts.type')}
        <select name="type" defaultValue={code?.type ?? 'percent'} className={inputClass}>
          <option value="percent">{t('admin.discounts.percent')}</option>
          <option value="fixed">{t('admin.discounts.fixed')}</option>
        </select>
      </label>
      <label className={labelClass}>
        {t('admin.discounts.value')}
        <input name="value" type="number" required min={1} max={100000} defaultValue={code?.value} className={inputClass} />
      </label>
      <label className={labelClass}>
        {t('admin.discounts.minOrder')}
        <input name="min_order" type="number" required min={0} max={100000} defaultValue={code?.min_order ?? 0} className={inputClass} />
      </label>
      <label className={labelClass}>
        {t('admin.discounts.startsAt')}
        <input name="starts_at" type="datetime-local" defaultValue={code?.starts_at ? toLahoreInput(code.starts_at) : ''} className={inputClass} />
      </label>
      <label className={labelClass}>
        {t('admin.discounts.endsAt')}
        <input name="ends_at" type="datetime-local" defaultValue={code?.ends_at ? toLahoreInput(code.ends_at) : ''} className={inputClass} />
        <span className="text-sm text-ink-muted">{t('admin.discounts.datesHelp')}</span>
      </label>
      <label className={labelClass}>
        {t('admin.discounts.usageLimit')}
        <input name="usage_limit" type="number" min={1} max={100000} defaultValue={code?.usage_limit ?? ''} className={inputClass} />
        <span className="text-sm text-ink-muted">{t('admin.discounts.usageLimitHelp')}</span>
      </label>
      <div className="flex flex-col gap-2">
        {(['one_per_phone', 'first_order_only', 'is_active'] as const).map((flag) => (
          <label key={flag} className="flex items-center gap-2">
            <input name={flag} type="checkbox" defaultChecked={code ? code[flag] : flag === 'is_active'} className="size-5" />
            {t(`admin.discounts.${flag === 'one_per_phone' ? 'onePerPhone' : flag === 'first_order_only' ? 'firstOrderOnly' : 'active'}`)}
          </label>
        ))}
      </div>
    </>
  )

  const summary = (code: Code) =>
    [
      code.type === 'percent' ? `${code.value}% ${t('admin.discounts.off')}` : `${t('price', { amount: formatAmount(code.value) })} ${t('admin.discounts.off')}`,
      code.min_order > 0 && `${t('admin.discounts.minOrder')} ${formatAmount(code.min_order)}`,
      data.data && t('admin.discounts.uses', { count: data.data.uses(code.id) }),
      code.usage_limit && `${t('admin.discounts.usageLimit')}: ${code.usage_limit}`,
      code.one_per_phone && t('admin.discounts.onePerPhone'),
      code.first_order_only && t('admin.discounts.firstOrderOnly'),
    ]
      .filter(Boolean)
      .join(' · ')

  return (
    <>
      <title>{`${t('admin.discounts.heading')} · ${t('brand')}`}</title>
      <h1 className={headingClass}>{t('admin.discounts.heading')}</h1>
      <p className="mt-1 text-ink-muted">{t('admin.discounts.help')}</p>
      <SaveError error={save.error} />
      {data.isPending && <p className="mt-4">{t('admin.loading')}</p>}
      {data.isError && <p role="alert" className="mt-4">{t('admin.errors.loadFailed')}</p>}
      {data.data?.codes.length === 0 && <p className="mt-4">{t('admin.discounts.none')}</p>}

      <ul className="mt-4 flex flex-col gap-3">
        {data.data?.codes.map((code) => (
          <li key={`${code.id}-${data.dataUpdatedAt}`} className={`${card} ${code.is_active ? '' : 'border-dashed text-ink-muted'}`}>
            <p>
              <span className="font-heading text-xl font-bold">{code.code}</span> · {summary(code)}
            </p>
            <details className="mt-2">
              <summary className="cursor-pointer text-brand-deep underline">{t('admin.discounts.edit')}</summary>
              <form
                onSubmit={(event) => save.mutate(supabase.from('discount_codes').update(codeValues(submitted(event))).eq('id', code.id))}
                className="mt-3 grid gap-3 sm:grid-cols-2"
              >
                {fields(code)}
                <div className="flex flex-wrap gap-3 sm:col-span-2">
                  <button type="submit" disabled={save.isPending} className={secondaryButton}>
                    {t('admin.menu.save')}
                  </button>
                  <button
                    type="button"
                    disabled={save.isPending}
                    onClick={() => {
                      if (window.confirm(t('admin.menu.deleteConfirm', { name: code.code }))) {
                        save.mutate(supabase.from('discount_codes').delete().eq('id', code.id))
                      }
                    }}
                    className={dangerButton}
                  >
                    {t('admin.menu.delete')}
                  </button>
                </div>
              </form>
            </details>
          </li>
        ))}
      </ul>

      <form
        onSubmit={(event) => {
          const form = submitted(event)
          const element = event.currentTarget
          save.mutate(supabase.from('discount_codes').insert({ ...codeValues(form), branch_id: branch.id }), {
            onSuccess: () => element.reset(),
          })
        }}
        className={`${card} mt-6 grid gap-3 sm:grid-cols-2`}
      >
        <h2 className="font-heading text-xl font-bold sm:col-span-2">{t('admin.discounts.add')}</h2>
        {fields()}
        <button type="submit" disabled={save.isPending} className={`${primaryButton} w-fit sm:col-span-2`}>
          {t('admin.discounts.add')}
        </button>
      </form>
    </>
  )
}
