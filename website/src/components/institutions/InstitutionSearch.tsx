'use client'

// ─────────────────────────────────────────────────────────────────────────────
// InstitutionSearch — debounced query against /api/institutions/search.
// Used by InstitutionJoinModal. 300ms debounce, min 2 chars, up to 8 results
// rendered as clickable cards. onPick hands back the chosen row for the
// parent to drive the join confirmation step.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect, useRef, useState } from 'react'

export type InstitutionSearchHit = {
  id:          string
  slug:        string
  name:        string
  city:        string
  affiliation: string | null
}

type Props = {
  autoFocus?: boolean
  onPick:     (hit: InstitutionSearchHit) => void
}

export function InstitutionSearch({ autoFocus = true, onPick }: Props) {
  const [q, setQ]           = useState('')
  const [hits, setHits]     = useState<InstitutionSearchHit[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError]   = useState<string | null>(null)

  // Debounced fetch. AbortController cancels the in-flight request if the
  // user keeps typing — avoids out-of-order result flicker.
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    if (q.trim().length < 2) {
      setHits([])
      setError(null)
      setLoading(false)
      return
    }
    const controller = new AbortController()
    abortRef.current?.abort()
    abortRef.current = controller

    const timer = setTimeout(async () => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(
          `/api/institutions/search?q=${encodeURIComponent(q.trim())}`,
          { signal: controller.signal, cache: 'no-store' },
        )
        if (!res.ok) {
          if (res.status === 429) setError('Searching too quickly — slow down a bit.')
          else                    setError('Search failed. Try again.')
          setHits([])
          setLoading(false)
          return
        }
        const data = await res.json() as { results?: InstitutionSearchHit[] }
        setHits(data.results ?? [])
        setLoading(false)
      } catch (e) {
        if ((e as Error).name === 'AbortError') return
        setError('Search failed. Try again.')
        setHits([])
        setLoading(false)
      }
    }, 300)

    return () => { clearTimeout(timer); controller.abort() }
  }, [q])

  const showEmpty   = q.trim().length >= 2 && !loading && !error && hits.length === 0
  const showResults = hits.length > 0

  return (
    <div>
      <input
        type="text"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Start typing your college name…"
        autoFocus={autoFocus}
        aria-label="Search your college or university"
      />

      <div style={{ marginTop: 12, minHeight: 80 }}>
        {q.trim().length < 2 && (
          <p style={{
            fontSize: 12, color: 'var(--text-tertiary)',
            margin: '8px 2px 0', fontStyle: 'italic', lineHeight: 1.55,
          }}>
            Type at least 2 letters to search.
          </p>
        )}

        {loading && (
          <p style={{
            fontSize: 12, color: 'var(--text-tertiary)',
            margin: '8px 2px 0', fontStyle: 'italic',
          }}>
            Searching…
          </p>
        )}

        {error && (
          <p
            role="alert"
            style={{
              fontSize: 12, color: 'var(--error)',
              padding: '8px 12px',
              borderRadius: 'var(--radius-std)',
              background: 'var(--error-bg)',
              border: '1px solid var(--error)',
              margin: '8px 0 0',
            }}
          >
            {error}
          </p>
        )}

        {showEmpty && (
          <div style={{
            padding: '12px 14px',
            borderRadius: 'var(--radius-std)',
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            marginTop: 8,
          }}>
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
              We don&apos;t see <strong>{q.trim()}</strong> here yet. Your institution
              may not have registered. You can invite them from the{' '}
              <a
                href="/institutions"
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: 'var(--gold)', textDecoration: 'none', fontWeight: 600 }}
              >
                institutions page
              </a>.
            </p>
          </div>
        )}

        {showResults && (
          <ul style={{
            listStyle: 'none', padding: 0, margin: 0,
            display: 'flex', flexDirection: 'column', gap: 8,
            maxHeight: 320, overflowY: 'auto',
          }}>
            {hits.map((h) => (
              <li key={h.id}>
                <button
                  onClick={() => onPick(h)}
                  style={{
                    width: '100%', textAlign: 'left',
                    padding: '12px 14px',
                    borderRadius: 'var(--radius-std)',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                    display: 'flex', flexDirection: 'column', gap: 2,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = 'var(--saathi-primary)'
                    e.currentTarget.style.background  = 'var(--saathi-light)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-subtle)'
                    e.currentTarget.style.background  = 'var(--bg-surface)'
                  }}
                >
                  <span style={{
                    fontSize: 14, fontWeight: 700,
                    color: 'var(--text-primary)',
                    lineHeight: 1.35,
                  }}>
                    {h.name}
                  </span>
                  <span style={{
                    fontSize: 12, color: 'var(--text-tertiary)',
                    lineHeight: 1.5,
                  }}>
                    {h.city}{h.affiliation ? ` · ${h.affiliation}` : ''}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
