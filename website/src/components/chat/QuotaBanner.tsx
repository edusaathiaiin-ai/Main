'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useRouter } from 'next/navigation'
import type { QuotaState } from '@/types'

type Props = {
  quota: QuotaState
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '0s'
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m`
  if (m > 0) return `${m}m ${String(s).padStart(2, '0')}s`
  return `${s}s`
}

export function QuotaBanner({ quota }: Props) {
  const { remaining } = quota
  const router = useRouter()
  const [remaining_ms, setRemainingMs] = useState<number>(
    () => quota.coolingUntil ? Math.max(0, quota.coolingUntil.getTime() - Date.now()) : 0
  )

  useEffect(() => {
    if (!quota.coolingUntil) return
    setRemainingMs(Math.max(0, quota.coolingUntil.getTime() - Date.now()))
    const interval = setInterval(() => {
      const diff = quota.coolingUntil!.getTime() - Date.now()
      if (diff <= 0) {
        clearInterval(interval)
        router.refresh()
      } else {
        setRemainingMs(diff)
      }
    }, 1000)
    return () => clearInterval(interval)
  }, [quota.coolingUntil, router])

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

  const countdownLabel = isOut && quota.coolingUntil
    ? ` — resumes in ${formatCountdown(remaining_ms)}`
    : isOut
      ? ' — your Saathi will be ready in 48h'
      : ''

  const message = isOut
    ? `All chats used${countdownLabel}`
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
        <span style={{ color: textColor, fontVariantNumeric: 'tabular-nums' }}>
          {isOut ? '⏳ ' : isLow ? '⚠️ ' : '💬 '}
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
