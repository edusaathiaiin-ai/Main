'use client'

// ─────────────────────────────────────────────────────────────────────────────
// UniProtPanel — faculty solo dock
//
// Direct-to-EBI REST call — no proxy needed, UniProt serves CORS for
// rest.uniprot.org. Same shape as the inline version in biosaathi.tsx.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useState } from 'react'
import { SaveArtifactButton } from '../SaveArtifactButton'

type UniProtHit = {
  accession:     string
  name:          string
  organism:      string
  gene:          string
  function_text: string
}

type UniProtRaw = {
  primaryAccession?: string
  proteinDescription?: { recommendedName?: { fullName?: { value?: string } } }
  organism?: { scientificName?: string }
  genes?: Array<{ geneName?: { value?: string } }>
  comments?: Array<{ texts?: Array<{ value?: string }> }>
}

type Props = {
  saathiSlug: string
}

export function UniProtPanel({ saathiSlug }: Props) {
  const [query, setQuery]     = useState('')
  const [results, setResults] = useState<UniProtHit[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return
    setLoading(true); setError(''); setResults([])
    try {
      const url = `https://rest.uniprot.org/uniprotkb/search?query=${encodeURIComponent(query.trim())}&size=8&fields=accession,protein_name,organism_name,gene_names,cc_function&format=json`
      const res = await fetch(url)
      if (!res.ok) { setError('Search failed'); setLoading(false); return }
      const data = await res.json()

      const mapped: UniProtHit[] = (data.results ?? []).map((r: UniProtRaw) => ({
        accession:     r.primaryAccession ?? '',
        name:          r.proteinDescription?.recommendedName?.fullName?.value ?? 'Unknown',
        organism:      r.organism?.scientificName ?? '',
        gene:          r.genes?.[0]?.geneName?.value ?? '',
        function_text: r.comments?.[0]?.texts?.[0]?.value ?? '',
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
          placeholder="Search UniProt… e.g. insulin, p53"
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

        {results.map((r) => (
          <article
            key={r.accession}
            className="border-b px-3 py-3"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                {r.name}
              </p>
              <span
                className="shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-bold"
                style={{
                  background: 'var(--bg-elevated)',
                  color:      'var(--text-ghost)',
                  fontFamily: 'var(--font-mono)',
                }}
              >
                {r.accession}
              </span>
            </div>
            {r.gene     && <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>Gene: {r.gene}</p>}
            {r.organism && <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>{r.organism}</p>}
            {r.function_text && (
              <p className="mt-1 line-clamp-3 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {r.function_text}
              </p>
            )}
            <div className="mt-2 flex items-center gap-2">
              <SaveArtifactButton
                saathiSlug={saathiSlug}
                toolId="uniprot"
                title={r.name}
                payload={r as unknown as Record<string, unknown>}
                sourceUrl={`https://www.uniprot.org/uniprot/${r.accession}`}
              />
              <a
                href={`https://www.uniprot.org/uniprot/${r.accession}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-[10px] font-semibold"
                style={{ color: 'var(--gold)' }}
              >
                View on UniProt →
              </a>
            </div>
          </article>
        ))}

        {results.length === 0 && !error && !loading && (
          <div className="flex flex-col items-center justify-center px-3 py-12 text-center">
            <p className="mb-1 text-3xl">🔬</p>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              Search protein function & disease
            </p>
            <p className="text-xs" style={{ color: 'var(--text-ghost)' }}>
              UniProt · 250M+ sequences · Free
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
