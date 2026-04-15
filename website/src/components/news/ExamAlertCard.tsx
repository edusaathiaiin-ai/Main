'use client'

import { motion } from 'framer-motion'

export type ExamAlert = {
  id: string
  vertical_id: string
  exam_name: string
  exam_date: string
  source_url: string | null
  notes: string | null
}

type Props = {
  exam: ExamAlert
  index: number
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr)
  const now = new Date()
  target.setHours(0, 0, 0, 0)
  now.setHours(0, 0, 0, 0)
  return Math.ceil((target.getTime() - now.getTime()) / 86400000)
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function ExamAlertCard({ exam, index }: Props) {
  const days = daysUntil(exam.exam_date)
  const isUrgent = days <= 7
  const isWarning = days <= 30 && !isUrgent

  const countdownColor = isUrgent
    ? '#EF4444'
    : isWarning
      ? '#F59E0B'
      : '#6B7280'
  const countdownText =
    days === 0 ? 'Today!' : days === 1 ? 'Tomorrow!' : `in ${days} days`

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="flex items-start gap-4 rounded-2xl p-5"
      style={{
        background: isUrgent ? 'rgba(239,68,68,0.06)' : 'rgba(245,158,11,0.07)',
        border: `1px solid ${isUrgent ? 'rgba(239,68,68,0.30)' : 'rgba(245,158,11,0.35)'}`,
        boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      }}
    >
      {/* Calendar icon */}
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-2xl"
        style={{
          background: isUrgent
            ? 'rgba(239,68,68,0.12)'
            : 'rgba(245,158,11,0.14)',
        }}
      >
        📅
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <h3
          className="mb-1 text-sm leading-tight font-bold"
          style={{ color: 'var(--text-primary)' }}
        >
          {exam.exam_name}
        </h3>
        <p className="mb-2 text-xs" style={{ color: 'var(--text-secondary)' }}>
          {formatDate(exam.exam_date)}
        </p>
        {exam.notes && (
          <p
            className="mb-2 line-clamp-2 text-[11px]"
            style={{ color: 'var(--text-tertiary)' }}
          >
            {exam.notes}
          </p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold" style={{ color: countdownColor }}>
            {countdownText}
          </span>
          {exam.source_url && (
            <a
              href={exam.source_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[10px] font-semibold transition-colors"
              style={{ color: 'var(--text-tertiary)' }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = 'var(--text-primary)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = 'var(--text-tertiary)')
              }
            >
              Official site ↗
            </a>
          )}
        </div>
      </div>
    </motion.article>
  )
}
