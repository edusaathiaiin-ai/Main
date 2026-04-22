'use client'

// ─────────────────────────────────────────────────────────────────────────────
// WikimediaCommonsPanel — 100M+ free media files
// MediaWiki API at commons.wikimedia.org/w/api.php with origin=* for CORS.
// Uses generator=search + prop=imageinfo to get thumbnails + file meta in
// one request.
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useState } from 'react'
import { SaveArtifactButton } from '../SaveArtifactButton'

type Media = {
  pageid:    number
  title:     string
  thumb:     string
  orig:      string
  width:     number
  height:    number
  mime:      string
  descUrl:   string
}

type MwPage = {
  pageid?: number
  title?:  string
  imageinfo?: Array<{
    thumburl?: string
    url?: string
    width?: number
    height?: number
    mime?: string
    descriptionurl?: string
  }>
}

type Props = { saathiSlug: string }

export function WikimediaCommonsPanel({ saathiSlug }: Props) {
  const [query, setQuery]   = useState('')
  const [items, setItems]   = useState<Media[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState('')

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return
    setLoading(true); setError(''); setItems([])
    try {
      const params = new URLSearchParams({
        action:       'query',
        format:       'json',
        origin:       '*',
        generator:    'search',
        gsrsearch:    query.trim(),
        gsrnamespace: '6',        // File: namespace
        gsrlimit:     '24',
        prop:         'imageinfo',
        iiprop:       'url|size|mime',
        iiurlwidth:   '320',
      })
      const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params.toString()}`)
      if (!res.ok) { setError('Search failed'); setLoading(false); return }
      const data = await res.json() as { query?: { pages?: Record<string, MwPage> } }
      const pages = data.query?.pages ?? {}

      const mapped: Media[] = Object.values(pages).map((p): Media => {
        const info = p.imageinfo?.[0] ?? {}
        return {
          pageid:  p.pageid ?? 0,
          title:   (p.title ?? '').replace(/^File:/, ''),
          thumb:   info.thumburl ?? '',
          orig:    info.url ?? '',
          width:   info.width ?? 0,
          height:  info.height ?? 0,
          mime:    info.mime ?? '',
          descUrl: info.descriptionurl ?? '',
        }
      }).filter((m) => m.thumb && (m.mime?.startsWith('image/') || !m.mime))

      setItems(mapped)
      if (mapped.length === 0) setError('No media found')
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
          placeholder="Search Wikimedia Commons… e.g. Taj Mahal"
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
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
            {items.map((m) => (
              <div key={m.pageid} style={{
                position: 'relative', aspectRatio: '1 / 1', borderRadius: 6,
                overflow: 'hidden', border: '1px solid var(--border-subtle)',
                background: 'var(--bg-base)',
              }} title={m.title}>
                <a href={m.descUrl} target="_blank" rel="noopener noreferrer"
                   style={{ display: 'block', width: '100%', height: '100%' }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={m.thumb} alt={m.title} loading="lazy"
                       style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </a>
                <div style={{
                  position: 'absolute', inset: 'auto 0 0 0',
                  padding: '12px 4px 3px',
                  background: 'linear-gradient(to top, rgba(0,0,0,0.78), rgba(0,0,0,0))',
                  color: '#fff',
                }}>
                  <p style={{
                    fontSize: 9, fontWeight: 600, margin: 0, lineHeight: 1.3,
                    display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical',
                    overflow: 'hidden',
                  }}>
                    {m.title}
                  </p>
                </div>
                <div style={{ position: 'absolute', top: 3, right: 3 }}>
                  <SaveArtifactButton
                    saathiSlug={saathiSlug}
                    toolId="wikimedia-commons"
                    title={m.title}
                    payload={m as unknown as Record<string, unknown>}
                    sourceUrl={m.descUrl}
                    compact
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {items.length === 0 && !error && !loading && (
          <div className="flex flex-col items-center justify-center px-3 py-12 text-center">
            <p className="mb-1 text-3xl">🖼️</p>
            <p className="text-sm" style={{ color: 'var(--text-tertiary)' }}>Search 100M+ free media — images, diagrams, maps</p>
            <p className="text-xs" style={{ color: 'var(--text-ghost)' }}>Wikimedia Commons · Free · CC</p>
          </div>
        )}
      </div>
    </div>
  )
}
