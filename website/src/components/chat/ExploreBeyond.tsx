'use client'

// website/src/components/chat/ExploreBeyond.tsx
// ════════════════════════════════════════════════════════════════
// Explore Beyond — Curated treasure chest per Saathi
// Shows in sidebar when student clicks "Explore Beyond"
// 5 categories: Books, Podcasts, Channels, Journals, Tools
// ════════════════════════════════════════════════════════════════

import { useState } from 'react'
import {
  getExploreBeyond,
  EXPLORE_CATEGORIES,
  type ExploreItem,
} from '@/constants/exploreBeyond'

export function ExploreBeyond({ saathiSlug }: { saathiSlug: string }) {
  const [activeCategory, setActiveCategory] = useState<string>('books')
  const data = getExploreBeyond(saathiSlug)

  if (!data) return null

  const items: ExploreItem[] =
    data[activeCategory as keyof typeof data] as ExploreItem[]

  return (
    <div style={{ padding: '12px 8px' }}>

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '6px',
        marginBottom: '12px', paddingLeft: '4px',
      }}>
        <span style={{ fontSize: '14px' }}>✦</span>
        <span style={{
          fontSize: 'var(--text-xs)', fontWeight: 700,
          letterSpacing: '0.08em', textTransform: 'uppercase',
          color: 'var(--saathi-text)',
        }}>
          Explore Beyond
        </span>
      </div>

      {/* Category tabs */}
      <div style={{
        display: 'flex', gap: '4px', flexWrap: 'wrap',
        marginBottom: '12px',
      }}>
        {EXPLORE_CATEGORIES.map(cat => (
          <button
            key={cat.key}
            onClick={() => setActiveCategory(cat.key)}
            style={{
              display: 'flex', alignItems: 'center', gap: '4px',
              padding: '5px 10px', borderRadius: '100px',
              fontSize: 'var(--text-xs)', fontWeight: 600,
              cursor: 'pointer', border: 'none',
              transition: 'all 0.15s',
              background: activeCategory === cat.key
                ? 'var(--saathi-light)'
                : 'var(--bg-elevated)',
              color: activeCategory === cat.key
                ? 'var(--saathi-text)'
                : 'var(--text-tertiary)',
              outline: activeCategory === cat.key
                ? '1.5px solid var(--saathi-border)'
                : '1px solid var(--border-subtle)',
            }}
          >
            <span style={{ fontSize: '12px' }}>{cat.emoji}</span>
            <span>{cat.label}</span>
          </button>
        ))}
      </div>

      {/* Items */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {items.map((item, i) => (
          <a
            key={i}
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'block', padding: '10px 12px',
              borderRadius: '10px', textDecoration: 'none',
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-subtle)',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.borderColor = 'var(--saathi-border)'
              e.currentTarget.style.background = 'var(--saathi-bg)'
              e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.borderColor = 'var(--border-subtle)'
              e.currentTarget.style.background = 'var(--bg-surface)'
              e.currentTarget.style.boxShadow = 'none'
            }}
          >
            <div style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'flex-start', gap: '8px',
              marginBottom: '3px',
            }}>
              <span style={{
                fontSize: 'var(--text-sm)', fontWeight: 600,
                color: 'var(--text-primary)', lineHeight: 1.3,
              }}>
                {item.title}
              </span>
              {item.free && (
                <span style={{
                  fontSize: '9px', fontWeight: 700,
                  letterSpacing: '0.06em',
                  padding: '2px 6px', borderRadius: '100px',
                  background: 'rgba(22,101,52,0.1)',
                  color: '#166534', flexShrink: 0,
                }}>
                  FREE
                </span>
              )}
            </div>
            <p style={{
              fontSize: 'var(--text-xs)', color: 'var(--text-tertiary)',
              margin: 0, lineHeight: 1.5,
            }}>
              {item.description}
            </p>
          </a>
        ))}
      </div>

    </div>
  )
}
