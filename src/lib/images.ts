import { supabase } from './supabase'

// Menu photos are stored as two WebP files (uploaded from the admin panel, Milestone 3):
// <name>.webp up to 1200 px for the dish pop-up, and <name>-card.webp at 320 px for dish cards,
// so a long menu stays light on mobile data. items.image_path points to the large one.
export const menuImageUrl = (path: string, size: 'full' | 'card') =>
  supabase.storage.from('menu-images').getPublicUrl(size === 'card' ? path.replace(/\.webp$/, '-card.webp') : path).data
    .publicUrl
