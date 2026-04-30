'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { SaathiPlugin, PluginProps } from './types'
import { CollaborativeCanvas } from '@/components/classroom/CollaborativeCanvas'
import { FullscreenPanel } from '@/components/classroom/FullscreenPanel'
import { PapersPanel } from '@/components/classroom/PapersPanel'
import { useAutoQueryHandler } from './useAutoQueryHandler'
import { getToolTabsFor } from './useToolChipTabs'

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  PubChem drug search + 3Dmol.js viewer                                     */
/* ═══════════════════════════════════════════════════════════════════════════ */

type CompoundResult = {
  cid: number
  name: string
  formula: string
  molecular_weight: number
  iupac_name: string
  smiles: string
  inchi_key: string
  sdf: string | null
}

function DrugStructurePanel() {
  const [query, setQuery] = useState('')
  const [compound, setCompound] = useState<CompoundResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const viewerRef = useRef<HTMLDivElement>(null)
  const viewerInstanceRef = useRef<unknown>(null)

  useAutoQueryHandler('pubchem', (params) => {
    if (params.compound_name) { setQuery(String(params.compound_name)); doSearch(String(params.compound_name)) }
  })

  async function doSearch(q: string) {
    if (!q.trim()) return
    setLoading(true); setError(''); setCompound(null)
    try {
      const res = await fetch(`/api/classroom/pubchem?name=${encodeURIComponent(q.trim())}`)
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Not found'); setLoading(false); return }
      setCompound(data)
    } catch { setError('Search failed') }
    setLoading(false)
  }

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return
    setLoading(true)
    setError('')
    setCompound(null)

    try {
      const res = await fetch(`/api/classroom/pubchem?name=${encodeURIComponent(query.trim())}`)
      const data = await res.json()
      if (!res.ok) { setError(data.error ?? 'Not found'); setLoading(false); return }
      setCompound(data)
    } catch { setError('Search failed') }
    setLoading(false)
  }, [query])

  useEffect(() => {
    if (!compound?.sdf || !viewerRef.current) return
    const script = document.getElementById('3dmol-script') as HTMLScriptElement | null
    if (!script) {
      const s = document.createElement('script')
      s.id = '3dmol-script'
      s.src = 'https://3Dmol.org/build/3Dmol-min.js'
      s.onload = () => render3D()
      document.head.appendChild(s)
    } else { render3D() }

    function render3D() {
      const $3Dmol = (window as unknown as Record<string, unknown>)['$3Dmol'] as {
        createViewer: (el: HTMLElement, config: Record<string, unknown>) => {
          addModel: (data: string, format: string) => void
          setStyle: (sel: Record<string, unknown>, style: Record<string, unknown>) => void
          zoomTo: () => void; render: () => void; clear: () => void
        }
      } | undefined
      if (!$3Dmol || !viewerRef.current) return
      if (viewerInstanceRef.current) (viewerInstanceRef.current as { clear: () => void }).clear()
      viewerRef.current.innerHTML = ''
      const viewer = $3Dmol.createViewer(viewerRef.current, { backgroundColor: '#FAFAF8' })
      viewer.addModel(compound!.sdf!, 'sdf')
      viewer.setStyle({}, { stick: { radius: 0.15 }, sphere: { scale: 0.3 } })
      viewer.zoomTo()
      viewer.render()
      viewerInstanceRef.current = viewer
    }
  }, [compound])

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-2 px-3 py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search drug... e.g. Imatinib, Metformin, Paracetamol"
          className="flex-1 border-0 bg-transparent text-sm outline-none" style={{ color: 'var(--text-primary)' }} />
        <button onClick={handleSearch} disabled={loading || !query.trim()}
          className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-30"
          style={{ background: 'var(--gold)', color: '#fff' }}>
          {loading ? '...' : 'Search'}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {error && <p className="px-3 py-6 text-center text-sm" style={{ color: 'var(--error)' }}>{error}</p>}
        {compound && (
          <div>
            <FullscreenPanel label="3D Structure">
              <div ref={viewerRef} className="w-full" style={{ height: '280px', background: 'var(--bg-base)' }} />
            </FullscreenPanel>
            <div className="space-y-2 px-3 py-3">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{compound.iupac_name}</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-ghost)' }}>Formula</p>
                  <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{compound.formula}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-ghost)' }}>Mol. Weight</p>
                  <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{compound.molecular_weight} g/mol</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-ghost)' }}>CID</p>
                  <p className="text-sm" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{compound.cid}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-ghost)' }}>SMILES</p>
                  <p className="truncate text-[11px]" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>{compound.smiles}</p>
                </div>
              </div>
              <a href={`https://pubchem.ncbi.nlm.nih.gov/compound/${compound.cid}`} target="_blank" rel="noopener noreferrer"
                className="inline-block text-xs font-semibold" style={{ color: 'var(--gold)' }}>View on PubChem →</a>
            </div>
          </div>
        )}
        {!compound && !error && !loading && (
          <div className="flex flex-col items-center justify-center px-3 py-12 text-center">
            <p className="mb-1 text-3xl">💊</p>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Search drug structures</p>
            <p className="text-xs" style={{ color: 'var(--text-ghost)' }}>PubChem — 100M+ compounds</p>
          </div>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  RCSB PDB — drug-receptor binding sites                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

type PdbResult = {
  pdb_id: string
  title: string
  organism: string
  resolution: number | null
  pdb_data: string | null
}

function DrugTargetPanel() {
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ pdb_id: string }[]>([])
  const [structure, setStructure] = useState<PdbResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const viewerRef = useRef<HTMLDivElement>(null)
  const viewerInstanceRef = useRef<unknown>(null)

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return
    setLoading(true)
    setError('')
    setSearchResults([])
    setStructure(null)

    if (/^[a-zA-Z0-9]{4}$/.test(query.trim())) {
      try {
        const res = await fetch(`/api/classroom/rcsb?pdb=${query.trim()}`)
        const data = await res.json()
        if (res.ok) setStructure(data)
        else setError(data.error)
      } catch { setError('Failed') }
      setLoading(false)
      return
    }

    try {
      const res = await fetch(`/api/classroom/rcsb?q=${encodeURIComponent(query.trim() + ' drug binding')}`)
      const data = await res.json()
      setSearchResults(data.results ?? [])
      if (data.results?.length === 0) setError('No binding structures found')
    } catch { setError('Search failed') }
    setLoading(false)
  }, [query])

  const loadStructure = useCallback(async (pdbId: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/classroom/rcsb?pdb=${pdbId}`)
      const data = await res.json()
      if (res.ok) { setStructure(data); setSearchResults([]) }
    } catch { /* ignore */ }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!structure?.pdb_data || !viewerRef.current) return
    const script = document.getElementById('3dmol-script') as HTMLScriptElement | null
    if (!script) {
      const s = document.createElement('script')
      s.id = '3dmol-script'
      s.src = 'https://3Dmol.org/build/3Dmol-min.js'
      s.onload = () => render3D()
      document.head.appendChild(s)
    } else { render3D() }

    function render3D() {
      const $3Dmol = (window as unknown as Record<string, unknown>)['$3Dmol'] as {
        createViewer: (el: HTMLElement, config: Record<string, unknown>) => {
          addModel: (data: string, format: string) => void
          setStyle: (sel: Record<string, unknown>, style: Record<string, unknown>) => void
          zoomTo: () => void; render: () => void; clear: () => void
        }
      } | undefined
      if (!$3Dmol || !viewerRef.current) return
      if (viewerInstanceRef.current) (viewerInstanceRef.current as { clear: () => void }).clear()
      viewerRef.current.innerHTML = ''
      const viewer = $3Dmol.createViewer(viewerRef.current, { backgroundColor: '#FAFAF8' })
      viewer.addModel(structure!.pdb_data!, 'pdb')
      viewer.setStyle({}, { cartoon: { color: 'spectrum' } })
      // Highlight ligands (HETATM) in stick representation
      viewer.setStyle({ hetflag: true }, { stick: { radius: 0.2, colorscheme: 'greenCarbon' } })
      viewer.zoomTo()
      viewer.render()
      viewerInstanceRef.current = viewer
    }
  }, [structure])

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-2 px-3 py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search drug target... e.g. BCR-ABL, ACE2"
          className="flex-1 border-0 bg-transparent text-sm outline-none" style={{ color: 'var(--text-primary)' }} />
        <button onClick={handleSearch} disabled={loading || !query.trim()}
          className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-30"
          style={{ background: 'var(--gold)', color: '#fff' }}>
          {loading ? '...' : 'Search'}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {error && <p className="px-3 py-6 text-center text-sm" style={{ color: 'var(--error)' }}>{error}</p>}
        {searchResults.map((r) => (
          <button key={r.pdb_id} onClick={() => loadStructure(r.pdb_id)}
            className="block w-full px-3 py-2.5 text-left transition-colors hover:bg-[var(--bg-elevated)]"
            style={{ borderBottom: '1px solid var(--border-subtle)' }}>
            <span className="text-sm font-bold" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{r.pdb_id}</span>
          </button>
        ))}
        {structure && (
          <div>
            <FullscreenPanel label="3D Structure">
              <div ref={viewerRef} className="w-full" style={{ height: '280px', background: 'var(--bg-base)' }} />
            </FullscreenPanel>
            <div className="px-3 py-3">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{structure.title}</p>
              <p className="mt-1 text-xs" style={{ color: 'var(--text-ghost)' }}>
                Ligands shown in green stick representation
              </p>
              <a href={`https://www.rcsb.org/structure/${structure.pdb_id}`} target="_blank" rel="noopener noreferrer"
                className="mt-1 inline-block text-xs font-semibold" style={{ color: 'var(--gold)' }}>View on RCSB →</a>
            </div>
          </div>
        )}
        {!structure && searchResults.length === 0 && !error && !loading && (
          <div className="flex flex-col items-center justify-center px-3 py-12 text-center">
            <p className="mb-1 text-3xl">🎯</p>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Search drug-receptor binding sites</p>
            <p className="text-xs" style={{ color: 'var(--text-ghost)' }}>RCSB PDB — doctoral-level pharmacology</p>
          </div>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  PharmaPlugin                                                              */
/*                                                                            */
/*  Phase I-2 #4 — ScienceDirect + Citations dropped here; folded into        */
/*  📄 Papers (PapersPanel) as filter chips alongside PubMed. The             */
/*  pharma-specific DrugStructurePanel (PubChem-tuned for small-molecule      */
/*  drugs) and DrugTargetPanel (RCSB binding-site visualizer) stay because    */
/*  they answer different questions for pharma students than the generic     */
/*  MoleculesPanel would.                                                    */
/* ═══════════════════════════════════════════════════════════════════════════ */

type PharmaBaseTab = 'canvas' | 'drug_structure' | 'drug_target' | 'pubmed'
type PharmaTab = PharmaBaseTab | string

function PharmaPlugin({ role, onArtifact, unlockedTabIds, onShowAllTools }: PluginProps) {
  const [tab, setTab] = useState<PharmaTab>('canvas')

  const { tabs: toolTabs, render: renderToolTab } = getToolTabsFor('pharmasaathi')
  const baseTabs: { id: PharmaTab; label: string; sources?: string }[] = [
    { id: 'canvas',         label: '✏️ Draw' },
    { id: 'drug_structure', label: '🔬 Molecules',  sources: 'PubChem' },
    { id: 'pubmed',         label: '📄 Papers',     sources: 'PubMed + ScienceDirect + Scopus' },
    { id: 'drug_target',    label: 'Binding Sites', sources: 'RCSB Protein Data Bank' },
  ]
  const tabs: { id: PharmaTab; label: string; sources?: string }[] = [
    ...baseTabs,
    ...toolTabs.map((t) => ({ id: t.id as PharmaTab, label: t.label, sources: t.sources })),
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
        {tab === 'canvas'         && <CollaborativeCanvas role={role} />}
        {tab === 'drug_structure' && <DrugStructurePanel />}
        {tab === 'drug_target'    && <DrugTargetPanel />}
        {tab === 'pubmed'         && <PapersPanel onArtifact={onArtifact} />}
        {toolNode}
      </div>
    </div>
  )
}

const plugin: SaathiPlugin = {
  Component: PharmaPlugin,
  sourceLabel: 'PubChem + RCSB PDB + PubMed + ScienceDirect + Scopus',
}

export default plugin
