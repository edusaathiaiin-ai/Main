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
        background: '#060F1D',
        border: '0.5px solid rgba(201,153,58,0.2)',
        borderLeft: '3px solid #C9993A',
      }}
    >
      {/* Source label */}
      <div className="flex items-center gap-2">
        <span
          className="text-[10px] font-bold tracking-widest uppercase"
          style={{ color: '#C9993A' }}
        >
          EdUsaathiAI
        </span>
        <span
          className="rounded-full px-2 py-0.5 text-[9px] font-bold"
          style={{
            background: 'rgba(201,153,58,0.1)',
            border: '0.5px solid rgba(201,153,58,0.3)',
            color: '#C9993A',
          }}
        >
          Announcement
        </span>
      </div>

      {/* Title */}
      <h3 className="text-sm leading-snug font-bold text-white">
        {item.title}
      </h3>

      {/* Body */}
      {item.summary && (
        <p
          className="text-xs leading-relaxed"
          style={{ color: 'rgba(255,255,255,0.5)' }}
        >
          {item.summary}
        </p>
      )}

      {/* Footer */}
      <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.28)' }}>
        {timeAgo(item.fetched_at)}
      </span>
    </motion.article>
  )
}
