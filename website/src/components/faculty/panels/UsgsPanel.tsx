'use client'

// ─────────────────────────────────────────────────────────────────────────────
// UsgsPanel — USGS earthquake feeds
// Public GeoJSON, CORS-enabled, no key. Feed set picks the window (past hour
// significant, past day M4.5+, past week significant, past month significant).
// ─────────────────────────────────────────────────────────────────────────────

import { useCallback, useEffect, useState } from 'react'
import { SaveArtifactButton } from '../SaveArtifactButton'

type Quake = {
  id:    string
  mag:   number | null
  place: string
  time:  number
  url:   string
  depth: number | null
  tz?:   number | null
}

type QuakeFeature = {
  id?: string
  properties?: { mag?: number; place?: string; time?: number; url?: string }
  geometry?:   { coordinates?: number[] }
}

type FeedKey = 'significant_day' | 'significant_week' | 'significant_month' | '4.5_day'

const FEEDS: Array<{ key: FeedKey; label: string; url: string }> = [
  { key: 'significant_day',   label: 'Significant · 24h',   url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_day.geojson' },
  { key: '4.5_day',           label: 'M 4.5+ · 24h',        url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/4.5_day.geojson' },
  { key: 'significant_week',  label: 'Significant · 7d',    url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_week.geojson' },
  { key: 'significant_month', label: 'Significant · 30d',   url: 'https://earthquake.usgs.gov/earthquakes/feed/v1.0/summary/significant_month.geojson' },
]

type Props = { saathiSlug: string }

export function UsgsPanel({ saathiSlug }: Props) {
  const [feed, setFeed]       = useState<FeedKey>('significant_week')
  const [quakes, setQuakes]   = useState<Quake[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState('')

  const load = useCallback(async () => {
    const src = FEEDS.find((f) => f.key === feed)!
    setLoading(true); setError(''); setQuakes([])
    try {
      const res = await fetch(src.url)
      if (!res.ok) { setError('Feed unavailable'); setLoading(false); return }
      const data = await res.json() as { features?: QuakeFeature[] }
      const mapped: Quake[] = (data.features ?? []).slice(0, 40).map((f): Quake => ({
        id:    f.id ?? '',
        mag:   f.properties?.mag ?? null,
        place: f.properties?.place ?? 'Unknown location',
        time:  f.properties?.time ?? 0,
        url:   f.properties?.url ?? '',
        depth: f.geometry?.coordinates?.[2] ?? null,
      })).filter((q) => q.id)
      setQuakes(mapped)
      if (mapped.length === 0) setError('No events in this window')
    } catch {
      setError('Feed failed')
    }
    setLoading(false)
  }, [feed])

  useEffect(() => { void load() }, [load])

  return (
    <div className="flex h-full flex-col">
      <div
        className="shrink-0 px-2 py-2"
        style={{ borderBottom: '1px solid var(--border-subtle)', display: 'flex', flexWrap: 'wrap', gap: 4 }}
      >
        {FEEDS.map((f) => (
          <button
            key={f.key}
            onClick={() => setFeed(f.key)}
            style={{
              padding:      '3px 9px',
              fontSize:     10,
              fontWeight:   600,
              borderRadius: 999,
              border:       '1px solid var(--border-subtle)',
              background:   feed === f.key ? 'var(--saathi-light)' : 'var(--bg-elevated)',
              color:        feed === f.key ? 'var(--saathi-text)' : 'var(--text-secondary)',
              cursor:       'pointer',
              fontFamily:   'var(--font-body)',
            }}
          >
            {f.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading && <p className="px-3 py-4 text-center text-xs" style={{ color: 'var(--text-ghost)' }}>Loading feed…</p>}
        {error && <p className="px-3 py-6 text-center text-sm" style={{ color: 'var(--error)' }}>{error}</p>}

        {quakes.map((q) => {
          const magColor = (q.mag ?? 0) >= 7 ? '#DC2626' : (q.mag ?? 0) >= 6 ? '#EA580C' : (q.mag ?? 0) >= 5 ? '#C9993A' : 'var(--text-secondary)'
          const when = new Date(q.time).toLocaleString('en-IN', { dateStyle: 'short', timeStyle: 'short' })
          return (
            <article key={q.id} className="border-b px-3 py-2.5" style={{ borderColor: 'var(--border-subtle)' }}>
              <div className="flex items-center gap-3">
                <span style={{
                  fontSize: 15, fontWeight: 800, color: magColor,
                  fontFamily: 'var(--font-mono)', minWidth: 38, textAlign: 'center',
                }}>
                  M{q.mag?.toFixed(1) ?? '?'}
                </span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p className="truncate text-sm font-semibold" style={{ color: 'var(--text-primary)', margin: 0 }}>
                    {q.place}
                  </p>
                  <p className="text-[10px]" style={{ color: 'var(--text-ghost)', margin: 0 }}>
                    {when}{q.depth !== null ? ` · ${q.depth.toFixed(1)} km deep` : ''}
                  </p>
                </div>
                <SaveArtifactButton
                  saathiSlug={saathiSlug}
                  toolId="usgs-quake"
                  title={`M${q.mag?.toFixed(1) ?? '?'} ${q.place}`}
                  payload={q as unknown as Record<string, unknown>}
                  sourceUrl={q.url}
                  compact
                />
              </div>
            </article>
          )
        })}
      </div>
    </div>
  )
}
