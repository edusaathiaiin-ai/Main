'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import type { QuotaState } from '@/types'

type Props = {
  quota: QuotaState
  saathiName: string
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00'
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':')
}

export function CoolingBanner({ quota, saathiName }: Props) {
  const router = useRouter()
  const [remaining, setRemaining] = useState<number>(0)

  useEffect(() => {
    if (!quota.coolingUntil) return
    const interval = setInterval(() => {
      const diff = quota.coolingUntil!.getTime() - Date.now()
      if (diff <= 0) {
        clearInterval(interval)
        router.refresh() // refresh quota
      } else {
        setRemaining(diff)
      }
    }, 1000)
    // Set initial
    async function init() {
      await Promise.resolve()
      setRemaining(Math.max(0, quota.coolingUntil!.getTime() - Date.now()))
    }
    void init()
    return () => clearInterval(interval)
  }, [quota.coolingUntil, router])

  if (!quota.isCooling) return null

  return (
    <div
      className="mx-4 mb-4 rounded-2xl p-5"
      style={{
        background: 'rgba(245,158,11,0.08)',
        border: '0.5px solid rgba(245,158,11,0.3)',
      }}
    >
      {/* Header */}
      <div className="mb-4 flex items-start justify-between">
        <div>
          <p className="font-display mb-1 text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
            ☕ Take a breather
          </p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            Your daily chats are used up. Resuming in:
          </p>
        </div>
        <div
          className="font-mono text-2xl font-bold tabular-nums"
          style={{ color: '#F59E0B' }}
        >
          {formatCountdown(remaining)}
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-2">
        <a
          href="/news"
          className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm transition-all duration-150"
          style={{
            background: 'var(--bg-elevated)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-secondary)',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={(e) =>
            (e.currentTarget.style.color = 'var(--text-secondary)')
          }
        >
          📰 Explore what&apos;s happening in {saathiName} while you wait →
        </a>
        <a
          href="/pricing"
          className="flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-150"
          style={{
            background: 'var(--saathi-light)',
            border: '1px solid var(--saathi-border)',
            color: 'var(--saathi-primary)',
          }}
          onMouseEnter={(e) =>
            (e.currentTarget.style.background = 'var(--saathi-bg)')
          }
          onMouseLeave={(e) =>
            (e.currentTarget.style.background = 'var(--saathi-light)')
          }
        >
          ✦ Upgrade to Plus for unlimited chats →
        </a>
      </div>
    </div>
  )
}
