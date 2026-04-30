'use client'

// ─────────────────────────────────────────────────────────────────────────────
// ToolChipPanel — shared chip-list-then-iframe surface.
//
// Most of our classroom tools follow the same shape: faculty (and the AI
// command bar) picks one of N curated resources, the chosen URL loads
// in an iframe. Instead of duplicating that pattern across PhET,
// LabXchange, HHMI, Learn.Genetics, Virtual Labs, Concord, MERLOT,
// ChemCollective, CircuitVerse, etc., they all share this one panel.
//
// Per-tool config lives in /lib/classroom-data/<tool>.ts as curated
// chip arrays. Adding a new chip is a data-only edit. Adding a new
// Saathi for an existing tool is a 2-line tab + panel instantiation.
//
// Does NOT replace existing specialised panels (MoleculesPanel,
// PapersPanel, NIST, Falstad, Sketchfab) — those stay because they have
// custom search / state / rendering. ToolChipPanel covers everything
// where "pick one of these URLs and embed it" is the whole interaction.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect } from 'react'
import { FullscreenPanel } from './FullscreenPanel'

export type ToolChip = {
  /** Display label for the chip + select option. */
  label: string
  /** URL to render in the iframe when this chip is selected. */
  url: string
  /** Optional 1-line hover tooltip / description. */
  description?: string
}

type Props = {
  /** Tool name shown above the picker, e.g. "PhET Simulation". */
  label: string
  /** Curated chips to choose from. First chip loads on mount. */
  chips: ToolChip[]
  /** Iframe sandbox attribute. Defaults work for most public sites. */
  sandbox?: string
  /** Iframe allow attribute. Default permits fullscreen + camera/mic for the few tools that need them. */
  allow?: string
  /** Optional empty-state message when chips is empty. */
  emptyMessage?: string
}

const DEFAULT_SANDBOX =
  'allow-scripts allow-same-origin allow-popups allow-forms allow-presentation'
const DEFAULT_ALLOW = 'fullscreen; camera; microphone; autoplay'

export function ToolChipPanel({
  label,
  chips,
  sandbox = DEFAULT_SANDBOX,
  allow = DEFAULT_ALLOW,
  emptyMessage = 'No resources curated yet for this Saathi.',
}: Props) {
  const [activeUrl, setActiveUrl] = useState<string>(chips[0]?.url ?? '')

  // Keep the picker in sync if chips list changes (e.g. faculty switches Saathi).
  useEffect(() => {
    if (chips[0]?.url && !chips.some((c) => c.url === activeUrl)) {
      setActiveUrl(chips[0].url)
    }
  }, [chips, activeUrl])

  if (chips.length === 0) {
    return (
      <div
        className="flex h-full items-center justify-center px-6 text-center"
        style={{ color: 'var(--text-tertiary)', fontSize: 13 }}
      >
        {emptyMessage}
      </div>
    )
  }

  const active = chips.find((c) => c.url === activeUrl) ?? chips[0]

  return (
    <div className="flex h-full flex-col">
      {/* Picker row — dropdown for desktop + scrollable chip strip below */}
      <div
        className="flex shrink-0 flex-col gap-2 px-3 py-2"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-2">
          <label
            className="text-xs font-semibold"
            style={{ color: 'var(--text-secondary)' }}
          >
            {label}:
          </label>
          <select
            value={active.url}
            onChange={(e) => setActiveUrl(e.target.value)}
            className="flex-1 rounded-lg border-0 px-2 py-1 text-sm outline-none"
            style={{
              background: 'var(--bg-elevated)',
              color: 'var(--text-primary)',
            }}
          >
            {chips.map((c) => (
              <option key={c.url} value={c.url}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        {active.description && (
          <p
            className="text-[11px]"
            style={{ color: 'var(--text-ghost)' }}
          >
            {active.description}
          </p>
        )}
      </div>

      <FullscreenPanel label={label}>
        <iframe
          key={active.url}
          src={active.url}
          className="h-full w-full border-0"
          sandbox={sandbox}
          allow={allow}
          title={`${label}: ${active.label}`}
        />
      </FullscreenPanel>
    </div>
  )
}
