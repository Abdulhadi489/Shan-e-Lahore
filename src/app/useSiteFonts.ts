import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { resolveFonts } from '../lib/fonts'
import { setSiteFonts } from '../lib/siteFonts'
import { supabase } from '../lib/supabase'

// A query of its own, not part of useBranch: if the database has no site_settings table yet (or no row), only the
// fonts are skipped (the bundled ones stay) and the rest of the site loads as before. The database value always
// replaces the names remembered in localStorage, which only serve the first paint.
export function useSiteFonts() {
  const { data } = useQuery({
    queryKey: ['site-fonts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('site_settings')
        .select('font_heading_en, font_body_en, font_heading_ur, font_body_ur')
        .maybeSingle()
      if (error) throw error
      return resolveFonts(data && { heading_en: data.font_heading_en, body_en: data.font_body_en, heading_ur: data.font_heading_ur, body_ur: data.font_body_ur })
    },
    retry: false,
  })
  useEffect(() => {
    if (data) setSiteFonts(data)
  }, [data])
}
