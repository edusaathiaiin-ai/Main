'use client'

// ─────────────────────────────────────────────────────────────────────────────
// NasaImagesPanel — faculty solo dock
//
// NASA Images and Video Library. Public JSON API, CORS-enabled, no key.
// We render a compact grid of thumbnails; click expands the image + metadata.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useState } from 'react'
import { SaveArtifactButton } from '../SaveArtifactButton'

type Item = {
  nasa_id:     string
  title:       string
  description: string
  date_created:string
  center:      string
  thumb:       string
  orig:        string
}

type NasaRaw = {
  data?: Array<{
    nasa_id?: string
    title?: string
    description?: string
    date_created?: string
    center?: string
  }>
  links?: Array<{ href?: string; rel?: string }>
}

type Props = { saathiSlug: string }

export function NasaImagesPanel({ saathiSlug }: Props) {
  const [query, setQuery]     = useState('')
  const [items, setItems]     = useState<Item[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return
    setLoading(true); setError(''); setItems([])
    try {
      const url = `https://images-api.nasa.gov/search?q=${encodeURIComponent(query.trim())}&media_type=image`
      const res = await fetch(url)
      if (!res.ok) { setError('Search failed'); setLoading(false); return }
      const data = await res.json()
      const raw: NasaRaw[] = data.collection?.items ?? []

      const mapped: Item[] = raw.slice(0, 18).map((r): Item => {
        const meta    = r.data?.[0] ?? {}
        const preview = r.links?.find((l) => l.rel === 'preview')?.href ?? ''
        return {
          nasa_id:      meta.nasa_id ?? '',
          title:        meta.title ?? '—',
          description:  (meta.description ?? '').slice(0, 300),
          date_created: (meta.date_created ?? '').slice(0, 10),
          center:       meta.center ?? '',
          thumb:        preview,
          orig:         preview,
        }
      }).filter((i) => i.thumb && i.nasa_id)

      setItems(mapped)
      if (mapped.length === 0) setError('No images found')
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
          placeholder="Search NASA imagery… e.g. Mars rover"
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

      <div className="flex-1 overflow-y-auto p-2">
        {error && <p className="px-3 py-6 text-center text-sm" style={{ color: 'var(--error)' }}>{error}</p>}

        {items.length > 0 && (
          <div
            style={{
              display:             'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap:                 6,
            }}
          >
            {items.map((it) => {
              const sourceUrl = `https://images.nasa.gov/details/${it.nasa_id}`
              return (
                <div
                  key={it.nasa_id}
                  style={{
                    position:     'relative',
                    aspectRatio:  '1 / 1',
                    borderRadius: 6,
                    overflow:     'hidden',
                    border:       '1px solid var(--border-subtle)',
                    background:   'var(--bg-base)',
                  }}
                  title={it.title}
                >
                  <a
                    href={sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'block', width: '100%', height: '100%' }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={it.thumb}
                      alt={it.title}
                      loading="lazy"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </a>
                  <div
                    style={{
                      position: 'absolute',
                      inset:    'auto 0 0 0',
                      padding:  '12px 4px 3px',
                      background:'linear-gradient(to top, rgba(0,0,0,0.75), rgba(0,0,0,0))',
                      color:    '#fff',
                    }}
                  >
                    <p
                      style={{
                        fontSize:    9,
                        fontWeight:  600,
                        margin:      0,
                        lineHeight:  1.3,
                        display:     '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow:    'hidden',
                      }}
                    >
                      {it.title}
                    </p>
                  </div>
                  <div style={{ position: 'absolute', top: 3, right: 3 }}>
                    <SaveArtifactButton
                      saathiSlug={saathiSlug}
                      toolId="nasa-images"
                      title={it.title}
                      payload={it as unknown as Record<string, unknown>}
                      sourceUrl={sourceUrl}
                      compact
                    />
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {items.length === 0 && !error && !loading && (
          <div className="flex flex-col items-center justify-center px-3 py-12 text-center">
            <p className="mb-1 text-3xl">🚀</p>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>
              Search NASA imagery — missions, planets, spacecraft
            </p>
            <p className="text-xs" style={{ color: 'var(--text-ghost)' }}>
              NASA · Free · Public domain
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
