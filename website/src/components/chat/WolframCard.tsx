'use client'

import { useState, useEffect } from 'react'

/**
 * Inline Wolfram Alpha computation card for chat.
 * Fetches result from /api/classroom/wolfram on render.
 *
 * Source badge: "Wolfram Alpha — Computational Intelligence"
 */

type Props = {
  query: string
}

type WolframResult = {
  shortAnswer: string | null
  pods: { title: string; content: string }[]
  wolframUrl: string
}

export function WolframCard({ query }: Props) {
  const [result, setResult] = useState<WolframResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function fetchResult() {
      try {
        const res = await fetch(`/api/classroom/wolfram?q=${encodeURIComponent(query)}`)
        if (!res.ok) { setError('Computation unavailable'); setLoading(false); return }
        const data = await res.json()
        setResult(data)
      } catch { setError('Failed to compute') }
      setLoading(false)
    }
    fetchResult()
  }, [query])

  if (loading) {
    return (
      <div style={{
        padding: '14px', borderRadius: '12px', margin: '8px 0',
        background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '16px' }}>🔣</span>
          <span style={{ fontSize: '12px', color: 'var(--text-ghost)' }}>Computing: {query}...</span>
        </div>
      </div>
    )
  }

  if (error || !result) {
    return (
      <div style={{
        padding: '14px', borderRadius: '12px', margin: '8px 0',
        background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
      }}>
        <span style={{ fontSize: '12px', color: 'var(--text-ghost)' }}>
          🔣 {error || 'No result'} — <a href={`https://www.wolframalpha.com/input?i=${encodeURIComponent(query)}`} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--saathi-primary)' }}>Try on Wolfram →</a>
        </span>
      </div>
    )
  }

  return (
    <div style={{
      padding: '14px 16px', borderRadius: '12px', margin: '8px 0',
      background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
        <span style={{ fontSize: '18px', flexShrink: 0, marginTop: '1px' }}>🔣</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          {/* Query */}
          <p style={{ fontSize: '11px', color: 'var(--text-ghost)', margin: '0 0 6px', fontFamily: 'var(--font-mono)' }}>
            {query}
          </p>

          {/* Short answer — hero result */}
          {result.shortAnswer && (
            <p style={{
              fontSize: '18px', fontWeight: 700, margin: '0 0 8px',
              color: 'var(--text-primary)', fontFamily: 'var(--font-mono)',
            }}>
              {result.shortAnswer}
            </p>
          )}

          {/* Pods */}
          {result.pods.map((pod, i) => (
            <div key={i} style={{
              padding: '8px 10px', borderRadius: '8px', marginBottom: '6px',
              background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
            }}>
              <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-ghost)', textTransform: 'uppercase', letterSpacing: '0.04em', margin: '0 0 3px' }}>
                {pod.title}
              </p>
              <p style={{
                fontSize: '13px', color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)', whiteSpace: 'pre-wrap', margin: 0,
                lineHeight: 1.6,
              }}>
                {pod.content}
              </p>
            </div>
          ))}

          {/* Footer */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '6px' }}>
            <p style={{ fontSize: '9px', color: 'var(--text-ghost)', margin: 0, fontFamily: 'var(--font-mono)' }}>
              Wolfram Alpha — Computational Intelligence
            </p>
            <a href={result.wolframUrl} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: '10px', fontWeight: 600, color: 'var(--saathi-primary)', textDecoration: 'none' }}>
              Full result →
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}
