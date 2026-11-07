import imageCompression from 'browser-image-compression'
import { supabase } from '../../../lib/supabase'

const bucket = () => supabase.storage.from('menu-images')

// Dish photos are saved as <name>.webp (1200 px, dish pop-up) and <name>-card.webp (320 px, dish cards),
// the names src/lib/images.ts expects. A random name per upload means
// a replaced photo never shows from an old cache. The worker option is off because it would load the
// library from a CDN, which the CSP blocks.
// shortcut: Safari can't encode WebP and sends PNG under the .webp name (still displays); upload from Chrome or Edge.
export async function uploadMenuPhoto(file: File) {
  const name = `items/${crypto.randomUUID()}`
  const sizes: [string, number][] = [[`${name}.webp`, 1200], [`${name}-card.webp`, 320]]
  for (const [path, maxWidthOrHeight] of sizes) {
    const image = await imageCompression(file, { maxWidthOrHeight, maxSizeMB: 0.9, initialQuality: 0.8, fileType: 'image/webp', useWebWorker: false })
    const { error } = await bucket().upload(path, image, { contentType: image.type, cacheControl: '31536000' })
    if (error) throw error
  }
  return `${name}.webp`
}

export async function removeMenuPhoto(path: string) {
  const { error } = await bucket().remove([path, path.replace(/\.webp$/, '-card.webp')])
  if (error) throw error
}
