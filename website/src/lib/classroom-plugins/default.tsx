'use client'

import type { SaathiPlugin, PluginProps } from './types'
import { CollaborativeCanvas } from '@/components/classroom/CollaborativeCanvas'
import { FullscreenPanel } from '@/components/classroom/FullscreenPanel'

/**
 * Default plugin — tldraw canvas only.
 * Used by all Saathis that don't have a specialist plugin.
 */
function DefaultPlugin({ role }: PluginProps) {
  return <CollaborativeCanvas role={role} />
}

const plugin: SaathiPlugin = {
  Component: DefaultPlugin,
  sourceLabel: '',
}

export default plugin
