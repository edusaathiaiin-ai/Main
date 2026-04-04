'use client'

import { useState } from 'react'
import { getBrowserClient } from '@/lib/supabase-browser'

const CRON_EDGE_FUNCTION_MAP: Record<string, string | null> = {
  'refresh-saathi-stats': 'refresh-saathi-stats',
  'rss-fetch': 'rss-fetch',
  'expire-learning-intents': 'expire-learning-intents',
  'check-minimum-seats': 'check-minimum-seats',
  'send-24h-reminders': 'send-24h-reminders',
  'send-1h-reminders': 'send-1h-reminders',
  'auto-release-payments': 'auto-release-payments',
  'auto-lift-suspensions': 'auto-lift-suspensions',
  'expire-referral-wallet': 'expire-referral-wallet',
  'admin-daily-digest': 'admin-digest',
  'admin-weekly-digest': 'admin-digest',
}

type Props = { jobId: string }

export function ManualCronButton({ jobId }: Props) {
  const [state, setState] = useState<'idle' | 'running' | 'done' | 'error'>(
    'idle'
  )

  async function trigger() {
    setState('running')
    try {
      const fnName = CRON_EDGE_FUNCTION_MAP[jobId]
      if (!fnName) {
        setState('error')
        return
      }

      const body =
        jobId === 'admin-weekly-digest'
          ? JSON.stringify({ force: 'weekly' })
          : jobId === 'admin-daily-digest'
            ? JSON.stringify({ force: 'daily' })
            : JSON.stringify({ manual: true })

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/${fnName}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''}`,
          },
          body,
        }
      )

      // Log the manual trigger
      const sb = getBrowserClient()
      await sb
        .from('cron_job_log')
        .upsert(
          {
            job_id: jobId,
            last_run_at: new Date().toISOString(),
            status: res.ok ? 'ok' : 'error',
          },
          { onConflict: 'job_id' }
        )

      setState(res.ok ? 'done' : 'error')
      if (res.ok) setTimeout(() => setState('idle'), 3000)
    } catch {
      setState('error')
      setTimeout(() => setState('idle'), 4000)
    }
  }

  if (state === 'done')
    return (
      <span className="text-xs text-emerald-400 font-semibold">
        ✓ Triggered
      </span>
    )
  if (state === 'error')
    return <span className="text-xs text-red-400 font-semibold">✗ Failed</span>
  if (state === 'running')
    return <span className="text-xs text-blue-400 animate-pulse">Running…</span>

  return (
    <button
      onClick={trigger}
      className="text-[10px] px-2.5 py-1 rounded-lg font-semibold bg-slate-700 text-slate-300 hover:bg-slate-600 transition-colors whitespace-nowrap"
    >
      ▶ Run now
    </button>
  )
}
