'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { SaathiPlugin, PluginProps } from './types'
import { CollaborativeCanvas } from '@/components/classroom/CollaborativeCanvas'
import { ScienceDirectPanel, ScopusPanel } from '@/components/classroom/ElsevierPanels'
import { useAutoQueryHandler } from './useAutoQueryHandler'

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
            <div ref={viewerRef} className="w-full" style={{ height: '280px', background: 'var(--bg-base)' }} />
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
            <div ref={viewerRef} className="w-full" style={{ height: '280px', background: 'var(--bg-base)' }} />
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
/*  PubMed panel (pharma-focused)                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

type Paper = { pmid: string; title: string; authors: string[]; journal: string; year: string }

function PharmaPubMedPanel() {
  const [query, setQuery] = useState('')
  const [papers, setPapers] = useState<Paper[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return
    setLoading(true)
    setError('')
    setPapers([])
    try {
      const res = await fetch(`/api/classroom/pubmed?q=${encodeURIComponent(query.trim() + ' pharmacology')}`)
      const data = await res.json()
      if (res.ok) {
        setPapers(data.papers ?? [])
        if (data.papers?.length === 0) setError('No papers found')
      } else setError(data.error)
    } catch { setError('Search failed') }
    setLoading(false)
  }, [query])

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-2 px-3 py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search pharma literature... e.g. imatinib mechanism"
          className="flex-1 border-0 bg-transparent text-sm outline-none" style={{ color: 'var(--text-primary)' }} />
        <button onClick={handleSearch} disabled={loading || !query.trim()}
          className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-30"
          style={{ background: 'var(--gold)', color: '#fff' }}>
          {loading ? '...' : 'Search'}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        {error && <p className="px-3 py-6 text-center text-sm" style={{ color: 'var(--error)' }}>{error}</p>}
        {papers.map((p) => (
          <div key={p.pmid} className="border-b px-3 py-3" style={{ borderColor: 'var(--border-subtle)' }}>
            <a href={`https://pubmed.ncbi.nlm.nih.gov/${p.pmid}`} target="_blank" rel="noopener noreferrer"
              className="text-sm font-semibold leading-snug" style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>
              {p.title}
            </a>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {p.authors.slice(0, 3).join(', ')}{p.authors.length > 3 ? ' et al.' : ''}
            </p>
            <p className="mt-0.5 text-[10px]" style={{ color: 'var(--text-ghost)' }}>
              {p.journal} &middot; {p.year} &middot; PMID: {p.pmid}
            </p>
          </div>
        ))}
        {papers.length === 0 && !error && !loading && (
          <div className="flex flex-col items-center justify-center px-3 py-12 text-center">
            <p className="mb-1 text-3xl">📄</p>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Search pharmaceutical literature</p>
            <p className="text-xs" style={{ color: 'var(--text-ghost)' }}>PubMed — pharmacology focused</p>
          </div>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Pharma Plugin Component                                                   */
/* ═══════════════════════════════════════════════════════════════════════════ */

type PharmaTab = 'canvas' | 'drug_structure' | 'drug_target' | 'pubmed' | 'sciencedirect' | 'citations'

function PharmaPlugin({ role, onArtifact }: PluginProps) {
  const [tab, setTab] = useState<PharmaTab>('canvas')

  const tabs: { id: PharmaTab; label: string }[] = [
    { id: 'canvas', label: 'Canvas' },
    { id: 'drug_structure', label: 'Drug 3D' },
    { id: 'drug_target', label: 'Binding Sites' },
    { id: 'pubmed', label: 'Literature' },
    { id: 'sciencedirect', label: 'ScienceDirect' },
    { id: 'citations', label: 'Citations' },
  ]

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-1 px-2 py-1" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        {tabs.map((t) => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
            style={{
              background: tab === t.id ? 'var(--bg-elevated)' : 'transparent',
              color: tab === t.id ? 'var(--text-primary)' : 'var(--text-ghost)',
            }}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="relative flex-1">
        {tab === 'canvas' && <CollaborativeCanvas role={role} />}
        {tab === 'drug_structure' && <DrugStructurePanel />}
        {tab === 'drug_target' && <DrugTargetPanel />}
        {tab === 'pubmed' && <PharmaPubMedPanel />}
        {tab === 'sciencedirect' && <ScienceDirectPanel />}
        {tab === 'citations' && <ScopusPanel />}
      </div>
    </div>
  )
}

const plugin: SaathiPlugin = {
  Component: PharmaPlugin,
  sourceLabel: 'PubChem + RCSB PDB + PubMed + ScienceDirect + Scopus',
}

export default plugin
