'use client'

import { motion } from 'framer-motion'
import type { NewsItem } from '@/types'

// Extended with DB fields not yet in type
type ExtendedNewsItem = NewsItem & {
  item_type?: string
  category?: string
  tags?: string[]
  isResearchArea?: boolean
}

type Props = {
  item: ExtendedNewsItem
  primaryColor: string
  bgColor: string
  index: number
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function NewsCard({ item, primaryColor, index }: Props) {
  const isResearch = item.item_type === 'research'

  function handleOpen() {
    if (item.url) window.open(item.url, '_blank', 'noopener,noreferrer')
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{ y: -3, transition: { duration: 0.18 } }}
      onClick={handleOpen}
      className="flex cursor-pointer flex-col gap-3 rounded-2xl p-5 transition-shadow duration-200"
      style={{
        background: 'var(--bg-surface)',
        border: `1px solid ${primaryColor}25`,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}
      onMouseEnter={(e) =>
        (e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.10)')
      }
      onMouseLeave={(e) =>
        (e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.08)')
      }
    >
      {/* Top row: source + chip */}
      <div className="flex items-center justify-between gap-2">
        <span
          className="truncate text-[10px] font-bold tracking-widest uppercase"
          style={{ color: 'var(--text-tertiary)' }}
        >
          {item.source}
        </span>
        {isResearch ? (
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold"
            style={{
              background: 'rgba(124,58,237,0.10)',
              border: '0.5px solid rgba(124,58,237,0.30)',
              color: '#7C3AED',
            }}
          >
            Research Paper
          </span>
        ) : item.category ? (
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold"
            style={{
              background: `${primaryColor}14`,
              border: `0.5px solid ${primaryColor}40`,
              color: primaryColor,
            }}
          >
            {item.category}
          </span>
        ) : null}
      </div>

      {/* Headline */}
      <h3
        className="line-clamp-3 text-sm leading-snug font-semibold"
        style={{
          fontFamily: 'var(--font-dm-sans)',
          color: 'var(--text-primary)',
        }}
      >
        {item.title}
      </h3>

      {/* Summary (research papers show it) */}
      {isResearch && item.summary && (
        <p
          className="line-clamp-2 text-xs leading-relaxed"
          style={{ color: 'var(--text-secondary)' }}
        >
          {item.summary}
        </p>
      )}

      {/* Footer */}
      <div className="mt-auto flex items-center justify-between">
        <span className="text-[10px]" style={{ color: 'var(--text-ghost)' }}>
          {timeAgo(item.fetched_at)}
        </span>
        <div className="flex items-center gap-2">
          {item.isResearchArea && (
            <span
              className="rounded-full px-2 py-0.5 text-[9px] font-bold"
              style={{
                background: isResearch
                  ? 'rgba(21,128,61,0.10)'
                  : 'rgba(184,134,11,0.12)',
                border: isResearch
                  ? '0.5px solid rgba(21,128,61,0.30)'
                  : '0.5px solid rgba(184,134,11,0.35)',
                color: isResearch ? '#15803D' : '#B8860B',
              }}
            >
              Your Research Area ✦
            </span>
          )}
          {item.url && (
            <span className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
              ↗
            </span>
          )}
        </div>
      </div>
    </motion.article>
  )
}
