'use client'

import { useEffect, useState } from 'react'
import { SAATHIS } from '@/constants/saathis'

type SummaryData = {
  found: boolean
  summary: string
  key_concepts: string[]
  homework: string[]
  saathiName: string
  saathiSlug: string
  date: string
}

export function YesterdaySummary() {
  const [data, setData] = useState<SummaryData | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const dismissedKey = `yesterday-summary-dismissed-${new Date().toISOString().slice(0, 10)}`
    if (sessionStorage.getItem(dismissedKey)) { setDismissed(true); return }

    async function fetch_summary() {
      try {
        const res = await fetch('/api/learning-summary')
        if (!res.ok) return
        const d = await res.json()
        if (d.found) setData(d)
      } catch { /* silent */ }
    }
    fetch_summary()
  }, [])

  if (!data || dismissed) return null

  const saathi = SAATHIS.find(s => s.id === data.saathiSlug)
  const color = saathi?.primary ?? 'var(--gold)'

  function handleDismiss() {
    const key = `yesterday-summary-dismissed-${new Date().toISOString().slice(0, 10)}`
    sessionStorage.setItem(key, '1')
    setDismissed(true)
  }

  return (
    <div style={{
      margin: '0 0 16px',
      padding: '20px',
      borderRadius: '16px',
      background: 'var(--bg-surface)',
      border: `1px solid var(--border-subtle)`,
      position: 'relative',
    }}>
      {/* Dismiss */}
      <button onClick={handleDismiss} style={{
        position: 'absolute', top: '12px', right: '14px',
        background: 'none', border: 'none', cursor: 'pointer',
        fontSize: '14px', color: 'var(--text-ghost)', lineHeight: 1,
      }}>×</button>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <span style={{ fontSize: '18px' }}>📓</span>
        <div>
          <p style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
            Yesterday with {data.saathiName}
          </p>
          <p style={{ fontSize: '10px', color: 'var(--text-ghost)', margin: '1px 0 0' }}>
            {new Date(data.date).toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}
          </p>
        </div>
      </div>

      {/* Summary */}
      <p style={{
        fontSize: '13px', color: 'var(--text-secondary)',
        lineHeight: 1.7, margin: '0 0 12px',
      }}>
        {data.summary}
      </p>

      {/* Key concepts */}
      {data.key_concepts.length > 0 && (
        <div style={{ marginBottom: '12px' }}>
          <p style={{
            fontSize: '10px', fontWeight: 700, color: 'var(--text-ghost)',
            textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px',
          }}>
            Key concepts
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
            {data.key_concepts.map((c, i) => (
              <span key={i} style={{
                fontSize: '11px', padding: '3px 10px', borderRadius: '8px',
                background: `${color}12`, color, fontWeight: 500,
              }}>
                {c.split(' — ')[0]}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Homework */}
      {data.homework.length > 0 && (
        <div style={{ marginBottom: '8px' }}>
          <p style={{
            fontSize: '10px', fontWeight: 700, color: 'var(--text-ghost)',
            textTransform: 'uppercase', letterSpacing: '0.06em', margin: '0 0 6px',
          }}>
            Today's homework
          </p>
          {data.homework.map((h, i) => (
            <div key={i} style={{
              display: 'flex', gap: '8px', alignItems: 'flex-start', marginBottom: '4px',
            }}>
              <span style={{ fontSize: '12px', flexShrink: 0 }}>
                {['📖', '✍️', '💬'][i] ?? '→'}
              </span>
              <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0, lineHeight: 1.5 }}>
                {h}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* CTA */}
      <p style={{
        fontSize: '11px', color: 'var(--text-ghost)', margin: '8px 0 0',
        fontStyle: 'italic',
      }}>
        Your {data.saathiName} remembers where you left off. Continue below. ↓
      </p>
    </div>
  )
}
