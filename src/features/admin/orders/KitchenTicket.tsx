import { Link, useParams } from 'react-router'
import { useTranslation } from 'react-i18next'
import { ArrowLeft, Printer } from 'lucide-react'
import { clockLabel } from '../../../lib/format'
import { useStaff } from '../StaffLayout'

// Sized for 80 mm thermal paper (@page in index.css); prints on any printer or to PDF too.
export function KitchenTicket() {
  const { t } = useTranslation(undefined, { lng: 'en' })
  const { id } = useParams()
  const { branch, orders } = useStaff()
  const o = orders.data?.find((order) => order.id === id)

  if (orders.isPending) return <p>{t('admin.loading')}</p>
  if (!o) return <p role="alert">{t('admin.orders.notFound')}</p>

  const number = `${branch.order_prefix}-${o.order_number}`
  return (
    <>
      <title>{`${t('admin.orders.ticket')} ${number}`}</title>
      <div className="flex flex-wrap gap-3 print:hidden">
        <Link to=".." relative="path" className="flex items-center gap-1 text-brand-deep underline">
          <ArrowLeft aria-hidden className="size-4" />
          {t('admin.orders.heading', { number })}
        </Link>
        <button
          type="button"
          onClick={() => window.print()}
          className="ms-auto flex items-center gap-2 rounded-control bg-brand px-4 py-2 font-bold text-ink"
        >
          <Printer aria-hidden className="size-5" />
          {t('admin.orders.print')}
        </button>
      </div>
      <article className="mt-4 w-[72mm] bg-raised p-2 text-ink print:mt-0 print:p-0">
        <h1 className="text-2xl font-bold">{number}</h1>
        <p>{clockLabel('en', o.created_at)}</p>
        <ul className="mt-2 flex flex-col gap-2 border-t border-dashed border-ink pt-2 text-lg">
          {o.order_items.map((item) => (
            <li key={item.id}>
              <span className="font-bold">{item.quantity} ×</span> {item.name_en}
              {item.variant_name_en && ` (${item.variant_name_en})`}
              {item.order_item_addons.map((addon) => (
                <span key={addon.id} className="block ps-6 text-base">
                  + {addon.name_en}
                </span>
              ))}
            </li>
          ))}
        </ul>
        {o.notes && (
          <p className="mt-2 border-t border-dashed border-ink pt-2 whitespace-pre-line">
            <span className="font-bold">{t('admin.orders.notes')}:</span> {o.notes}
          </p>
        )}
      </article>
    </>
  )
}
