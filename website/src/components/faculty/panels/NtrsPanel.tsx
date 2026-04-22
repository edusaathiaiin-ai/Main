'use client'

// ─────────────────────────────────────────────────────────────────────────────
// NtrsPanel — NASA Technical Reports Server
// Public JSON API at ntrs.nasa.gov/api/citations/search. CORS-enabled, no key.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useState } from 'react'
import { SaveArtifactButton } from '../SaveArtifactButton'

type Report = {
  id:               string
  title:            string
  subtitle:         string
  authors:          string
  publication_date: string
  center_names:     string
  abstract:         string
  pdf_url:          string
}

type NtrsHit = {
  id?: number
  stiType?: string
  title?: string
  subtitle?: string
  authorAffiliations?: Array<{ meta?: { author?: { name?: string } } }>
  distributionDate?: string
  center?: { name?: string }
  abstract?: string
  downloads?: Array<{ links?: { original?: string }; name?: string }>
}

type Props = { saathiSlug: string }

export function NtrsPanel({ saathiSlug }: Props) {
  const [query, setQuery]     = useState('')
  const [hits, setHits]       = useState<Report[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return
    setLoading(true); setError(''); setHits([])
    try {
      const url = `https://ntrs.nasa.gov/api/citations/search?q=${encodeURIComponent(query.trim())}&page.size=10&page.from=0`
      const res = await fetch(url)
      if (!res.ok) { setError('Search failed'); setLoading(false); return }
      const data = await res.json() as { results?: NtrsHit[] }
      const raw  = data.results ?? []

      const mapped: Report[] = raw.map((r): Report => {
        const authors = (r.authorAffiliations ?? [])
          .map((a) => a.meta?.author?.name)
          .filter(Boolean)
          .slice(0, 4)
          .join(', ')
        const pdf = r.downloads?.find((d) => d.name?.toLowerCase().includes('.pdf'))?.links?.original ?? ''
        return {
          id:               String(r.id ?? ''),
          title:            r.title ?? '—',
          subtitle:         r.subtitle ?? '',
          authors,
          publication_date: (r.distributionDate ?? '').slice(0, 10),
          center_names:     r.center?.name ?? '',
          abstract:         (r.abstract ?? '').slice(0, 320),
          pdf_url:          pdf,
        }
      }).filter((r) => r.id && r.title !== '—')

      setHits(mapped)
      if (mapped.length === 0) setError('No reports found')
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
          placeholder="Search NASA reports… e.g. Mars rover thermal"
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

        {hits.map((r) => {
          const sourceUrl = `https://ntrs.nasa.gov/citations/${r.id}`
          return (
            <article key={r.id} className="border-b px-3 py-3" style={{ borderColor: 'var(--border-subtle)' }}>
              <a href={sourceUrl} target="_blank" rel="noopener noreferrer"
                 className="text-sm font-semibold leading-snug"
                 style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>
                {r.title}
              </a>
              {r.subtitle && (
                <p className="mt-0.5 text-[11px] italic" style={{ color: 'var(--text-tertiary)' }}>
                  {r.subtitle}
                </p>
              )}
              {r.authors && <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>{r.authors}</p>}
              <p className="mt-0.5 text-[10px]" style={{ color: 'var(--text-ghost)' }}>
                {r.center_names}{r.center_names && r.publication_date ? ' · ' : ''}{r.publication_date}
              </p>
              {r.abstract && (
                <p className="mt-1 line-clamp-3 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {r.abstract}
                </p>
              )}
              <div className="mt-2 flex items-center gap-2">
                <SaveArtifactButton
                  saathiSlug={saathiSlug}
                  toolId="ntrs"
                  title={r.title}
                  payload={r as unknown as Record<string, unknown>}
                  sourceUrl={sourceUrl}
                />
                {r.pdf_url && (
                  <a href={r.pdf_url} target="_blank" rel="noopener noreferrer"
                     className="text-[10px] font-semibold" style={{ color: 'var(--gold)' }}>
                    PDF →
                  </a>
                )}
              </div>
            </article>
          )
        })}

        {hits.length === 0 && !error && !loading && (
          <div className="flex flex-col items-center justify-center px-3 py-12 text-center">
            <p className="mb-1 text-3xl">🛰️</p>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Search NASA&apos;s full technical-report archive</p>
            <p className="text-xs" style={{ color: 'var(--text-ghost)' }}>NTRS · Free</p>
          </div>
        )}
      </div>
    </div>
  )
}
