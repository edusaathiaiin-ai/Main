'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { useAutoSearch } from '@/lib/classroom-plugins/useAutoSearch'

type PdbResult = {
  pdb_id: string; title: string; organism: string
  resolution: number | null; pdb_data: string | null
}

type Props = {
  placeholder?: string
  initialQuery?: string | null
  onQueryConsumed?: () => void
  onArtifact?: (a: { type: string; source: string; source_url?: string; data: Record<string, unknown>; timestamp: string }) => unknown
}

export function RcsbPanel({ placeholder, initialQuery, onQueryConsumed, onArtifact }: Props) {
  const [query, setQuery] = useState('')
  const [searchResults, setSearchResults] = useState<{ pdb_id: string }[]>([])
  const [structure, setStructure] = useState<PdbResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const viewerRef = useRef<HTMLDivElement>(null)
  const viewerInstanceRef = useRef<unknown>(null)

  // Universal auto-search from TA command bar
  useAutoSearch('rcsb', (params) => {
    const q = (params.protein_name as string) ?? (params.pdb_id as string) ?? ''
    if (q) { setQuery(q); doSearch(q) }
    return q
  })

  // Legacy prop-based auto-search (for plugins that still pass initialQuery)
  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery)
      onQueryConsumed?.()
      doSearch(initialQuery)
    }
  }, [initialQuery]) // eslint-disable-line react-hooks/exhaustive-deps

  async function doSearch(q: string) {
    if (!q.trim()) return
    setLoading(true); setError(''); setSearchResults([]); setStructure(null)

    if (/^[a-zA-Z0-9]{4}$/.test(q.trim())) {
      try {
        const res = await fetch(`/api/classroom/rcsb?pdb=${q.trim()}`)
        const data = await res.json()
        if (res.ok) { setStructure(data); emitProtein(data) }
        else setError(data.error)
      } catch { setError('Failed') }
      setLoading(false)
      return
    }

    try {
      const res = await fetch(`/api/classroom/rcsb?q=${encodeURIComponent(q.trim())}`)
      const data = await res.json()
      setSearchResults(data.results ?? [])
      if (data.results?.length === 0) setError('No structures found')
    } catch { setError('Search failed') }
    setLoading(false)
  }

  const handleSearch = useCallback(() => { doSearch(query) }, [query]) // eslint-disable-line react-hooks/exhaustive-deps

  const loadStructure = useCallback(async (pdbId: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/classroom/rcsb?pdb=${pdbId}`)
      const data = await res.json()
      if (res.ok) { setStructure(data); setSearchResults([]); emitProtein(data) }
    } catch { /* ignore */ }
    setLoading(false)
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function emitProtein(data: PdbResult) {
    onArtifact?.({
      type: 'protein_structure',
      source: 'RCSB Protein Data Bank',
      source_url: `https://www.rcsb.org/structure/${data.pdb_id}`,
      data: { pdb_id: data.pdb_id, title: data.title, organism: data.organism, resolution: data.resolution },
      timestamp: new Date().toISOString(),
    })
  }

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
        createViewer: (el: HTMLElement, cfg: Record<string, unknown>) => {
          addModel: (d: string, f: string) => void
          setStyle: (s: Record<string, unknown>, st: Record<string, unknown>) => void
          zoomTo: () => void; render: () => void; clear: () => void
        }
      } | undefined
      if (!$3Dmol || !viewerRef.current) return
      if (viewerInstanceRef.current) (viewerInstanceRef.current as { clear: () => void }).clear()
      viewerRef.current.innerHTML = ''
      const viewer = $3Dmol.createViewer(viewerRef.current, { backgroundColor: '#FAFAF8' })
      viewer.addModel(structure!.pdb_data!, 'pdb')
      viewer.setStyle({}, { cartoon: { color: 'spectrum' } })
      viewer.zoomTo(); viewer.render()
      viewerInstanceRef.current = viewer
    }
  }, [structure])

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-2 px-3 py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <input type="text" value={query} onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder={placeholder ?? 'Search protein... e.g. Hemoglobin, 1J1E'}
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
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                PDB: {structure.pdb_id} · {structure.organism ?? 'N/A'}
                {structure.resolution && ` · ${structure.resolution} Å`}
              </p>
              <a href={`https://www.rcsb.org/structure/${structure.pdb_id}`} target="_blank" rel="noopener noreferrer"
                className="inline-block text-xs font-semibold" style={{ color: 'var(--gold)' }}>View on RCSB →</a>
            </div>
          </div>
        )}
        {!structure && searchResults.length === 0 && !error && !loading && (
          <div className="flex flex-col items-center justify-center px-3 py-12 text-center">
            <p className="mb-1 text-3xl">🧬</p>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Search protein structures</p>
            <p className="text-xs" style={{ color: 'var(--text-ghost)' }}>RCSB PDB — 200,000+ structures</p>
          </div>
        )}
      </div>
    </div>
  )
}
