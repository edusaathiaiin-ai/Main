'use client'

// ─────────────────────────────────────────────────────────────────────────────
// SemanticScholarPanel — faculty solo dock
//
// Allen Institute for AI's Semantic Scholar graph. Public tier allows ~100
// requests / 5-minute window without a key. CORS is enabled server-side.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useState } from 'react'
import { SaveArtifactButton } from '../SaveArtifactButton'

type Paper = {
  paperId:     string
  title:       string
  abstract:    string | null
  year:        number | null
  venue:       string | null
  citationCount: number | null
  authors:     { name: string }[]
}

type Props = { saathiSlug: string }

export function SemanticScholarPanel({ saathiSlug }: Props) {
  const [query, setQuery]     = useState('')
  const [papers, setPapers]   = useState<Paper[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return
    setLoading(true); setError(''); setPapers([])
    try {
      const fields = 'title,abstract,year,venue,citationCount,authors'
      const url    = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query.trim())}&limit=10&fields=${fields}`
      const res    = await fetch(url)
      if (res.status === 429) {
        setError('Rate-limited — try again in a few seconds.')
        setLoading(false); return
      }
      if (!res.ok) { setError('Search failed'); setLoading(false); return }
      const data = await res.json() as { data?: Paper[] }
      const list = data.data ?? []
      setPapers(list)
      if (list.length === 0) setError('No papers found')
    } catch {
      setError('Search failed')
    }
    setLoading(false)
  }, [query])

  return (
    <div className="flex h-full flex-col">
      <div
        className="flex shrink-0 items-center gap-2 px-3 py-2"
        style={{ borderBottom: '1px solid var(--border-subtle)' }}
      >
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search Semantic Scholar… e.g. transformer attention"
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

      <div className="flex-1 overflow-y-auto">
        {error && <p className="px-3 py-6 text-center text-sm" style={{ color: 'var(--error)' }}>{error}</p>}

        {papers.map((p) => {
          const sourceUrl = `https://www.semanticscholar.org/paper/${p.paperId}`
          const authorLine = p.authors.slice(0, 3).map((a) => a.name).join(', ') +
                             (p.authors.length > 3 ? ' et al.' : '')
          return (
            <article
              key={p.paperId}
              className="border-b px-3 py-3"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <div className="flex items-start justify-between gap-2">
                <a
                  href={sourceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-semibold leading-snug"
                  style={{ color: 'var(--text-primary)', textDecoration: 'none' }}
                >
                  {p.title}
                </a>
                {typeof p.citationCount === 'number' && (
                  <span
                    style={{
                      flexShrink:    0,
                      fontSize:      9,
                      fontWeight:    700,
                      padding:       '1px 5px',
                      borderRadius:  4,
                      background:    'var(--bg-elevated)',
                      color:         'var(--text-secondary)',
                      letterSpacing: 0.3,
                    }}
                    title="Citations"
                  >
                    {p.citationCount}★
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>{authorLine}</p>
              <p className="mt-0.5 text-[10px]" style={{ color: 'var(--text-ghost)' }}>
                {p.venue ?? ''}{p.venue && p.year ? ' · ' : ''}{p.year ?? ''}
              </p>
              {p.abstract && (
                <p className="mt-1 line-clamp-3 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {p.abstract}
                </p>
              )}
              <div className="mt-2">
                <SaveArtifactButton
                  saathiSlug={saathiSlug}
                  toolId="semantic-scholar"
                  title={p.title}
                  payload={p as unknown as Record<string, unknown>}
                  sourceUrl={sourceUrl}
                />
              </div>
            </article>
          )
        })}

        {papers.length === 0 && !error && !loading && (
          <div className="flex flex-col items-center justify-center px-3 py-12 text-center">
            <p className="mb-1 text-3xl">🎓</p>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              Search across every discipline — citation counts included
            </p>
            <p className="text-xs" style={{ color: 'var(--text-ghost)' }}>
              Semantic Scholar · Allen AI · Free
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
