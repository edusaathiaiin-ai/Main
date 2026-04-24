'use client'

import { useEffect, useState } from 'react'

/**
 * PaperCitationCard
 *
 * Generic peer-reviewed paper citation — renders the Crossref metadata for
 * any DOI. Used by [PAPER:doi] tags across every Saathi:
 *   PhysicsSaathi → Physical Review Letters
 *   BioSaathi     → Nature, Cell
 *   MedicoSaathi  → JAMA, Lancet, NEJM abstracts
 *   EconSaathi    → American Economic Review
 *   KanoonSaathi  → law reviews (when DOI is available)
 *   ...every Saathi with a peer-reviewed literature to cite.
 *
 * Visual weight matches PubmedCitationCard — same panel, same header
 * pattern, same typography scale — so a chat response with both cards
 * reads as a coherent bibliography rather than a collage.
 *
 * The Saathi's system prompt rule is "always explain BEFORE the tag" and
 * "one tag per response", so the card appears as a single reinforcing
 * citation, not a search results page.
 */

type Paper = {
  doi: string
  title: string
  authors: string[]
  journal: string
  year: number | null
  publisher: string | null
  abstract: string | null
  url: string
  type: string
}

type State =
  | { status: 'loading' }
  | { status: 'ready'; paper: Paper }
  | { status: 'error'; message: string }

type Props = {
  doi: string
  // Fallback title to display if Crossref lookup fails — the Saathi can
  // emit [PAPER:doi|title] and we'll use the title when the card errors
  // so the student still sees a meaningful reference.
  fallbackTitle?: string | null
}

export function PaperCitationCard({ doi, fallbackTitle }: Props) {
  const [state, setState] = useState<State>({ status: 'loading' })
  const [abstractExpanded, setAbstractExpanded] = useState(false)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch(`/api/crossref?doi=${encodeURIComponent(doi)}`)
        if (cancelled) return
        if (!res.ok) {
          const body = await res
            .json()
            .catch(() => ({ error: 'Request failed' }))
          setState({
            status: 'error',
            message: body.error ?? 'Paper lookup failed',
          })
          return
        }
        const json = (await res.json()) as { paper: Paper }
        if (cancelled) return
        setState({ status: 'ready', paper: json.paper })
      } catch {
        if (!cancelled) setState({ status: 'error', message: 'Network error' })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [doi])

  const doiUrl = doi.startsWith('http') ? doi : `https://doi.org/${doi}`

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
        <span>📄 Peer-reviewed paper</span>
        {state.status === 'ready' && state.paper.journal && (
          <>
            <span style={{ color: 'var(--text-ghost)' }}>·</span>
            <span
              style={{
                fontWeight: 500,
                textTransform: 'none',
                letterSpacing: 0,
              }}
            >
              {state.paper.journal}
            </span>
          </>
        )}
      </div>

      {state.status === 'loading' && (
        <p style={{ fontSize: 13, color: 'var(--text-tertiary)' }}>
          Fetching paper details…
        </p>
      )}

      {state.status === 'error' && (
        <div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            {fallbackTitle ?? 'Paper lookup unavailable.'}
          </p>
          <a
            href={doiUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              marginTop: 4,
              display: 'inline-block',
              fontSize: 12,
              color: 'var(--saathi-text, var(--text-primary))',
              textDecoration: 'underline',
              textUnderlineOffset: 2,
            }}
          >
            Open DOI ↗ ({doi})
          </a>
        </div>
      )}

      {state.status === 'ready' && (
        <div>
          <a
            href={state.paper.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block',
              fontSize: 14,
              lineHeight: 1.4,
              fontWeight: 600,
              color: 'var(--saathi-text, var(--text-primary))',
              textDecoration: 'none',
              marginBottom: 6,
            }}
          >
            {state.paper.title}
          </a>

          <div
            style={{
              fontSize: 12,
              color: 'var(--text-secondary)',
              marginBottom: 2,
              lineHeight: 1.5,
            }}
          >
            {state.paper.authors.length > 0
              ? state.paper.authors.slice(0, 3).join(', ') +
                (state.paper.authors.length > 3 ? ' et al.' : '')
              : 'Authors not listed'}
            {state.paper.year ? ` · ${state.paper.year}` : ''}
          </div>

          <div
            style={{
              fontSize: 11,
              color: 'var(--text-tertiary)',
              marginTop: 2,
            }}
          >
            DOI: {state.paper.doi}
          </div>

          {state.paper.abstract && (
            <div style={{ marginTop: 10 }}>
              <button
                type="button"
                onClick={() => setAbstractExpanded((v) => !v)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  padding: 0,
                  color: 'var(--saathi-text, var(--text-primary))',
                  fontSize: 11,
                  fontWeight: 600,
                  cursor: 'pointer',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                }}
              >
                {abstractExpanded ? '▾ Hide abstract' : '▸ Show abstract'}
              </button>
              {abstractExpanded && (
                <p
                  style={{
                    fontSize: 12,
                    lineHeight: 1.55,
                    color: 'var(--text-secondary)',
                    marginTop: 6,
                    whiteSpace: 'pre-wrap',
                  }}
                >
                  {state.paper.abstract}
                </p>
              )}
            </div>
          )}

          <div
            style={{
              marginTop: 10,
              display: 'flex',
              gap: 12,
              fontSize: 11,
            }}
          >
            <a
              href={state.paper.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                color: 'var(--saathi-text, var(--text-primary))',
                textDecoration: 'underline',
                textUnderlineOffset: 2,
                fontWeight: 600,
              }}
            >
              Open paper ↗
            </a>
            {state.paper.publisher && (
              <span style={{ color: 'var(--text-ghost)' }}>
                {state.paper.publisher}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
