'use client'

import { useState, useCallback } from 'react'
import type { SaathiPlugin, PluginProps } from './types'
import { CollaborativeCanvas } from '@/components/classroom/CollaborativeCanvas'
import { FullscreenPanel } from '@/components/classroom/FullscreenPanel'
import { MoleculesPanel } from '@/components/classroom/MoleculesPanel'
import { PapersPanel }    from '@/components/classroom/PapersPanel'
import { getToolTabsFor } from './useToolChipTabs'

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Ensembl Genome Browser (iframe embed)                                     */
/* ═══════════════════════════════════════════════════════════════════════════ */

function EnsemblPanel() {
  const [region, setRegion] = useState('17:7661779-7687550') // TP53 default

  const presets = [
    { label: 'TP53 (tumor suppressor)', region: '17:7661779-7687550' },
    { label: 'BRCA1 (breast cancer)', region: '17:43044295-43170245' },
    { label: 'EGFR (growth factor)', region: '7:55019017-55211628' },
    { label: 'CFTR (cystic fibrosis)', region: '7:117480025-117668665' },
    { label: 'HBB (hemoglobin beta)', region: '11:5225464-5229395' },
  ]

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-2 px-3 py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <label className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>Region:</label>
        <select value={region} onChange={(e) => setRegion(e.target.value)}
          className="flex-1 rounded-lg border-0 px-2 py-1 text-sm outline-none"
          style={{ background: 'var(--bg-elevated)', color: 'var(--text-primary)' }}>
          {presets.map((p) => (
            <option key={p.region} value={p.region}>{p.label}</option>
          ))}
        </select>
      </div>
      <FullscreenPanel label="Ensembl Genome Browser">
        <iframe
          key={region}
          src={`https://www.ensembl.org/Homo_sapiens/Location/View?r=${region}`}
          className="h-full w-full border-0"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
          title="Ensembl Genome Browser"
        />
      </FullscreenPanel>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  NCBI Gene panel                                                           */
/* ═══════════════════════════════════════════════════════════════════════════ */

type GeneResult = {
  uid: string
  name: string
  description: string
  organism: string
  chromosome: string
  maplocation: string
  summary: string
}

function NcbiGenePanel() {
  const [query, setQuery] = useState('')
  const [genes, setGenes] = useState<GeneResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return
    setLoading(true)
    setError('')
    setGenes([])

    try {
      // Search for gene IDs
      const searchRes = await fetch(
        `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=gene&term=${encodeURIComponent(query.trim())}+AND+Homo+sapiens[Organism]&retmax=5&retmode=json`
      )
      const searchData = await searchRes.json()
      const ids: string[] = searchData.esearchresult?.idlist ?? []

      if (ids.length === 0) { setError('No genes found'); setLoading(false); return }

      // Fetch gene summaries
      const summaryRes = await fetch(
        `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=gene&id=${ids.join(',')}&retmode=json`
      )
      const summaryData = await summaryRes.json()

      const mapped: GeneResult[] = ids.map((id) => {
        const doc = summaryData.result?.[id]
        if (!doc) return null
        return {
          uid: id,
          name: doc.name ?? '',
          description: doc.description ?? '',
          organism: doc.organism?.scientificname ?? 'Homo sapiens',
          chromosome: doc.chromosome ?? '',
          maplocation: doc.maplocation ?? '',
          summary: doc.summary ?? '',
        }
      }).filter(Boolean) as GeneResult[]

      setGenes(mapped)
      if (mapped.length === 0) setError('No genes found')
    } catch { setError('Search failed') }
    setLoading(false)
  }, [query])

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-2 px-3 py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search gene... e.g. TP53, BRCA1, insulin"
          className="flex-1 border-0 bg-transparent text-sm outline-none" style={{ color: 'var(--text-primary)' }} />
        <button onClick={handleSearch} disabled={loading || !query.trim()}
          className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-30"
          style={{ background: 'var(--gold)', color: '#fff' }}>
          {loading ? '...' : 'Search'}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {error && <p className="px-3 py-6 text-center text-sm" style={{ color: 'var(--error)' }}>{error}</p>}
        {genes.map((g) => (
          <div key={g.uid} className="border-b px-3 py-3" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{g.name}</p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>{g.description}</p>
              </div>
              <span className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                style={{ background: 'var(--bg-elevated)', color: 'var(--text-ghost)' }}>
                Chr {g.chromosome}
              </span>
            </div>
            {g.maplocation && (
              <p className="mt-1 text-[10px]" style={{ color: 'var(--text-ghost)' }}>
                Location: {g.maplocation}
              </p>
            )}
            {g.summary && (
              <p className="mt-1 line-clamp-3 text-xs leading-relaxed" style={{ color: 'var(--text-tertiary)' }}>
                {g.summary}
              </p>
            )}
            <a href={`https://www.ncbi.nlm.nih.gov/gene/${g.uid}`} target="_blank" rel="noopener noreferrer"
              className="mt-1 inline-block text-[10px] font-semibold" style={{ color: 'var(--gold)' }}>
              View on NCBI →
            </a>
          </div>
        ))}
        {genes.length === 0 && !error && !loading && (
          <div className="flex flex-col items-center justify-center px-3 py-12 text-center">
            <p className="mb-1 text-3xl">🧬</p>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Search human genes</p>
            <p className="text-xs" style={{ color: 'var(--text-ghost)' }}>NCBI Gene — gene-level lookup</p>
          </div>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Biotech Plugin Component                                                  */
/* ═══════════════════════════════════════════════════════════════════════════ */

// Phase I-2 / Classroom redesign #4 — ScienceDirect + Scopus tabs merged
// into 📄 Papers (shared PapersPanel). Genome + Genes stay separate
// because they answer different questions (DNA region vs gene record).
// rcsb tab uses the consolidated MoleculesPanel.
type BiotechBaseTab = 'canvas' | 'rcsb' | 'pubmed' | 'ensembl' | 'ncbi_gene'
type BiotechTab = BiotechBaseTab | string

function BiotechPlugin({ role, onArtifact, unlockedTabIds, onShowAllTools }: PluginProps) {
  const [tab, setTab] = useState<BiotechTab>('canvas')

  const { tabs: toolTabs, render: renderToolTab } = getToolTabsFor('biotechsaathi')
  const baseTabs: { id: BiotechTab; label: string; sources?: string }[] = [
    { id: 'canvas',    label: '✏️ Draw' },
    { id: 'rcsb',      label: '🔬 Molecules', sources: 'RCSB Protein Data Bank + UniProt + PubChem' },
    { id: 'pubmed',    label: '📄 Papers',    sources: 'PubMed + ScienceDirect + Scopus' },
    { id: 'ncbi_gene', label: 'Genes',        sources: 'NCBI Gene' },
    { id: 'ensembl',   label: 'Genome',       sources: 'Ensembl' },
  ]
  const tabs: { id: BiotechTab; label: string; sources?: string }[] = [
    ...baseTabs,
    ...toolTabs.map((t) => ({ id: t.id as BiotechTab, label: t.label, sources: t.sources })),
  ]
  const toolNode = renderToolTab(tab)

  // Phase I-2 / Classroom #5 — progressive tab reveal.
  const visibleTabs = unlockedTabIds === undefined
    ? tabs
    : tabs.filter((t, i) => i === 0 || unlockedTabIds.includes(t.id))
  const hasLockedTabs = visibleTabs.length < tabs.length

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-1 px-2 py-1" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        {visibleTabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
            style={{
              background: tab === t.id ? 'var(--bg-elevated)' : 'transparent',
              color: tab === t.id ? 'var(--text-primary)' : 'var(--text-ghost)',
            }}>
            {t.label}
          </button>
        ))}
        {hasLockedTabs && onShowAllTools && (
          <button
            type="button"
            onClick={() => onShowAllTools(tabs.map((t) => t.id))}
            className="ml-auto rounded-md px-2 py-1 text-[11px] transition-colors hover:opacity-80"
            style={{ background: 'transparent', color: 'var(--text-tertiary)', cursor: 'pointer' }}
          >
            Show all tools ↓
          </button>
        )}
      </div>
      <div className="relative flex-1">
        {tab === 'canvas'    && <CollaborativeCanvas role={role} />}
        {tab === 'rcsb'      && <MoleculesPanel onArtifact={onArtifact} />}
        {tab === 'pubmed'    && <PapersPanel    onArtifact={onArtifact} />}
        {tab === 'ensembl'   && <EnsemblPanel />}
        {tab === 'ncbi_gene' && <NcbiGenePanel />}
        {toolNode}
      </div>
    </div>
  )
}

const plugin: SaathiPlugin = {
  Component: BiotechPlugin,
  sourceLabel: 'RCSB PDB + UniProt + PubChem + Ensembl + NCBI Gene + PubMed + ScienceDirect + Scopus',
  toolToTab: { rcsb: 'rcsb', pubmed: 'pubmed' },
}

export default plugin
