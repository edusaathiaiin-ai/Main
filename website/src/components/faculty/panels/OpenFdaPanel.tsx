'use client'

// ─────────────────────────────────────────────────────────────────────────────
// OpenFdaPanel — faculty solo dock
//
// FDA drug label lookups (openFDA). CORS-enabled, no API key required for
// public rate limit (~240 requests / minute per IP). We surface brand name,
// generic name, key indications, warnings, and link to the full label.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useState } from 'react'
import { SaveArtifactButton } from '../SaveArtifactButton'

type DrugHit = {
  id:                string
  brand:             string
  generic:           string
  manufacturer:      string
  indications:       string
  warnings:          string
  dosage:            string
}

type FdaResult = {
  id?: string
  openfda?: {
    brand_name?: string[]
    generic_name?: string[]
    manufacturer_name?: string[]
  }
  indications_and_usage?: string[]
  warnings?: string[]
  dosage_and_administration?: string[]
}

type Props = { saathiSlug: string }

function firstLine(arr: string[] | undefined, maxLen = 320): string {
  if (!arr || !arr.length) return ''
  return (arr[0] ?? '').replace(/\s+/g, ' ').trim().slice(0, maxLen)
}

export function OpenFdaPanel({ saathiSlug }: Props) {
  const [query, setQuery]     = useState('')
  const [hits, setHits]       = useState<DrugHit[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return
    setLoading(true); setError(''); setHits([])
    try {
      // Search across brand + generic name fields for flexibility.
      const q   = query.trim().replace(/\s+/g, '+')
      const url = `https://api.fda.gov/drug/label.json?search=openfda.brand_name:${encodeURIComponent(q)}+openfda.generic_name:${encodeURIComponent(q)}&limit=8`
      const res = await fetch(url)
      if (res.status === 404) { setError('No matching drug labels'); setLoading(false); return }
      if (!res.ok) { setError('Search failed'); setLoading(false); return }
      const data = await res.json() as { results?: FdaResult[] }
      const raw  = data.results ?? []

      const mapped: DrugHit[] = raw.map((r, i): DrugHit => ({
        id:           r.id ?? `hit-${i}`,
        brand:        r.openfda?.brand_name?.[0]        ?? '',
        generic:      r.openfda?.generic_name?.[0]      ?? '',
        manufacturer: r.openfda?.manufacturer_name?.[0] ?? '',
        indications:  firstLine(r.indications_and_usage),
        warnings:     firstLine(r.warnings, 260),
        dosage:       firstLine(r.dosage_and_administration, 200),
      })).filter((d) => d.brand || d.generic)

      setHits(mapped)
      if (mapped.length === 0) setError('No matching drug labels')
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
          placeholder="Search drug labels… e.g. metformin"
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

        {hits.map((h) => {
          const title = h.brand || h.generic
          const sourceUrl = `https://www.fda.gov/drugsatfda_docs/label/search?query=${encodeURIComponent(title)}`
          return (
            <article
              key={h.id}
              className="border-b px-3 py-3"
              style={{ borderColor: 'var(--border-subtle)' }}
            >
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {h.brand || h.generic}
              </p>
              {h.brand && h.generic && h.brand !== h.generic && (
                <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                  Generic: {h.generic}
                </p>
              )}
              {h.manufacturer && (
                <p className="text-[10px]" style={{ color: 'var(--text-ghost)' }}>
                  {h.manufacturer}
                </p>
              )}
              {h.indications && (
                <>
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--text-ghost)' }}>
                    Indications
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {h.indications}
                  </p>
                </>
              )}
              {h.warnings && (
                <>
                  <p className="mt-2 text-[10px] font-bold uppercase tracking-wide" style={{ color: '#EF4444' }}>
                    Warnings
                  </p>
                  <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {h.warnings}
                  </p>
                </>
              )}
              <div className="mt-2">
                <SaveArtifactButton
                  saathiSlug={saathiSlug}
                  toolId="openfda"
                  title={title}
                  payload={h as unknown as Record<string, unknown>}
                  sourceUrl={sourceUrl}
                />
              </div>
            </article>
          )
        })}

        {hits.length === 0 && !error && !loading && (
          <div className="flex flex-col items-center justify-center px-3 py-12 text-center">
            <p className="mb-1 text-3xl">💊</p>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              Search FDA drug labels — indications, warnings, dosage
            </p>
            <p className="text-xs" style={{ color: 'var(--text-ghost)' }}>
              openFDA · Free · No key
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
