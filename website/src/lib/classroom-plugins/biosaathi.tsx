'use client'

// ─────────────────────────────────────────────────────────────────────────────
// BioSaathi classroom plugin.
//
// Phase I-2 / Classroom redesign #4 — tab consolidation:
//   Old: Canvas | 3D Proteins | UniProt | PubMed | ScienceDirect | Citations
//   New: ✏️ Draw | 🔬 Molecules | 📄 Papers
//
//   • UniProt merged into 🔬 Molecules as a collapsible "About this
//     protein" card below the 3D viewer (see MoleculesPanel).
//   • ScienceDirect + Scopus (was "Citations") merged into 📄 Papers
//     as toggleable filter chips alongside PubMed (see PapersPanel).
//
// The local PubMedPanel / RcsbPanel / UniProtPanel inline components
// from the pre-#4 file are gone — both consolidated panels live in
// /components/classroom/ now.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect } from 'react'
import type { SaathiPlugin, PluginProps } from './types'
import { CollaborativeCanvas } from '@/components/classroom/CollaborativeCanvas'
import { MoleculesPanel } from '@/components/classroom/MoleculesPanel'
import { PapersPanel }    from '@/components/classroom/PapersPanel'

type BioTab = 'canvas' | 'rcsb' | 'pubmed'

function BioPlugin({ role, onArtifact, activeTab, onTabChange }: PluginProps) {
  const currentTab = (activeTab || 'canvas') as BioTab
  const setTab = (t: BioTab) => onTabChange?.(t)

  useEffect(() => { if (!activeTab) onTabChange?.('canvas') }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Universal classroom-tab order (Draw → Molecules → Papers). Source
  // attribution per tab drives the bottom-left badge via the classroom
  // page; the auto-derived plain-English second line lives in
  // SourceBadge.SOURCE_DESCRIPTIONS.
  const tabs: { id: BioTab; label: string; sources?: string }[] = [
    { id: 'canvas', label: '✏️ Draw' },
    { id: 'rcsb',   label: '🔬 Molecules', sources: 'RCSB Protein Data Bank + UniProt + PubChem' },
    { id: 'pubmed', label: '📄 Papers',    sources: 'PubMed + ScienceDirect + Scopus' },
  ]

  return (
    <div className="flex h-full flex-col">
      <div
        className="flex shrink-0 flex-wrap items-center gap-1 px-2 py-1"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
            style={{
              background: currentTab === t.id ? 'var(--bg-elevated)' : 'transparent',
              color:      currentTab === t.id ? 'var(--text-primary)' : 'var(--text-ghost)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="relative flex-1">
        {currentTab === 'canvas' && <CollaborativeCanvas role={role} />}
        {currentTab === 'rcsb'   && <MoleculesPanel onArtifact={onArtifact} />}
        {currentTab === 'pubmed' && <PapersPanel    onArtifact={onArtifact} />}
      </div>
    </div>
  )
}

const plugin: SaathiPlugin = {
  Component: BioPlugin,
  // Plugin-level fallback only fires when the active tab has no `sources`
  // of its own — Draw is the only such tab here, so this is effectively
  // unused. Kept for legacy callers / consistency with other plugins.
  sourceLabel: 'RCSB Protein Data Bank + UniProt + PubMed + ScienceDirect + Scopus + PubChem',
  toolToTab: { rcsb: 'rcsb', pubmed: 'pubmed' },
  tabs: [
    { id: 'canvas', label: '✏️ Draw' },
    { id: 'rcsb',   label: '🔬 Molecules', sources: 'RCSB Protein Data Bank + UniProt + PubChem' },
    { id: 'pubmed', label: '📄 Papers',    sources: 'PubMed + ScienceDirect + Scopus' },
  ],
}

export default plugin
