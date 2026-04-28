'use client'

// ─────────────────────────────────────────────────────────────────────────────
// PapersPanel — unified peer-reviewed paper search.
// Phase I-2 / Classroom redesign #4 — replaces standalone PubMed,
// ScienceDirect, and Scopus tabs with one panel, three filter chips.
//
// Search behaviour:
//   • Hits PubMed first (free, fastest, broadest coverage)
//   • PubMed results render as cards with title / authors / journal+year /
//     PMID badge / DOI / "View on PubMed →"
//   • Three filter chips below the search box: PubMed / ScienceDirect /
//     Scopus. All on by default. Toggling a chip OFF hides results from
//     that source. Toggling ScienceDirect or Scopus ON without prior
//     fetch triggers a fetch from that source and merges results into
//     the same scroll list (one card per result, source badge per card).
//   • Card click expands inline — DOI link + "Read on PubMed" CTA.
//     Full abstracts require an extra efetch and aren't fetched here;
//     the CTA opens the full paper page where the abstract lives.
//
// AutoQuery wiring: listens to the 'pubmed' tool (same name as before),
// so plugin toolToTab maps still route correctly to the renamed
// 📄 Papers tab.
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useCallback } from 'react'
import { useAutoQueryHandler } from '@/lib/classroom-plugins/useAutoQueryHandler'
import { FullscreenPanel } from './FullscreenPanel'

type PaperSource = 'PubMed' | 'ScienceDirect' | 'Scopus'

type Paper = {
  source:   PaperSource
  id:       string  // pmid for PubMed, doi for the others
  title:    string
  authors:  string  // formatted "First A, Second B et al."
  journal:  string
  year:     string
  doi:      string
  link:     string  // canonical view URL
}

type Props = {
  onArtifact?: (a: { type: string; source: string; source_url?: string; data: Record<string, unknown>; timestamp: string }) => unknown
}

const ALL_SOURCES: PaperSource[] = ['PubMed', 'ScienceDirect', 'Scopus']

