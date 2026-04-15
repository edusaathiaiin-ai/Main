'use client'

import { motion } from 'framer-motion'
import type { NewsItem } from '@/types'

type Props = {
  item: NewsItem
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

export function AnnouncementCard({ item, index }: Props) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="flex flex-col gap-3 rounded-2xl p-5"
      style={{
        background: 'rgba(184,134,11,0.05)',
        border: '1px solid rgba(184,134,11,0.20)',
        borderLeft: '3px solid #B8860B',
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}
    >
      {/* Source label */}
      <div className="flex items-center gap-2">
        <span
          className="text-[10px] font-bold tracking-widest uppercase"
          style={{ color: '#B8860B' }}
        >
          EdUsaathiAI
        </span>
        <span
          className="rounded-full px-2 py-0.5 text-[9px] font-bold"
          style={{
            background: 'rgba(184,134,11,0.10)',
            border: '0.5px solid rgba(184,134,11,0.30)',
            color: '#B8860B',
          }}
        >
          Announcement
        </span>
      </div>

      {/* Title */}
      <h3
        className="text-sm leading-snug font-bold"
        style={{ color: 'var(--text-primary)' }}
      >
        {item.title}
      </h3>

      {/* Body */}
      {item.summary && (
        <p
          className="text-xs leading-relaxed"
          style={{ color: 'var(--text-secondary)' }}
        >
          {item.summary}
        </p>
      )}

      {/* Footer */}
      <span className="text-[10px]" style={{ color: 'var(--text-ghost)' }}>
        {timeAgo(item.fetched_at)}
      </span>
    </motion.article>
  )
}
