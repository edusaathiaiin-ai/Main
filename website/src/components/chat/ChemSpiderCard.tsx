'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type CompoundResult = {
  csid: number
  name: string
  formula: string
  molecularWeight: number | null
  smiles: string
  url: string
}

export function ChemSpiderCard({ query }: { query: string }) {
  const [results, setResults] = useState<CompoundResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    async function fetchCompound() {
      setLoading(true)
      try {
        const supabase = createClient()
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { setError(true); setLoading(false); return }

        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/fetch-chemspider`,
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
        if (!res.ok) throw new Error('ChemSpider fetch failed')
        const data = await res.json()

        if (data.results) {
          setResults(data.results)
        } else if (data.csid) {
          setResults([data])
        }
      } catch { setError(true) }
      setLoading(false)
    }
    fetchCompound()
  }, [query])

  if (error || (!loading && results.length === 0)) return null

  const top = results[0]

  return (
    <div style={{
      margin: '8px 0',
      background: 'var(--bg-elevated)',
      borderRadius: '10px',
      border: '1px solid var(--border-subtle)',
      borderLeft: '3px solid #A855F7',
      overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '8px',
        padding: '10px 14px',
      }}>
        <span style={{ fontSize: '14px' }}>🧪</span>
        <span style={{
          fontSize: '12px', fontWeight: 700, color: 'var(--text-secondary)',
          textTransform: 'uppercase', letterSpacing: '0.05em',
        }}>
          ChemSpider
        </span>
        {loading && (
          <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>Searching...</span>
        )}
      </div>

      {!loading && top && (
        <>
          {/* Compound name + formula */}
          <div style={{ padding: '0 14px 10px' }}>
            <p style={{
              fontSize: '15px', fontWeight: 700, margin: '0 0 4px',
              color: 'var(--text-primary)',
            }}>
              {top.name || query}
            </p>
            {top.formula && (
              <p style={{
                fontSize: '13px', fontFamily: 'var(--font-mono)',
                color: 'var(--text-secondary)', margin: 0,
              }}>
                {top.formula}
                {top.molecularWeight && (
                  <span style={{ color: 'var(--text-tertiary)', marginLeft: '12px' }}>
                    {top.molecularWeight} g/mol
                  </span>
                )}
              </p>
            )}
            {top.smiles && (
              <p style={{
                fontSize: '10px', fontFamily: 'var(--font-mono)',
                color: 'var(--text-ghost)', margin: '4px 0 0',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                SMILES: {top.smiles}
              </p>
            )}
          </div>

          {/* Other results */}
          {results.length > 1 && (
            <div style={{ padding: '0 14px 8px' }}>
              <p style={{ fontSize: '10px', color: 'var(--text-ghost)', margin: '0 0 4px' }}>
                Also found:
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                {results.slice(1, 4).map((r, i) => (
                  <a key={i} href={r.url} target="_blank" rel="noopener noreferrer"
                    style={{
                      fontSize: '10px', padding: '2px 8px', borderRadius: '6px',
                      background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
                      color: 'var(--text-secondary)', textDecoration: 'none',
                    }}>
                    {r.name || `CSID ${r.csid}`}
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Footer */}
          <div style={{
            padding: '8px 14px', borderTop: '1px solid var(--border-subtle)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontSize: '10px', color: 'var(--text-tertiary)' }}>
              ChemSpider — Royal Society of Chemistry
            </span>
            <a href={top.url} target="_blank" rel="noopener noreferrer"
              style={{ fontSize: '11px', color: '#A855F7', textDecoration: 'none', fontWeight: 500 }}>
              View structure →
            </a>
          </div>
        </>
      )}
    </div>
  )
}
