'use client'

// ─────────────────────────────────────────────────────────────────────────────
// PubMedPanel — faculty solo dock
//
// Adapted from the inline panel in classroom-plugins/biosaathi.tsx. Same
// /api/classroom/pubmed route (free NCBI, no rate limit). Standalone —
// no Liveblocks, no room context.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useState } from 'react'
import { SaveArtifactButton } from '../SaveArtifactButton'

type Paper = {
  pmid:    string
  title:   string
  authors: string[]
  journal: string
  year:    string
  doi:     string
}

type Props = {
  saathiSlug: string
}

export function PubMedPanel({ saathiSlug }: Props) {
  const [query, setQuery]     = useState('')
  const [papers, setPapers]   = useState<Paper[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return
    setLoading(true); setError(''); setPapers([])
    try {
      const res  = await fetch(`/api/classroom/pubmed?q=${encodeURIComponent(query.trim())}`)
      const data = await res.json()
      if (res.ok) {
        setPapers(data.papers ?? [])
        if ((data.papers ?? []).length === 0) setError('No papers found')
      } else {
        setError(data.error ?? 'Search failed')
      }
    } catch {
      setError('Search failed')
    }
    setLoading(false)
  }, [query])

  return (
    <div className="flex h-full flex-col">
      {/* Search bar */}
      <div
        className="flex shrink-0 items-center gap-2 px-3 py-2"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search PubMed… e.g. CRISPR off-target"
          className="flex-1 border-0 bg-transparent text-sm outline-none"
          style={{ color: 'var(--text-primary)' }}
        />
        <button
          onClick={handleSearch}
          disabled={loading || !query.trim()}
          className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-30"
          style={{ background: 'var(--gold)', color: '#fff' }}
        >
          {loading ? '…' : 'Search'}
        </button>
      </div>

      {/* Results */}
      <div className="flex-1 overflow-y-auto">
        {error && (
          <p className="px-3 py-6 text-center text-sm" style={{ color: 'var(--error)' }}>
            {error}
          </p>
        )}

        {papers.map((p) => (
          <article
            key={p.pmid}
            className="border-b px-3 py-3"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
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
              {p.journal} · {p.year} · PMID: {p.pmid}
            </p>
            <div className="mt-2">
              <SaveArtifactButton
                saathiSlug={saathiSlug}
                toolId="pubmed"
                title={p.title}
                payload={p as unknown as Record<string, unknown>}
                sourceUrl={`https://pubmed.ncbi.nlm.nih.gov/${p.pmid}`}
              />
            </div>
          </article>
        ))}

        {papers.length === 0 && !error && !loading && (
          <div className="flex flex-col items-center justify-center px-3 py-12 text-center">
            <p className="mb-1 text-3xl">📄</p>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              Search biomedical literature
            </p>
            <p className="text-xs" style={{ color: 'var(--text-ghost)' }}>
              PubMed · 36M+ citations · Free
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
