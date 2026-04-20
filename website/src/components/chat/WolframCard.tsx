'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type WolframPod = {
  title: string
  content: string
}

type WolframResult = {
  query: string
  shortAnswer: string | null
  pods: WolframPod[]
  wolframUrl: string
}

export function WolframCard({ query }: { query: string }) {
  const [result, setResult] = useState<WolframResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function fetchWolfram() {
      setLoading(true)
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { setError(true); setLoading(false); return }

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/fetch-wolfram`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ query }),
          }
        )
        if (!res.ok) throw new Error('Wolfram fetch failed')
        const data = await res.json()
        setResult(data)
      } catch {
        setError(true)
      }
      setLoading(false)
    }
    fetchWolfram()
  }, [query])

  if (error) return null

  return (
    <div style={{
      margin: '8px 0',
      background: 'var(--bg-elevated)',
      borderRadius: '10px',
      border: '1px solid var(--border-subtle)',
      borderLeft: '3px solid var(--saathi-primary)',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div
        style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '10px 14px', cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ fontSize: '14px' }}>🧮</span>
          <span style={{
            fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)',
            textTransform: 'uppercase', letterSpacing: '0.05em',
          }}>
            Wolfram Alpha
          </span>
          {loading && (
            <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
              Computing...
            </span>
          )}
        </div>
        <span style={{ fontSize: '12px', color: 'var(--text-tertiary)' }}>
          {expanded ? '▲' : '▼'}
        </span>
      </div>

      {/* Query */}
      <div style={{
        padding: '0 14px 8px', fontSize: '12px',
        color: 'var(--text-tertiary)', fontFamily: 'var(--font-mono)',
      }}>
        {query}
      </div>

      {/* Short answer — always visible */}
      {!loading && result?.shortAnswer && (
        <div style={{
          padding: '8px 14px', background: 'var(--bg-base)',
          borderTop: '1px solid var(--border-subtle)',
          fontSize: '15px', fontWeight: 600,
          color: 'var(--text-primary)', fontFamily: 'var(--font-mono)',
        }}>
          = {result.shortAnswer}
        </div>
      )}

      {/* Expanded pods — step by step */}
      {expanded && !loading && result?.pods && result.pods.length > 0 && (
        <div style={{ borderTop: '1px solid var(--border-subtle)' }}>
          {result.pods.map((pod, i) => (
            <div key={i} style={{
              padding: '10px 14px',
              borderBottom: i < result.pods.length - 1 ? '1px solid var(--border-subtle)' : 'none',
            }}>
              <div style={{
                fontSize: '11px', fontWeight: 700, color: 'var(--text-tertiary)',
                textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px',
              }}>
                {pod.title}
              </div>
              <div style={{
                fontSize: '13px', color: 'var(--text-primary)',
                fontFamily: 'var(--font-mono)', lineHeight: '1.6', whiteSpace: 'pre-wrap',
              }}>
                {pod.content}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Footer — link to Wolfram */}
      {!loading && (
        <div style={{
          padding: '8px 14px', borderTop: '1px solid var(--border-subtle)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
            Powered by Wolfram Alpha
          </span>
          <a
            href={result?.wolframUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: '11px', color: 'var(--saathi-primary)',
              textDecoration: 'none', fontWeight: 500,
            }}
          >
            Full solution →
          </a>
        </div>
      )}
    </div>
  )
}
