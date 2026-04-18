'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { SaathiPlugin, PluginProps } from './types'
import { CollaborativeCanvas } from '@/components/classroom/CollaborativeCanvas'
import { ScienceDirectPanel, ScopusPanel } from '@/components/classroom/ElsevierPanels'

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  RCSB PDB panel (shared with biosaathi — same 3Dmol.js viewer)             */
/* ═══════════════════════════════════════════════════════════════════════════ */

type PdbResult = {
  pdb_id: string
  title: string
  organism: string
  resolution: number | null
  deposition_date: string
  authors: string
  doi: string
  pdb_data: string | null
}

function RcsbPanel() {
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
      } catch { setError('Failed to fetch structure') }
      setLoading(false)
      return
    }

    try {
      const res = await fetch(`/api/classroom/rcsb?q=${encodeURIComponent(query.trim())}`)
      const data = await res.json()
      setSearchResults(data.results ?? [])
      if (data.results?.length === 0) setError('No structures found')
    } catch { setError('Search failed') }
    setLoading(false)
  }, [query])

  const loadStructure = useCallback(async (pdbId: string) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/classroom/rcsb?pdb=${pdbId}`)
      const data = await res.json()
      if (res.ok) { setStructure(data); setSearchResults([]) }
      else setError(data.error)
    } catch { setError('Failed to load structure') }
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
          placeholder="Search protein... e.g. CRISPR-Cas9, 6VXX"
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
            <span className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>{r.pdb_id}</span>
          </button>
        ))}
        {structure && (
          <div>
            <div ref={viewerRef} className="w-full" style={{ height: '280px', background: 'var(--bg-base)' }} />
            <div className="space-y-2 px-3 py-3">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{structure.title}</p>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-ghost)' }}>PDB ID</p>
                  <p className="text-sm font-bold" style={{ fontFamily: 'var(--font-mono)', color: 'var(--text-primary)' }}>{structure.pdb_id}</p>
                </div>
                <div>
                  <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-ghost)' }}>Organism</p>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{structure.organism || 'N/A'}</p>
                </div>
              </div>
              <a href={`https://www.rcsb.org/structure/${structure.pdb_id}`} target="_blank" rel="noopener noreferrer"
                className="inline-block text-xs font-semibold" style={{ color: 'var(--gold)' }}>View on RCSB →</a>
            </div>
          </div>
        )}
        {!structure && searchResults.length === 0 && !error && !loading && (
          <div className="flex flex-col items-center justify-center px-3 py-12 text-center">
            <p className="mb-1 text-3xl">🔬</p>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Search protein structures</p>
            <p className="text-xs" style={{ color: 'var(--text-ghost)' }}>RCSB PDB — 200,000+ structures</p>
          </div>
        )}
      </div>
    </div>
  )
}

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
      <iframe
        key={region}
        src={`https://www.ensembl.org/Homo_sapiens/Location/View?r=${region}`}
        className="flex-1 border-0"
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        title="Ensembl Genome Browser"
      />
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

type BiotechTab = 'canvas' | 'rcsb' | 'ensembl' | 'ncbi_gene' | 'sciencedirect' | 'citations'

function BiotechPlugin({ role }: PluginProps) {
  const [tab, setTab] = useState<BiotechTab>('canvas')

  const tabs: { id: BiotechTab; label: string }[] = [
    { id: 'canvas', label: 'Canvas' },
    { id: 'rcsb', label: '3D Proteins' },
    { id: 'ensembl', label: 'Genome' },
    { id: 'ncbi_gene', label: 'Genes' },
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
        {tab === 'rcsb' && <RcsbPanel />}
        {tab === 'ensembl' && <EnsemblPanel />}
        {tab === 'ncbi_gene' && <NcbiGenePanel />}
        {tab === 'sciencedirect' && <ScienceDirectPanel />}
        {tab === 'citations' && <ScopusPanel />}
      </div>
    </div>
  )
}

const plugin: SaathiPlugin = {
  Component: BiotechPlugin,
  sourceLabel: 'RCSB PDB + Ensembl + NCBI Gene + ScienceDirect + Scopus',
}

export default plugin
