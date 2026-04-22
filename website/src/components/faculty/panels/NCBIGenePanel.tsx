'use client'

// ─────────────────────────────────────────────────────────────────────────────
// NCBIGenePanel — faculty solo dock
// Free NCBI Gene lookup. Uses E-utilities esearch + esummary via the existing
// classroom proxy pattern? No — NCBI serves CORS on eutils.ncbi.nlm.nih.gov,
// so we hit it directly from the browser to keep this self-contained.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useState } from 'react'
import { SaveArtifactButton } from '../SaveArtifactButton'

type Gene = {
  uid:       string
  symbol:    string
  name:      string
  organism:  string
  chromo:    string
  maploc:    string
  summary:   string
}

type EsummaryRaw = {
  uid?: string
  name?: string
  description?: string
  organism?: { scientificname?: string; commonname?: string }
  chromosome?: string
  maplocation?: string
  summary?: string
}

type Props = { saathiSlug: string }

export function NCBIGenePanel({ saathiSlug }: Props) {
  const [query, setQuery]     = useState('')
  const [genes, setGenes]     = useState<Gene[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return
    setLoading(true); setError(''); setGenes([])
    try {
      // Step 1 — esearch to collect UIDs
      const sUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=gene&term=${encodeURIComponent(query.trim())}&retmax=10&retmode=json`
      const sRes = await fetch(sUrl)
      if (!sRes.ok) { setError('Search failed'); setLoading(false); return }
      const sData = await sRes.json()
      const uids: string[] = sData.esearchresult?.idlist ?? []
      if (uids.length === 0) { setError('No genes found'); setLoading(false); return }

      // Step 2 — esummary for metadata
      const mUrl = `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=gene&id=${uids.join(',')}&retmode=json`
      const mRes = await fetch(mUrl)
      const mData = await mRes.json()
      const result = mData.result ?? {}
      const mapped: Gene[] = uids.map((uid) => {
        const g: EsummaryRaw = result[uid] ?? {}
        const org = g.organism?.scientificname ?? g.organism?.commonname ?? ''
        return {
          uid,
          symbol:   g.name ?? '',
          name:     g.description ?? '',
          organism: org,
          chromo:   g.chromosome ?? '',
          maploc:   g.maplocation ?? '',
          summary:  (g.summary ?? '').slice(0, 280),
        }
      }).filter((g) => g.symbol)

      setGenes(mapped)
      if (mapped.length === 0) setError('No genes found')
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
          placeholder="Search NCBI Gene… e.g. TP53 human"
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

        {genes.map((g) => {
          const sourceUrl = `https://www.ncbi.nlm.nih.gov/gene/${g.uid}`
          return (
            <article key={g.uid} className="border-b px-3 py-3" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-start justify-between gap-2">
                <a href={sourceUrl} target="_blank" rel="noopener noreferrer"
                   className="text-sm font-semibold leading-snug"
                   style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>
                  {g.symbol} — {g.name}
                </a>
                <span style={{
                  flexShrink: 0, fontSize: 10, fontWeight: 700, padding: '1px 5px',
                  borderRadius: 4, background: 'var(--bg-elevated)', color: 'var(--text-ghost)',
                  fontFamily: 'var(--font-mono)',
                }}>
                  {g.uid}
                </span>
              </div>
              {g.organism && <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>{g.organism}</p>}
              {(g.chromo || g.maploc) && (
                <p className="text-[10px]" style={{ color: 'var(--text-ghost)' }}>
                  {g.chromo ? `Chr ${g.chromo}` : ''}{g.chromo && g.maploc ? ' · ' : ''}{g.maploc}
                </p>
              )}
              {g.summary && (
                <p className="mt-1 line-clamp-3 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {g.summary}
                </p>
              )}
              <div className="mt-2">
                <SaveArtifactButton
                  saathiSlug={saathiSlug}
                  toolId="ncbi-gene"
                  title={`${g.symbol} — ${g.name}`}
                  payload={g as unknown as Record<string, unknown>}
                  sourceUrl={sourceUrl}
                />
              </div>
            </article>
          )
        })}

        {genes.length === 0 && !error && !loading && (
          <div className="flex flex-col items-center justify-center px-3 py-12 text-center">
            <p className="mb-1 text-3xl">🧬</p>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Search curated gene records</p>
            <p className="text-xs" style={{ color: 'var(--text-ghost)' }}>NCBI Gene · Free</p>
          </div>
        )}
      </div>
    </div>
  )
}
