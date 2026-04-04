'use client'

import { useState } from 'react'
import { getBrowserClient } from '@/lib/supabase-browser'

type Props = { ruleId: string; isActive: boolean }

export function AutoRuleToggle({ ruleId, isActive }: Props) {
  const [active, setActive] = useState(isActive)
  const [busy, setBusy] = useState(false)

  async function toggle() {
    setBusy(true)
    const sb = getBrowserClient()
    await sb
      .from('auto_nudge_rules')
      .upsert(
        { rule_id: ruleId, is_active: !active },
        { onConflict: 'rule_id' }
      )
    setActive((v) => !v)
    setBusy(false)
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`relative w-10 h-6 rounded-full transition-all disabled:opacity-50 ${active ? 'bg-emerald-500' : 'bg-slate-600'}`}
    >
      <div
        className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${active ? 'left-5' : 'left-1'}`}
      />
    </button>
  )
}
