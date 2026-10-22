import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import {
  englishFonts,
  fontDefaults,
  fontRoles,
  fontStack,
  googleFontsUrl,
  resolveFonts,
  urduFonts,
  type FontSettings,
} from '../../../lib/fonts'
import { supabase } from '../../../lib/supabase'
import { card, inputClass, labelClass, primaryButton, SavedOrError, secondaryButton, sectionHeading, useDbMutation } from '../ui'

function FontsForm({ saved }: { saved: FontSettings }) {
  const { t } = useTranslation(undefined, { lng: 'en' })
  const [chosen, setChosen] = useState(saved)
  const save = useDbMutation(['settings-fonts'], ['site-fonts'])
  // The preview loads Google's stylesheet for the choices on screen. The live site does not change until Save.
  const previewCss = googleFontsUrl(chosen, ['en', 'ur'])

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        save.mutate(
          supabase
            .from('site_settings')
            .update({
              font_heading_en: chosen.heading_en,
              font_body_en: chosen.body_en,
              font_heading_ur: chosen.heading_ur,
              font_body_ur: chosen.body_ur,
            })
            .eq('id', true),
        )
      }}
      className={`${card} grid gap-3 sm:grid-cols-2`}
    >
      <h2 className={`${sectionHeading} sm:col-span-2`}>{t('admin.settings.fonts.heading')}</h2>
      <p className="text-ink-muted sm:col-span-2">{t('admin.settings.fonts.help')}</p>
      {fontRoles.map((role) => (
        <div key={role} className="flex flex-col gap-1">
          <label className={labelClass}>
            {t(`admin.settings.fonts.${role}`)}
            <select
              value={chosen[role]}
              onChange={(event) => setChosen((previous) => ({ ...previous, [role]: event.target.value }))}
              className={inputClass}
            >
              {(role.endsWith('_ur') ? urduFonts : englishFonts).map((font) => (
                <option key={font.family} value={font.family}>
                  {font.family}
                  {font.family === fontDefaults[role] ? ` (${t('admin.settings.fonts.default')})` : ''}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={chosen[role] === fontDefaults[role]}
            onClick={() => setChosen((previous) => ({ ...previous, [role]: fontDefaults[role] }))}
            className={`${secondaryButton} w-fit py-1 text-sm`}
          >
            {t('admin.settings.fonts.reset')}
          </button>
        </div>
      ))}

      {previewCss && <link rel="stylesheet" href={previewCss} precedence="default" />}
      <div className="grid gap-3 rounded-card border border-line bg-surface p-4 sm:col-span-2 sm:grid-cols-2" aria-label={t('admin.settings.fonts.preview')}>
        <p className="text-sm text-ink-muted sm:col-span-2">{t('admin.settings.fonts.previewNote')}</p>
        <div lang="en" style={{ fontFamily: fontStack('body_en', chosen.body_en) }}>
          <p className="text-3xl font-semibold" style={{ fontFamily: fontStack('heading_en', chosen.heading_en) }}>
            {t('home.headline', { lng: 'en' })}
          </p>
          <p className="mt-2">{t('home.subhead', { lng: 'en' })}</p>
        </div>
        <div lang="ur" dir="rtl" className="leading-[2.2]" style={{ fontFamily: fontStack('body_ur', chosen.body_ur) }}>
          <p className="text-3xl font-semibold leading-[1.8]" style={{ fontFamily: fontStack('heading_ur', chosen.heading_ur) }}>
            {t('home.headline', { lng: 'ur' })}
          </p>
          <p className="mt-2">{t('home.subhead', { lng: 'ur' })}</p>
        </div>
      </div>

      <div className="flex flex-col gap-2 sm:col-span-2">
        <button type="submit" disabled={save.isPending} className={`${primaryButton} w-fit`}>
          {t('admin.settings.save')}
        </button>
        <SavedOrError save={save} />
      </div>
    </form>
  )
}

export function FontsSection() {
  const query = useQuery({
    queryKey: ['settings-fonts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('font_heading_en, font_body_en, font_heading_ur, font_body_ur')
        .maybeSingle()
      if (error) throw error
      return resolveFonts(data && { heading_en: data.font_heading_en, body_en: data.font_body_en, heading_ur: data.font_heading_ur, body_ur: data.font_body_ur })
    },
  })
  if (!query.data) return null
  // No key: refetching when the tab regains focus must neither wipe unsaved choices nor hide the "Saved" message.
  return <FontsForm saved={query.data} />
}
