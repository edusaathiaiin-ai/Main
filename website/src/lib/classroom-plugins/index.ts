import type { SaathiPlugin } from './types'

/**
 * Plugin registry — maps saathiSlug to its specialist plugin.
 * Falls back to default.tsx (tldraw only) for unlisted slugs.
 *
 * Each plugin is lazy-loaded via dynamic import — only the
 * plugin for the active session's Saathi is ever downloaded.
 */
const PLUGIN_MAP: Record<string, () => Promise<{ default: SaathiPlugin }>> = {
  physicsaathi: () => import('./physicsaathi'),
  chemsaathi: () => import('./chemsaathi'),
  biosaathi: () => import('./biosaathi'),
  maathsaathi: () => import('./maathsaathi'),
  biotechsaathi: () => import('./biotechsaathi'),
  pharmasaathi: () => import('./pharmasaathi'),
  kanoonsaathi: () => import('./kanoonsaathi'),
  compsaathi: () => import('./compsaathi'),
  aerospacesaathi: () => import('./aerospacesaathi'),
  archsaathi: () => import('./archsaathi'),
}

export async function loadPlugin(saathiSlug: string): Promise<SaathiPlugin> {
  const loader = PLUGIN_MAP[saathiSlug]
  if (loader) {
    const mod = await loader()
    return mod.default
  }
  const fallback = await import('./default')
  return fallback.default
}
