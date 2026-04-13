'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { toVerticalUuid } from '@/constants/verticalIds'

type SaathiStats = {
  total_students: number
  active_students: number
  community_label: string
  top_topics: string[]
  avg_depth: number
  last_refreshed_at: string
}

type MessageFn = (
  stats: SaathiStats,
  saathiName: string,
  firstName: string
) => string

const MESSAGES: MessageFn[] = [
  (stats, saathiName, firstName) =>
    `${stats.total_students.toLocaleString('en-IN')} ${saathiName} ${stats.community_label} on EdUsaathiAI. You are one of them, ${firstName}.`,

  (stats, saathiName, firstName) =>
    `${stats.active_students.toLocaleString('en-IN')} students studied ${saathiName} in the last 30 days. Welcome back, ${firstName}.`,

  (stats, saathiName) =>
    stats.top_topics.length > 0
      ? `Your community is exploring: ${stats.top_topics.slice(0, 3).join(', ')}.`
      : `${stats.total_students.toLocaleString('en-IN')} minds. One ${saathiName} community.`,

  (stats, saathiName, firstName) =>
    `Average learning depth in ${saathiName}: ${stats.avg_depth}/100. Keep going, ${firstName}.`,
]

type Props = {
  saathiId: string
  saathiName: string
  saathiColor: string
  saathiEmoji: string
  studentName: string
}

export function SaathiCommunityBanner({
  saathiId,
  saathiName,
  saathiColor,
  saathiEmoji,
  studentName,
}: Props) {
  const [stats, setStats] = useState<SaathiStats | null>(null)
  const [msgIndex, setMsgIndex] = useState(0)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    function run() {
      void fetchStats()
    }
    run()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saathiId])

  useEffect(() => {
    if (!stats) return
    const id = setInterval(() => {
      setMsgIndex((i) => (i + 1) % MESSAGES.length)
    }, 5000)
    return () => clearInterval(id)
  }, [stats])

  async function fetchStats() {
    // saathiId from ChatWindow is a slug (via toSlug()); vertical_id on the
    // stats table is a UUID FK to verticals(id). Resolve before querying.
    const uuid = toVerticalUuid(saathiId)
    if (!uuid) return
    const supabase = createClient()
    const { data } = await supabase
      .from('saathi_stats_cache')
      .select(
        'total_students,active_students,community_label,top_topics,avg_depth,last_refreshed_at'
      )
      .eq('vertical_id', uuid)
      .maybeSingle()
    if (data) setStats(data as SaathiStats)
  }

  if (!stats || dismissed || stats.total_students === 0) return null

  const firstName = studentName.split(' ')[0] || studentName
  const message = MESSAGES[msgIndex](stats, saathiName, firstName)

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.4 }}
        style={{
          margin: '8px 16px 0',
          padding: '9px 12px',
          borderRadius: '12px',
          background: `${saathiColor}10`,
          border: `0.5px solid ${saathiColor}30`,
          display: 'flex',
          alignItems: 'center',
          gap: '9px',
          position: 'relative',
          flexShrink: 0,
        }}
      >
        {/* Saathi emoji */}
        <span style={{ fontSize: '16px', flexShrink: 0 }}>{saathiEmoji}</span>

        {/* Rotating message */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <AnimatePresence mode="wait">
            <motion.p
              key={msgIndex}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.28 }}
              style={{
                fontSize: '11px',
                color: 'rgba(255,255,255,0.58)',
                margin: 0,
                lineHeight: 1.5,
              }}
            >
              {message}
            </motion.p>
          </AnimatePresence>
        </div>

        {/* Dot indicators */}
        <div style={{ display: 'flex', gap: '3px', flexShrink: 0 }}>
          {MESSAGES.map((_, i) => (
            <div
              key={i}
              style={{
                width: '4px',
                height: '4px',
                borderRadius: '50%',
                background:
                  i === msgIndex ? saathiColor : 'rgba(255,255,255,0.14)',
                transition: 'background 0.3s',
              }}
            />
          ))}
        </div>

        {/* Dismiss */}
        <button
          onClick={() => setDismissed(true)}
          style={{
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.2)',
            cursor: 'pointer',
            fontSize: '14px',
            padding: '0 2px',
            flexShrink: 0,
            lineHeight: 1,
          }}
          aria-label="Dismiss"
        >
          ×
        </button>

        {/* Freshness note */}
        <div
          title={`Data refreshed ${new Date(stats.last_refreshed_at).toLocaleDateString('en-IN')}`}
          style={{
            position: 'absolute',
            bottom: '3px',
            right: '28px',
            fontSize: '8px',
            color: 'rgba(255,255,255,0.13)',
          }}
        >
          updated every 48h
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
