'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { SaathiPlugin, PluginProps } from './types'
import { CollaborativeCanvas } from '@/components/classroom/CollaborativeCanvas'
import { FullscreenPanel } from '@/components/classroom/FullscreenPanel'
import { ScienceDirectPanel, ScopusPanel } from '@/components/classroom/ElsevierPanels'
import { RcsbPanel as SharedRcsbPanel } from '@/components/classroom/RcsbPanel'
import { useAutoQueryHandler } from './useAutoQueryHandler'

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  RCSB PDB panel — protein structure search + 3Dmol.js viewer               */
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

    // If query looks like a PDB ID (4 characters), fetch directly
    if (/^[a-zA-Z0-9]{4}$/.test(query.trim())) {
      try {
        const res = await fetch(`/api/classroom/rcsb?pdb=${query.trim()}`)
        const data = await res.json()
        if (res.ok) {
          setStructure(data)
        } else {
          setError(data.error)
        }
      } catch {
        setError('Failed to fetch structure')
      }
      setLoading(false)
      return
    }

    // Otherwise, search by name
    try {
      const res = await fetch(`/api/classroom/rcsb?q=${encodeURIComponent(query.trim())}`)
      const data = await res.json()
      setSearchResults(data.results ?? [])
      if (data.results?.length === 0) setError('No structures found')
    } catch {
      setError('Search failed')
    }
    setLoading(false)
  }, [query])

  const loadStructure = useCallback(async (pdbId: string) => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch(`/api/classroom/rcsb?pdb=${pdbId}`)
      const data = await res.json()
      if (res.ok) {
        setStructure(data)
        setSearchResults([])
      } else {
        setError(data.error)
      }
    } catch {
      setError('Failed to load structure')
    }
    setLoading(false)
  }, [])

  // Render 3D structure with 3Dmol.js
  useEffect(() => {
    if (!structure?.pdb_data || !viewerRef.current) return

    const script = document.getElementById('3dmol-script') as HTMLScriptElement | null
    if (!script) {
      const s = document.createElement('script')
      s.id = '3dmol-script'
      s.src = 'https://3Dmol.org/build/3Dmol-min.js'
      s.onload = () => render3D()
      document.head.appendChild(s)
    } else {
      render3D()
    }

    function render3D() {
      const $3Dmol = (window as unknown as Record<string, unknown>)['$3Dmol'] as {
        createViewer: (el: HTMLElement, config: Record<string, unknown>) => {
          addModel: (data: string, format: string) => void
          setStyle: (sel: Record<string, unknown>, style: Record<string, unknown>) => void
          setBackgroundColor: (color: string) => void
          zoomTo: () => void
          render: () => void
          clear: () => void
        }
      } | undefined

      if (!$3Dmol || !viewerRef.current) return

      if (viewerInstanceRef.current) {
        (viewerInstanceRef.current as { clear: () => void }).clear()
      }
      viewerRef.current.innerHTML = ''

      const viewer = $3Dmol.createViewer(viewerRef.current, {
        backgroundColor: '#FAFAF8',
      })
      viewer.addModel(structure!.pdb_data!, 'pdb')
      viewer.setStyle({}, { cartoon: { color: 'spectrum' } })
      viewer.zoomTo()
      viewer.render()
      viewerInstanceRef.current = viewer
    }
  }, [structure])

  return (
    <div className="flex h-full flex-col">
      {/* Search bar */}
      <div className="flex shrink-0 items-center gap-2 px-3 py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search protein... e.g. Hemoglobin, 2HYY"
          className="flex-1 border-0 bg-transparent text-sm outline-none"
          style={{ color: 'var(--text-primary)' }}
        />
        <button
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-30"
          style={{ background: 'var(--gold)', color: '#fff' }}
        >
          {loading ? '...' : 'Search'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {error && <p className="px-3 py-6 text-center text-sm" style={{ color: 'var(--error)' }}>{error}</p>}

        {/* Search results list */}
        {searchResults.length > 0 && (
          <div>
            {searchResults.map((r) => (
              <button
                key={r.pdb_id}
                onClick={() => loadStructure(r.pdb_id)}
                className="block w-full px-3 py-2.5 text-left transition-colors hover:bg-[var(--bg-elevated)]"
                style={{ borderBottom: '1px solid var(--border-subtle)' }}
              >
                <span className="text-sm font-bold" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                  {r.pdb_id}
                </span>
              </button>
            ))}
          </div>
        )}

        {/* Structure detail */}
        {structure && (
          <div>
            <FullscreenPanel label="3D Structure">
              <div ref={viewerRef} className="w-full" style={{ height: '280px', background: 'var(--bg-base)' }} />
            </FullscreenPanel>
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
                {structure.resolution && (
                  <div>
                    <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-ghost)' }}>Resolution</p>
                    <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{structure.resolution} A</p>
                  </div>
                )}
                <div>
                  <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-ghost)' }}>Deposited</p>
                  <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{structure.deposition_date}</p>
                </div>
              </div>
              {structure.authors && (
                <div>
                  <p className="text-[10px] font-semibold uppercase" style={{ color: 'var(--text-ghost)' }}>Authors</p>
                  <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{structure.authors}</p>
                </div>
              )}
              <a
                href={`https://www.rcsb.org/structure/${structure.pdb_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-xs font-semibold"
                style={{ color: 'var(--gold)' }}
              >
                View on RCSB →
              </a>
            </div>
          </div>
        )}

        {!structure && searchResults.length === 0 && !error && !loading && (
          <div className="flex flex-col items-center justify-center px-3 py-12 text-center">
            <p className="mb-1 text-3xl">🧬</p>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Search for any protein structure</p>
            <p className="text-xs" style={{ color: 'var(--text-ghost)' }}>RCSB PDB — 200,000+ peer-reviewed structures</p>
          </div>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  PubMed citation panel                                                     */
/* ═══════════════════════════════════════════════════════════════════════════ */

type Paper = {
  pmid: string
  title: string
  authors: string[]
  journal: string
  year: string
  doi: string
}

function PubMedPanel() {
  const [query, setQuery] = useState('')
  const [papers, setPapers] = useState<Paper[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useAutoQueryHandler('pubmed', (params) => {
    const q = (params.query as string) ?? ''
    if (q) { setQuery(q); doSearch(q) }
  })

  async function doSearch(q: string) {
    if (!q.trim()) return
    setLoading(true); setError(''); setPapers([])
    try {
      const res = await fetch(`/api/classroom/pubmed?q=${encodeURIComponent(q.trim())}`)
      const data = await res.json()
      if (res.ok) {
        setPapers(data.papers ?? [])
        if (data.papers?.length === 0) setError('No papers found')
      } else setError(data.error)
    } catch { setError('Search failed') }
    setLoading(false)
  }

  const handleSearch = useCallback(() => { doSearch(query) }, [query]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-2 px-3 py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search PubMed... e.g. CRISPR gene editing"
          className="flex-1 border-0 bg-transparent text-sm outline-none"
          style={{ color: 'var(--text-primary)' }}
        />
        <button
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-30"
          style={{ background: 'var(--gold)', color: '#fff' }}
        >
          {loading ? '...' : 'Search'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {error && <p className="px-3 py-6 text-center text-sm" style={{ color: 'var(--error)' }}>{error}</p>}

        {papers.map((p) => (
          <div key={p.pmid} className="border-b px-3 py-3" style={{ borderColor: 'var(--border-subtle)' }}>
            <a
              href={`https://pubmed.ncbi.nlm.nih.gov/${p.pmid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold leading-snug"
              style={{ color: 'var(--text-primary)', textDecoration: 'none' }}
            >
              {p.title}
            </a>
            <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
              {p.authors.slice(0, 3).join(', ')}
              {p.authors.length > 3 ? ' et al.' : ''}
            </p>
            <p className="mt-0.5 text-[10px]" style={{ color: 'var(--text-ghost)' }}>
              {p.journal} &middot; {p.year} &middot; PMID: {p.pmid}
            </p>
          </div>
        ))}

        {papers.length === 0 && !error && !loading && (
          <div className="flex flex-col items-center justify-center px-3 py-12 text-center">
            <p className="mb-1 text-3xl">📄</p>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Search biomedical literature</p>
            <p className="text-xs" style={{ color: 'var(--text-ghost)' }}>PubMed — 36M+ citations</p>
          </div>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  UniProt panel                                                             */
/* ═══════════════════════════════════════════════════════════════════════════ */

type UniProtResult = {
  accession: string
  name: string
  organism: string
  function_text: string
  gene: string
}

function UniProtPanel() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<UniProtResult[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return
    setLoading(true)
    setError('')
    setResults([])

    try {
      const res = await fetch(
        `https://rest.uniprot.org/uniprotkb/search?query=${encodeURIComponent(query.trim())}&size=5&fields=accession,protein_name,organism_name,gene_names,cc_function&format=json`
      )
      if (!res.ok) { setError('Search failed'); setLoading(false); return }
      const data = await res.json()

      const mapped: UniProtResult[] = (data.results ?? []).map((r: Record<string, unknown>) => ({
        accession: (r as { primaryAccession: string }).primaryAccession ?? '',
        name: ((r as { proteinDescription?: { recommendedName?: { fullName?: { value?: string } } } })
          .proteinDescription?.recommendedName?.fullName?.value) ?? 'Unknown',
        organism: ((r as { organism?: { scientificName?: string } }).organism?.scientificName) ?? '',
        gene: ((r as { genes?: Array<{ geneName?: { value?: string } }> }).genes?.[0]?.geneName?.value) ?? '',
        function_text: ((r as { comments?: Array<{ texts?: Array<{ value?: string }> }> })
          .comments?.[0]?.texts?.[0]?.value) ?? '',
      }))

      setResults(mapped)
      if (mapped.length === 0) setError('No results found')
    } catch {
      setError('Search failed')
    }
    setLoading(false)
  }, [query])

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-2 px-3 py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search UniProt... e.g. insulin, p53"
          className="flex-1 border-0 bg-transparent text-sm outline-none"
          style={{ color: 'var(--text-primary)' }}
        />
        <button
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-30"
          style={{ background: 'var(--gold)', color: '#fff' }}
        >
          {loading ? '...' : 'Search'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {error && <p className="px-3 py-6 text-center text-sm" style={{ color: 'var(--error)' }}>{error}</p>}

        {results.map((r) => (
          <div key={r.accession} className="border-b px-3 py-3" style={{ borderColor: 'var(--border-subtle)' }}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{r.name}</p>
              <span className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold" style={{ background: 'var(--bg-elevated)', color: 'var(--text-ghost)', fontFamily: 'var(--font-mono)' }}>
                {r.accession}
              </span>
            </div>
            {r.gene && <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Gene: {r.gene}</p>}
            <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{r.organism}</p>
            {r.function_text && (
              <p className="mt-1 line-clamp-3 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {r.function_text}
              </p>
            )}
            <a
              href={`https://www.uniprot.org/uniprot/${r.accession}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-1 inline-block text-[10px] font-semibold"
              style={{ color: 'var(--gold)' }}
            >
              View on UniProt →
            </a>
          </div>
        ))}

        {results.length === 0 && !error && !loading && (
          <div className="flex flex-col items-center justify-center px-3 py-12 text-center">
            <p className="mb-1 text-3xl">🔬</p>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Search protein function & disease</p>
            <p className="text-xs" style={{ color: 'var(--text-ghost)' }}>UniProt — 250M+ protein sequences</p>
          </div>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════════════════════════ */
/*  Biology Plugin Component                                                  */
/* ═══════════════════════════════════════════════════════════════════════════ */

type BioTab = 'canvas' | 'rcsb' | 'uniprot' | 'pubmed' | 'sciencedirect' | 'citations'

function BioPlugin({ role, onArtifact, activeTab, onTabChange }: PluginProps) {
  const currentTab = (activeTab || 'canvas') as BioTab
  const setTab = (t: BioTab) => onTabChange?.(t)

  useEffect(() => { if (!activeTab) onTabChange?.('canvas') }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Universal classroom-tab order — Draw → primary tabs → others alphabetical.
  // Per-tab `sources` drives the SourceBadge; tabs without sources fall
  // through to the plugin-level sourceLabel below.
  const tabs: { id: BioTab; label: string; sources?: string }[] = [
    { id: 'canvas',        label: '✏️ Draw' },
    { id: 'rcsb',          label: '🔬 Molecules',   sources: 'RCSB Protein Data Bank' },
    { id: 'pubmed',        label: '📄 Papers',      sources: 'PubMed' },
    { id: 'citations',     label: 'Citations',      sources: 'Scopus' },
    { id: 'sciencedirect', label: 'ScienceDirect',  sources: 'ScienceDirect' },
    { id: 'uniprot',       label: 'UniProt',        sources: 'UniProt' },
  ]

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 flex-wrap items-center gap-1 px-2 py-1" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
            style={{
              background: currentTab === t.id ? 'var(--bg-elevated)' : 'transparent',
              color: currentTab === t.id ? 'var(--text-primary)' : 'var(--text-ghost)',
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="relative flex-1">
        {currentTab === 'canvas' && <CollaborativeCanvas role={role} />}
        {currentTab === 'rcsb' && <SharedRcsbPanel onArtifact={onArtifact} />}
        {currentTab === 'uniprot' && <UniProtPanel />}
        {currentTab === 'pubmed' && <PubMedPanel />}
        {currentTab === 'sciencedirect' && <ScienceDirectPanel />}
        {currentTab === 'citations' && <ScopusPanel />}
      </div>
    </div>
  )
}

const plugin: SaathiPlugin = {
  Component: BioPlugin,
  sourceLabel: 'RCSB PDB + UniProt + PubMed + ScienceDirect + Scopus',
  toolToTab: { rcsb: 'rcsb', pubmed: 'pubmed' },
}

export default plugin
