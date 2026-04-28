import type { ReactNode } from 'react'

/**
 * Every subject plugin exports this interface.
 * The classroom route uses only this — never subject-specific logic.
 */
export interface SaathiPlugin {
  /** The main plugin component rendered in the 60% right panel */
  Component: React.FC<PluginProps>
  /** Tab definitions — id + label, plus optional per-tab source attribution.
   *  When a tab specifies `sources`, the SourceBadge renders that string
   *  (with an auto-derived plain-English description below) instead of the
   *  plugin-level sourceLabel. First tab is default. */
  tabs?: { id: string; label: string; sources?: string }[]
  /** Map from AI command tool name → tab id */
  toolToTab?: Record<string, string>
  /** Additional toolbar buttons shown in the plugin header */
  toolbarItems?: ToolbarItem[]
  /** Plugin-level source attribution. Used as a fallback when no active
   *  tab specifies its own sources, and for single-pane plugins that
   *  don't use the tabs array at all. e.g. "RCSB Protein Data Bank". */
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
  activeTab?: string
  onTabChange?: (tab: string) => void
  /** Emit a research artifact — wired by classroom page. type field uses ArtifactType from useArtifactLog. */
  onArtifact?: (artifact: { type: string; source: string; source_url?: string; data: Record<string, unknown>; timestamp: string }) => unknown
}

export interface ToolbarItem {
  icon: ReactNode
  label: string
  onClick: () => void
}
