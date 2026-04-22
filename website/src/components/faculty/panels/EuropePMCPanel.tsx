'use client'

// ─────────────────────────────────────────────────────────────────────────────
// EuropePMCPanel — faculty solo dock
//
// Free life-science literature, CORS-enabled REST at EBI. No API key. Many
// results include open-access full text; we surface the direct full-text link
// when available so faculty skip the abstract hop.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useState } from 'react'
import { SaveArtifactButton } from '../SaveArtifactButton'

type Paper = {
  id:          string   // PMID or PMCID or DOI
  pmid?:       string
  pmcid?:      string
  title:       string
  authorString:string
  journalTitle:string
  pubYear:     string
  doi?:        string
  isOpenAccess:boolean
  fullTextUrl?:string
}

type EpmcRaw = {
  id?: string
  pmid?: string
  pmcid?: string
  title?: string
  authorString?: string
  journalTitle?: string
  pubYear?: string
  doi?: string
  isOpenAccess?: string
  fullTextUrlList?: { fullTextUrl?: Array<{ url?: string; documentStyle?: string }> }
}

type Props = { saathiSlug: string }

export function EuropePMCPanel({ saathiSlug }: Props) {
  const [query, setQuery]     = useState('')
  const [papers, setPapers]   = useState<Paper[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return
    setLoading(true); setError(''); setPapers([])
    try {
      const url = `https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=${encodeURIComponent(query.trim())}&format=json&resultType=core&pageSize=10`
      const res = await fetch(url)
      if (!res.ok) { setError('Search failed'); setLoading(false); return }
      const data = await res.json()
      const raw: EpmcRaw[] = data.resultList?.result ?? []

      const mapped: Paper[] = raw.map((r): Paper => {
        const fulltexts = r.fullTextUrlList?.fullTextUrl ?? []
        const openAccess = r.isOpenAccess === 'Y'
        const preferred = fulltexts.find((u) => u.documentStyle === 'html')
                      ?? fulltexts.find((u) => u.documentStyle === 'pdf')
                      ?? fulltexts[0]
        return {
          id:           r.id ?? r.pmid ?? r.pmcid ?? r.doi ?? '',
          pmid:         r.pmid,
          pmcid:        r.pmcid,
          title:        r.title ?? '—',
          authorString: r.authorString ?? '',
          journalTitle: r.journalTitle ?? '',
          pubYear:      r.pubYear ?? '',
          doi:          r.doi,
          isOpenAccess: openAccess,
          fullTextUrl:  preferred?.url,
        }
      })

      setPapers(mapped)
      if (mapped.length === 0) setError('No papers found')
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
          placeholder="Search Europe PMC… e.g. Parkinson's mitochondrial"
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
          const sourceUrl = p.pmcid
            ? `https://europepmc.org/article/PMC/${p.pmcid}`
            : p.pmid
              ? `https://europepmc.org/article/MED/${p.pmid}`
              : p.doi
                ? `https://doi.org/${p.doi}`
                : 'https://europepmc.org'

          return (
            <article
              key={p.id}
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
                {p.isOpenAccess && (
                  <span
                    style={{
                      flexShrink:    0,
                      fontSize:      9,
                      fontWeight:    700,
                      padding:       '1px 5px',
                      borderRadius:  4,
                      background:    'rgba(34,197,94,0.15)',
                      color:         '#16A34A',
                      letterSpacing: 0.4,
                    }}
                    title="Open access — full text available"
                  >
                    OA
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {p.authorString.split(',').slice(0, 3).join(', ')}
                {p.authorString.split(',').length > 3 ? ' et al.' : ''}
              </p>
              <p className="mt-0.5 text-[10px]" style={{ color: 'var(--text-ghost)' }}>
                {p.journalTitle} · {p.pubYear}
                {p.pmid ? ` · PMID: ${p.pmid}` : ''}
                {p.pmcid ? ` · ${p.pmcid}` : ''}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <SaveArtifactButton
                  saathiSlug={saathiSlug}
                  toolId="europepmc"
                  title={p.title}
                  payload={p as unknown as Record<string, unknown>}
                  sourceUrl={sourceUrl}
                />
                {p.fullTextUrl && (
                  <a
                    href={p.fullTextUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-semibold"
                    style={{ color: 'var(--gold)' }}
                  >
                    Full text →
                  </a>
                )}
              </div>
            </article>
          )
        })}

        {papers.length === 0 && !error && !loading && (
          <div className="flex flex-col items-center justify-center px-3 py-12 text-center">
            <p className="mb-1 text-3xl">📚</p>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              Search life-science papers — with full text when open-access
            </p>
            <p className="text-xs" style={{ color: 'var(--text-ghost)' }}>
              Europe PMC · EMBL-EBI · Free
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