export function PapersPanel({ onArtifact }: Props) {
  const [query,   setQuery]   = useState('')
  const [active,  setActive]  = useState<Set<PaperSource>>(new Set(ALL_SOURCES))
  const [pubmed,  setPubmed]  = useState<Paper[]>([])
  const [sd,      setSd]      = useState<Paper[]>([])
  const [scopus,  setScopus]  = useState<Paper[]>([])
  const [pmFetched,    setPmFetched]    = useState(false)
  const [sdFetched,    setSdFetched]    = useState(false)
  const [scopusFetched, setScopusFetched] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState('')
  const [expanded, setExpanded] = useState<string | null>(null)

  useAutoQueryHandler('pubmed', (params) => {
    const q = (params.query as string) ?? ''
    if (q) { setQuery(q); doSearch(q) }
  })

  // Truncate authors for card readability — first 2 + et al
  function fmtAuthors(arr: string[]): string {
    const list = arr.filter(Boolean)
    if (list.length === 0) return ''
    if (list.length === 1) return list[0]
    if (list.length === 2) return `${list[0]}, ${list[1]}`
    return `${list[0]}, ${list[1]} et al.`
  }

  // ── Per-source fetchers ────────────────────────────────────────────────
  async function fetchPubMed(q: string): Promise<Paper[]> {
    const res = await fetch(`/api/classroom/pubmed?q=${encodeURIComponent(q)}`)
    if (!res.ok) return []
    const data = await res.json()
    type Raw = { pmid: string; title: string; authors: string[]; journal: string; year: string; doi: string }
    return ((data.papers ?? []) as Raw[]).map((p) => ({
      source:  'PubMed',
      id:      p.pmid,
      title:   p.title,
      authors: fmtAuthors(p.authors ?? []),
      journal: p.journal,
      year:    p.year,
      doi:     p.doi,
      link:    `https://pubmed.ncbi.nlm.nih.gov/${p.pmid}/`,
    }))
  }
  async function fetchScienceDirect(q: string): Promise<Paper[]> {
    const res = await fetch(`/api/classroom/elsevier?q=${encodeURIComponent(q)}`)
    if (!res.ok) return []
    const data = await res.json()
    type Raw = { title: string; authors: string; publication: string; date: string; doi: string; link: string }
    return ((data.articles ?? []) as Raw[]).map((a) => ({
      source:  'ScienceDirect',
      id:      a.doi || a.link,
      title:   a.title,
      authors: a.authors,
      journal: a.publication,
      year:    (a.date ?? '').slice(0, 4),
      doi:     a.doi,
      link:    a.link,
    }))
  }
  async function fetchScopus(q: string): Promise<Paper[]> {
    const res = await fetch(`/api/classroom/scopus?q=${encodeURIComponent(q)}`)
    if (!res.ok) return []
    const data = await res.json()
    type Raw = { title: string; authors: string; publication: string; date: string; doi: string; citedByCount: string; link: string }
    return ((data.citations ?? []) as Raw[]).map((c) => ({
      source:  'Scopus',
      id:      c.doi || c.link,
      title:   c.title,
      authors: c.authors,
      journal: c.publication,
      year:    (c.date ?? '').slice(0, 4),
      doi:     c.doi,
      link:    c.link,
    }))
  }

  // ── Top-level search ───────────────────────────────────────────────────
  const doSearch = useCallback(async (q: string) => {
    if (!q.trim()) return
    setLoading(true)
    setError('')
    setPubmed([])
    setSd([])
    setScopus([])
    setPmFetched(false)
    setSdFetched(false)
    setScopusFetched(false)
    setExpanded(null)

    // PubMed always — it's the primary source
    const pm = await fetchPubMed(q.trim())
    setPubmed(pm)
    setPmFetched(true)
    if (pm.length === 0) setError('No PubMed results.')

    if (pm.length > 0) {
      onArtifact?.({
        type:       'pubmed_citation',
        source:     'PubMed',
        source_url: pm[0].link,
        data:       { pmid: pm[0].id, title: pm[0].title, query: q.trim() },
        timestamp:  new Date().toISOString(),
      })
    }

    // Pre-fetch the other two when the chip is active by default. If the
    // user has toggled them off before searching, skip — saves an API call.
    if (active.has('ScienceDirect')) {
      fetchScienceDirect(q.trim()).then((rows) => {
        setSd(rows)
        setSdFetched(true)
      }).catch(() => setSdFetched(true))
    }
    if (active.has('Scopus')) {
      fetchScopus(q.trim()).then((rows) => {
        setScopus(rows)
        setScopusFetched(true)
      }).catch(() => setScopusFetched(true))
    }

    setLoading(false)
  }, [active, onArtifact])

  // Toggle a chip. If toggling ON for the first time after a search ran,
  // backfill the source's results.
  function toggleSource(src: PaperSource) {
    setActive((prev) => {
      const next = new Set(prev)
      if (next.has(src)) {
        next.delete(src)
      } else {
        next.add(src)
        // Backfill if we have a query but never fetched this source
        const q = query.trim()
        if (q) {
          if (src === 'ScienceDirect' && !sdFetched) {
            fetchScienceDirect(q).then((rows) => { setSd(rows); setSdFetched(true) }).catch(() => setSdFetched(true))
          } else if (src === 'Scopus' && !scopusFetched) {
            fetchScopus(q).then((rows) => { setScopus(rows); setScopusFetched(true) }).catch(() => setScopusFetched(true))
          } else if (src === 'PubMed' && !pmFetched) {
            fetchPubMed(q).then((rows) => { setPubmed(rows); setPmFetched(true) }).catch(() => setPmFetched(true))
          }
        }
      }
      return next
    })
  }

  // Visible result list — merge then filter by active chips
  const visible: Paper[] = [
    ...(active.has('PubMed')        ? pubmed : []),
    ...(active.has('ScienceDirect') ? sd     : []),
    ...(active.has('Scopus')        ? scopus : []),
  ]

  return (
    <FullscreenPanel label="Papers">
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
            onKeyDown={(e) => e.key === 'Enter' && doSearch(query)}
            placeholder="Search research papers and journals..."
            className="flex-1 border-0 bg-transparent text-sm outline-none"
            style={{ color: 'var(--text-primary)' }}
          />
          <button
            type="button"
            onClick={() => doSearch(query)}
            disabled={loading || !query.trim()}
            className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold disabled:opacity-30"
            style={{ background: 'var(--gold)', color: 'var(--bg-surface)' }}
          >
            {loading ? '…' : 'Search'}
          </button>
        </div>

        {/* Source filter chips */}
        <div
          className="flex shrink-0 flex-wrap items-center gap-1.5 px-3 py-2"
          style={{
            background:   'var(--bg-elevated)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          {ALL_SOURCES.map((s) => {
            const on = active.has(s)
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleSource(s)}
                className="rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors"
                style={{
                  background: on ? 'var(--gold)' : 'transparent',
                  color:      on ? 'var(--bg-surface)' : 'var(--text-tertiary)',
                  border:     on ? '1px solid var(--gold)' : '1px solid var(--border-subtle)',
                }}
              >
                {on ? '✓ ' : ''}{s}
              </button>
            )
          })}
        </div>

        {/* Results */}
        <div className="flex-1 overflow-y-auto">
          {error && visible.length === 0 && (
            <p className="px-3 py-6 text-center text-sm" style={{ color: 'var(--text-tertiary)' }}>
              {error}
            </p>
          )}

          {visible.map((p) => {
            const cardKey = `${p.source}:${p.id}`
            const isOpen  = expanded === cardKey
            return (
              <div
                key={cardKey}
                className="border-b px-3 py-3"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <button
                  type="button"
                  onClick={() => setExpanded((cur) => (cur === cardKey ? null : cardKey))}
                  className="block w-full text-left"
                  style={{ background: 'transparent', cursor: 'pointer' }}
                >
                  <div className="mb-1 flex items-start gap-2">
                    <span
                      className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider"
                      style={{
                        background:    p.source === 'PubMed' ? '#16A34A22'
                                     : p.source === 'ScienceDirect' ? '#0EA5E922'
                                     : '#7C3AED22',
                        color:         p.source === 'PubMed' ? '#15803D'
                                     : p.source === 'ScienceDirect' ? '#0369A1'
                                     : '#6D28D9',
                        letterSpacing: '0.06em',
                      }}
                    >
                      {p.source}
                    </span>
                    {p.source === 'PubMed' && (
                      <span
                        className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                        style={{
                          background: 'var(--bg-elevated)',
                          color:      'var(--text-ghost)',
                          fontFamily: 'var(--font-mono)',
                        }}
                      >
                        PMID {p.id}
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>
                    {p.title}
                  </p>
                  {p.authors && (
                    <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                      {p.authors}
                    </p>
                  )}
                  <p className="mt-0.5 text-[10px]" style={{ color: 'var(--text-ghost)' }}>
                    {p.journal}{p.year ? ` · ${p.year}` : ''}{p.doi ? ` · DOI: ${p.doi}` : ''}
                  </p>
                </button>

                {isOpen && (
                  <div
                    className="mt-2.5 rounded-md px-3 py-2"
                    style={{
                      background: 'var(--bg-elevated)',
                      border:     '1px solid var(--border-subtle)',
                    }}
                  >
                    {p.doi && (
                      <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                        DOI: <span style={{ fontFamily: 'var(--font-mono)' }}>{p.doi}</span>
                      </p>
                    )}
                    <a
                      href={p.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2 inline-block text-xs font-semibold"
                      style={{ color: 'var(--gold)' }}
                    >
                      View on {p.source} →
                    </a>
                    <p className="mt-1.5 text-[10px] italic" style={{ color: 'var(--text-ghost)' }}>
                      Full text requires institutional access where applicable.
                    </p>
                  </div>
                )}
              </div>
            )
          })}

          {/* Idle / empty state */}
          {visible.length === 0 && !error && !loading && (
            <div className="flex flex-col items-center justify-center px-3 py-12 text-center">
              <p className="mb-2 text-3xl">📄</p>
              <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
                Search peer-reviewed research
              </p>
              <p className="text-xs" style={{ color: 'var(--text-ghost)' }}>
                Try: CRISPR, troponin, photosynthesis
              </p>
            </div>
          )}
        </div>
      </div>
    </FullscreenPanel>
  )
}
