'use client'

// ─────────────────────────────────────────────────────────────────────────────
// EnsemblPanel — faculty solo dock
// Ensembl REST API at rest.ensembl.org. CORS-enabled, no key. We use the
// xrefs/symbol endpoint for gene symbol → Ensembl ID, then lookup/id for
// metadata (species, biotype, location).
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useState } from 'react'
import { SaveArtifactButton } from '../SaveArtifactButton'

type Hit = {
  id:          string
  display_name:string
  species:     string
  biotype:     string
  seq_region:  string
  start:       number
  end:         number
  strand:      number
  description: string
}

type Props = { saathiSlug: string }

const SPECIES = [
  { value: 'homo_sapiens',    label: 'Human' },
  { value: 'mus_musculus',    label: 'Mouse' },
  { value: 'rattus_norvegicus', label: 'Rat' },
  { value: 'danio_rerio',     label: 'Zebrafish' },
  { value: 'drosophila_melanogaster', label: 'Fruit fly' },
  { value: 'saccharomyces_cerevisiae', label: 'Yeast' },
]

export function EnsemblPanel({ saathiSlug }: Props) {
  const [query, setQuery]     = useState('')
  const [species, setSpecies] = useState('homo_sapiens')
  const [hits, setHits]       = useState<Hit[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return
    setLoading(true); setError(''); setHits([])
    try {
      const xUrl = `https://rest.ensembl.org/xrefs/symbol/${species}/${encodeURIComponent(query.trim())}?content-type=application/json`
      const xRes = await fetch(xUrl)
      if (!xRes.ok) { setError('Search failed'); setLoading(false); return }
      const xData = await xRes.json() as Array<{ id?: string; type?: string }>
      const ids = xData.filter((x) => x.type === 'gene' && x.id).map((x) => x.id!).slice(0, 8)
      if (ids.length === 0) { setError('No matching genes'); setLoading(false); return }

      // Batch lookup via POST /lookup/id
      const lRes = await fetch('https://rest.ensembl.org/lookup/id', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept':       'application/json',
        },
        body: JSON.stringify({ ids, expand: 0 }),
      })
      if (!lRes.ok) { setError('Lookup failed'); setLoading(false); return }
      const lData = await lRes.json() as Record<string, {
        id?: string; display_name?: string; species?: string; biotype?: string
        seq_region_name?: string; start?: number; end?: number; strand?: number
        description?: string
      }>

      const mapped: Hit[] = ids.map((id): Hit => {
        const g = lData[id] ?? {}
        return {
          id,
          display_name: g.display_name ?? '',
          species:      g.species ?? species,
          biotype:      g.biotype ?? '',
          seq_region:   g.seq_region_name ?? '',
          start:        g.start ?? 0,
          end:          g.end ?? 0,
          strand:       g.strand ?? 0,
          description:  (g.description ?? '').split(' [Source')[0].slice(0, 260),
        }
      })

      setHits(mapped)
    } catch {
      setError('Search failed')
    }
    setLoading(false)
  }, [query, species])

  return (
    <div className="flex h-full flex-col">
      <div className="flex shrink-0 items-center gap-2 px-3 py-2" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <select
          value={species}
          onChange={(e) => setSpecies(e.target.value)}
          className="shrink-0 rounded-md border px-1 py-1 text-[11px]"
          style={{
            background:   'var(--bg-elevated)',
            borderColor:  'var(--border-subtle)',
            color:        'var(--text-secondary)',
          }}
        >
          {SPECIES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Gene symbol… e.g. BRCA1"
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
          const sourceUrl = `https://www.ensembl.org/${h.species}/Gene/Summary?g=${h.id}`
          const position  = h.seq_region ? `${h.seq_region}:${h.start.toLocaleString()}–${h.end.toLocaleString()}${h.strand === -1 ? ' −' : ''}` : ''
          return (
            <article key={h.id} className="border-b px-3 py-3" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-start justify-between gap-2">
                <a href={sourceUrl} target="_blank" rel="noopener noreferrer"
                   className="text-sm font-semibold leading-snug"
                   style={{ color: 'var(--text-primary)', textDecoration: 'none' }}>
                  {h.display_name || h.id}
                </a>
                <span style={{
                  flexShrink: 0, fontSize: 10, fontWeight: 700, padding: '1px 5px',
                  borderRadius: 4, background: 'var(--bg-elevated)', color: 'var(--text-ghost)',
                  fontFamily: 'var(--font-mono)',
                }}>
                  {h.biotype || 'gene'}
                </span>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-tertiary)' }}>
                {h.species.replace(/_/g, ' ')}{position ? ` · ${position}` : ''}
              </p>
              <p className="text-[10px]" style={{ color: 'var(--text-ghost)', fontFamily: 'var(--font-mono)' }}>{h.id}</p>
              {h.description && (
                <p className="mt-1 line-clamp-3 text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  {h.description}
                </p>
              )}
              <div className="mt-2">
                <SaveArtifactButton
                  saathiSlug={saathiSlug}
                  toolId="ensembl"
                  title={`${h.display_name || h.id} · ${h.species.replace(/_/g, ' ')}`}
                  payload={h as unknown as Record<string, unknown>}
                  sourceUrl={sourceUrl}
                />
              </div>
            </article>
          )
        })}

        {hits.length === 0 && !error && !loading && (
          <div className="flex flex-col items-center justify-center px-3 py-12 text-center">
            <p className="mb-1 text-3xl">🧬</p>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Look up a gene — any vertebrate or model organism</p>
            <p className="text-xs" style={{ color: 'var(--text-ghost)' }}>Ensembl · EMBL-EBI · Free</p>
          </div>
        )}
      </div>
    </div>
  )
}
