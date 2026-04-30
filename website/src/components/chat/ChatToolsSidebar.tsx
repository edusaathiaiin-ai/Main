'use client'

// ─────────────────────────────────────────────────────────────────────────────
// ChatToolsSidebar — student-facing tools surface inside /chat.
//
// Mirrors the 13 tools we already wired into the live classroom plugins,
// but available to a student alone with their Saathi (no faculty needed).
// All free, all open. Reuses the same getToolTabsFor() helper + shared
// ToolChipPanel / ResourcesPanel as the classroom — adding a new tool to
// the data files instantly surfaces it on both classroom AND chat.
//
// Layout:
//   Desktop (≥768px): renders as the right 50% pane next to chat
//   Mobile  (<768px): renders as full-screen overlay; close X dismisses
//
// Dropdown selector (not a tab strip) on both surfaces — 13 tools is too
// many for a horizontal strip to fit cleanly. The "🔧 Tools" affordance
// in the chat header is what tells students this exists.
//
// State persistence: last-opened tool is remembered per Saathi via
// localStorage. Reopening the sidebar in the same Saathi context returns
// to the last viewed tool.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useState } from 'react'
import { getToolTabsFor } from '@/lib/classroom-plugins/useToolChipTabs'

type Props = {
  saathiSlug: string
  saathiName:  string
  saathiColor: string
  onClose:     () => void
}

const STORAGE_PREFIX = 'edu.chat-tools.last-tab.'

export function ChatToolsSidebar({ saathiSlug, saathiName, saathiColor, onClose }: Props) {
  const { tabs, render } = getToolTabsFor(saathiSlug)

  // Restore last-opened tool for this Saathi from localStorage.
  const storageKey = `${STORAGE_PREFIX}${saathiSlug}`
  const initial = (() => {
    if (typeof window === 'undefined') return tabs[0]?.id ?? ''
    const saved = window.localStorage.getItem(storageKey)
    if (saved && tabs.some((t) => t.id === saved)) return saved
    return tabs[0]?.id ?? ''
  })()

  const [activeTabId, setActiveTabId] = useState<string>(initial)

  // Persist on change.
  useEffect(() => {
    if (!activeTabId || typeof window === 'undefined') return
    window.localStorage.setItem(storageKey, activeTabId)
  }, [activeTabId, storageKey])

  // Empty-state — Saathis without curated chips for any tool yet
  // (Account, Biz, Fin, Mkt, HR, History, PolSci, Stats, Econ, Kanoon, Maaths
  //  at time of this build). Don't pretend; tell the student the truth.
  if (tabs.length === 0) {
    return (
      <SidebarShell saathiName={saathiName} saathiColor={saathiColor} onClose={onClose}>
        <div
          className="flex h-full flex-col items-center justify-center px-6 text-center"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <span style={{ fontSize: 32, opacity: 0.5 }}>🛠️</span>
          <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', margin: '12px 0 4px' }}>
            No tools curated yet for {saathiName}
          </p>
          <p style={{ fontSize: 12, lineHeight: 1.6, maxWidth: 320 }}>
            We&apos;re still curating subject-specific tools for this Saathi.
            For now, your chat is the workspace. Faculty-led classrooms include
            {' '}canvas, AI command bar, and live tools.
          </p>
        </div>
      </SidebarShell>
    )
  }

  const activePanel = render(activeTabId)

  return (
    <SidebarShell
      saathiName={saathiName}
      saathiColor={saathiColor}
      onClose={onClose}
      headerExtras={
        <select
          value={activeTabId}
          onChange={(e) => setActiveTabId(e.target.value)}
          aria-label="Choose a tool"
          style={{
            flex: 1,
            minWidth: 0,
            padding: '6px 10px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            background: 'var(--bg-elevated)',
            color: 'var(--text-primary)',
            border: `1px solid ${saathiColor}40`,
            outline: 'none',
          }}
        >
          {tabs.map((t) => (
            <option key={t.id} value={t.id}>{t.label}</option>
          ))}
        </select>
      }
    >
      <div style={{ height: '100%', minHeight: 0, overflow: 'hidden' }}>
        {activePanel}
      </div>
    </SidebarShell>
  )
}

// ── Shell (header + close + body) ───────────────────────────────────────────

function SidebarShell({
  saathiName, saathiColor, onClose, headerExtras, children,
}: {
  saathiName:    string
  saathiColor:   string
  onClose:       () => void
  headerExtras?: React.ReactNode
  children:      React.ReactNode
}) {
  return (
    <aside
      className="flex h-full flex-col"
      style={{
        background:    'var(--bg-base)',
        borderLeft:    '1px solid var(--border-subtle)',
        minWidth:      0,
        height:        '100%',
        overflow:      'hidden',
      }}
    >
      {/* Header */}
      <div
        className="flex shrink-0 items-center gap-2 px-3 py-2"
        style={{
          background: 'var(--bg-surface)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <span style={{ fontSize: 14 }}>🛠️</span>
        <span
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 0.6,
            textTransform: 'uppercase',
            color: saathiColor,
            whiteSpace: 'nowrap',
          }}
        >
          Tools
        </span>
        <span
          style={{
            fontSize: 11,
            color: 'var(--text-ghost)',
            whiteSpace: 'nowrap',
            marginRight: 6,
          }}
        >
          · {saathiName}
        </span>
        {headerExtras}
        <button
          onClick={onClose}
          aria-label="Close tools"
          style={{
            flexShrink: 0,
            width: 28,
            height: 28,
            borderRadius: 6,
            border: '1px solid var(--border-subtle)',
            background: 'transparent',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            fontSize: 16,
            lineHeight: 1,
            padding: 0,
          }}
        >
          ×
        </button>
      </div>

      {/* Body */}
      <div className="flex-1" style={{ minHeight: 0, overflow: 'hidden' }}>
        {children}
      </div>
    </aside>
  )
}
