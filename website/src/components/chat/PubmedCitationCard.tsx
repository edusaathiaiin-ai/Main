'use client'

import { useEffect, useState } from 'react'

type Citation = {
  pmid: string
  title: string
  authors: string[]
  journal: string
  year: number | null
  doi: string | null
  url: string
}

type State =
  | { status: 'loading' }
  | { status: 'ready'; results: Citation[]; attribution: string | null }
  | { status: 'empty' }
  | { status: 'error'; message: string }

export function PubmedCitationCard({ query }: { query: string }) {
  const [state, setState] = useState<State>({ status: 'loading' })

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch(`/api/pubmed?q=${encodeURIComponent(query)}&limit=5`)
        if (cancelled) return
        if (!res.ok) {
          const body = await res.json().catch(() => ({ error: 'Request failed' }))
          setState({ status: 'error', message: body.error ?? 'PubMed lookup failed' })
          return
        }
        const json = await res.json() as { results: Citation[]; attribution?: string }
        if (cancelled) return
        if (!json.results || json.results.length === 0) {
          setState({ status: 'empty' })
          return
        }
        setState({ status: 'ready', results: json.results, attribution: json.attribution ?? null })
      } catch {
        if (!cancelled) setState({ status: 'error', message: 'Network error' })
      }
    })()
    return () => { cancelled = true }
  }, [query])

  return (
    <div
      style={{
        marginTop: 10,
        padding: '12px 14px',
        borderRadius: 12,
        background: 'var(--bg-elevated)',
        border: '1px solid var(--border-subtle)',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          marginBottom: 8,
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
          color: 'var(--text-tertiary)',
          fontWeight: 600,
        }}
      >
        <span>🔬 PubMed</span>
        <span style={{ color: 'var(--text-ghost)' }}>·</span>
        <span style={{ fontWeight: 500, textTransform: 'none', letterSpacing: 0 }}>
          {query}
        </span>
      </div>

      {state.status === 'loading' && (
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>Searching peer-reviewed literature…</p>
      )}

      {state.status === 'error' && (
        <p style={{ fontSize: 13, color: 'var(--error, #DC2626)' }}>Couldn't reach PubMed: {state.message}</p>
      )}

      {state.status === 'empty' && (
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
          No PubMed results for "{query}". Try a more specific query or different keywords.
        </p>
      )}

      {state.status === 'ready' && (
        <>
          <ol style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {state.results.map((c) => (
              <li key={c.pmid} style={{ fontSize: 13, lineHeight: 1.5 }}>
                <a
                  href={c.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: 'var(--saathi-text, var(--text-primary))', fontWeight: 600, textDecoration: 'none' }}
                >
                  {c.title}
                </a>
                <div style={{ color: 'var(--text-secondary)', fontSize: 12, marginTop: 2 }}>
                  {c.authors.length > 0 ? c.authors.slice(0, 3).join(', ') + (c.authors.length > 3 ? ' et al.' : '') : 'Authors not listed'}
                  {c.journal ? ` · ${c.journal}` : ''}
                  {c.year ? ` · ${c.year}` : ''}
                </div>
                <div style={{ color: 'var(--text-tertiary)', fontSize: 11, marginTop: 2 }}>
                  PMID: {c.pmid}
                  {c.doi ? ` · DOI: ${c.doi}` : ''}
                </div>
              </li>
            ))}
          </ol>
          {state.attribution && (
            <p style={{ marginTop: 10, fontSize: 10, color: 'var(--text-ghost)' }}>
              {state.attribution}
            </p>
          )}
        </>
      )}
    </div>
  )
}
