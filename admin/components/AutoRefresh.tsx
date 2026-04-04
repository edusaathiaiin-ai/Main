'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'

export function AutoRefresh({ intervalMs = 30_000 }: { intervalMs?: number }) {
  const router = useRouter()
  const [lastRefresh, setLastRefresh] = useState(new Date())
  const [refreshing, setRefreshing] = useState(false)

  const refresh = () => {
    setRefreshing(true)
    router.refresh()
    setLastRefresh(new Date())
    setTimeout(() => setRefreshing(false), 800)
  }

  // Auto-refresh every intervalMs
  useEffect(() => {
    const id = setInterval(refresh, intervalMs)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs])

  return (
    <div className="flex items-center gap-2">
      <span className="text-slate-600 text-xs">
        Updated{' '}
        {lastRefresh.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata' })}{' '}
        IST
      </span>
      <button
        onClick={refresh}
        disabled={refreshing}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm transition-colors disabled:opacity-50"
      >
        <span
          className={refreshing ? 'animate-spin inline-block' : 'inline-block'}
        >
          ↻
        </span>
        Refresh
      </button>
    </div>
  )
}
