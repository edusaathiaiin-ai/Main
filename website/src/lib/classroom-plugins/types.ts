import type { ReactNode } from 'react'

/**
 * Every subject plugin exports this interface.
 * The classroom route uses only this — never subject-specific logic.
 */
export interface SaathiPlugin {
  /** The main plugin component rendered in the 60% right panel */
  Component: React.FC<PluginProps>
  /** Additional toolbar buttons shown in the plugin header */
  toolbarItems?: ToolbarItem[]
  /** Data source attribution shown as badge, e.g. "RCSB Protein Data Bank" */
  sourceLabel?: string
  /** Cleanup on session end — save state, flush artifacts */
  onSessionEnd?: () => Promise<void>
}

export interface PluginProps {
  roomId: string
  role: 'faculty' | 'student'
  saathiSlug: string
  pendingToolLoad?: { tool: string; params: Record<string, unknown> } | null
  onToolConsumed?: () => void
}

export interface ToolbarItem {
  icon: ReactNode
  label: string
  onClick: () => void
}
