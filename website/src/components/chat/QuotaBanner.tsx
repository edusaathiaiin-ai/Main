'use client'

import { motion, AnimatePresence } from 'framer-motion'
import type { QuotaState } from '@/types'

type Props = {
  quota: QuotaState
}

export function QuotaBanner({ quota }: Props) {
  const { remaining } = quota

  // Hide when plenty of quota left
  if (remaining > 5) return null

  const isOut = remaining === 0
  const isLow = remaining <= 2 && remaining > 0

  const bgColor = isOut
    ? 'rgba(239,68,68,0.07)'
    : isLow
      ? 'rgba(249,115,22,0.07)'
      : 'rgba(201,153,58,0.07)'
  const borderColor = isOut
    ? 'rgba(239,68,68,0.25)'
    : isLow
      ? 'rgba(249,115,22,0.3)'
      : 'rgba(201,153,58,0.25)'
  const textColor = isOut ? '#DC2626' : isLow ? '#EA580C' : 'var(--saathi-primary)'

  const message = isOut
    ? 'All chats used — your Saathi will be ready in 48 hours'
    : `${remaining} chat${remaining === 1 ? '' : 's'} remaining today`

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="flex items-center justify-between px-4 py-2.5 text-sm"
        style={{
          background: bgColor,
          borderBottom: `0.5px solid ${borderColor}`,
        }}
      >
        <span style={{ color: textColor }}>
          {isOut ? '🔒 ' : isLow ? '⚠️ ' : '💬 '}
          {message}
        </span>
        {isOut && (
          <a
            href="/pricing"
            className="rounded-full px-3 py-1 text-xs font-semibold transition-all"
            style={{
              background: 'var(--saathi-light)',
              border: '1px solid var(--saathi-border)',
              color: 'var(--saathi-primary)',
            }}
          >
            Upgrade →
          </a>
        )}
      </motion.div>
    </AnimatePresence>
  )
}
