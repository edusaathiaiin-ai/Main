'use client'

import { useState, useTransition } from 'react'
import { verifyCorrection, rejectCorrection, markDuplicate } from './actions'

type Correction = {
  id: string
  vertical_slug: string
  bot_slot: number | null
  wrong_claim: string
  correct_claim: string
  topic: string | null
  message_excerpt: string | null
  evidence_url: string | null
  reporter_role: string | null
  reporter_email: string | null
  admin_note: string | null
  points_awarded: number
  created_at: string
  profiles: { full_name: string | null } | null
}

export function CorrectionRow({ c }: { c: Correction }) {
  const [expanded, setExpanded]   = useState(false)
  const [rejectNote, setNote]     = useState('')
  const [rejecting, setRejecting] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [done, setDone]           = useState<'verified' | 'rejected' | 'duplicate' | null>(null)

  if (done) {
    const colors = {
      verified:  'text-emerald-400 bg-emerald-500/10',
      rejected:  'text-red-400    bg-red-500/10',
      duplicate: 'text-slate-400  bg-slate-700/40',
    }
    return (
      <tr className={`border-b border-slate-800/60 ${colors[done]}`}>
        <td colSpan={7} className="px-5 py-3 text-xs font-semibold text-center">
          {done === 'verified'  && '✅ Verified — correction is live'}
          {done === 'rejected'  && '❌ Rejected'}
          {done === 'duplicate' && '🔁 Marked as duplicate'}
        </td>
      </tr>
    )
  }

  function act(fn: () => Promise<void>, result: typeof done) {
    startTransition(async () => {
      await fn()
      setDone(result)
    })
  }

  const flagged = c.admin_note?.includes('⚠️') || c.admin_note?.includes('🚩')

  return (
    <>
      <tr
        className="border-b border-slate-800/60 hover:bg-slate-800/20 cursor-pointer"
        onClick={() => setExpanded(v => !v)}
      >
        {/* Saathi */}
        <td className="px-5 py-3 text-xs text-slate-300 font-medium whitespace-nowrap">
          {c.vertical_slug}
          {c.bot_slot && <span className="ml-1 text-slate-600">· slot {c.bot_slot}</span>}
        </td>
        {/* Reporter */}
        <td className="px-4 py-3 text-xs text-slate-400">
          <div>{c.profiles?.full_name ?? '—'}</div>
          <div className="text-slate-600">{c.reporter_role}</div>
        </td>
        {/* Wrong claim */}
        <td className="px-4 py-3 text-xs text-red-300/80 max-w-[200px]">
          <p className="line-clamp-2">{c.wrong_claim}</p>
        </td>
        {/* Correct claim */}
        <td className="px-4 py-3 text-xs text-emerald-300/80 max-w-[200px]">
          <p className="line-clamp-2">{c.correct_claim}</p>
        </td>
        {/* Evidence */}
        <td className="px-4 py-3 text-xs text-center">
          {c.evidence_url
            ? <span className="text-amber-400 font-semibold">✓ URL</span>
            : <span className="text-slate-600">—</span>}
        </td>
        {/* Flag */}
        <td className="px-4 py-3 text-xs text-center">
          {flagged ? <span title={c.admin_note ?? ''}>🚩</span> : <span className="text-slate-700">·</span>}
        </td>
        {/* Date */}
        <td className="px-4 py-3 text-xs text-slate-500 whitespace-nowrap">
          {new Date(c.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
        </td>
      </tr>

      {/* Expanded detail row */}
      {expanded && (
        <tr className="border-b border-slate-700 bg-slate-900/80">
          <td colSpan={7} className="px-5 py-4 space-y-4">

            {/* Claims side by side */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl p-3 bg-red-500/5 border border-red-500/15">
                <p className="text-[10px] font-bold uppercase tracking-wider text-red-400 mb-1.5">What Saathi said (WRONG)</p>
                <p className="text-xs text-white/80 leading-relaxed">{c.wrong_claim}</p>
              </div>
              <div className="rounded-xl p-3 bg-emerald-500/5 border border-emerald-500/15">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 mb-1.5">Reporter's correction</p>
                <p className="text-xs text-white/80 leading-relaxed">{c.correct_claim}</p>
              </div>
            </div>

            {/* Meta */}
            <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-slate-500">
              {c.topic         && <span>Topic: <span className="text-slate-300">{c.topic}</span></span>}
              {c.reporter_email && <span>Email: <span className="text-slate-300">{c.reporter_email}</span></span>}
              {c.evidence_url  && (
                <span>Source: <a href={c.evidence_url} target="_blank" rel="noreferrer"
                  className="text-amber-400 underline">{c.evidence_url}</a></span>
              )}
            </div>

            {/* Message excerpt */}
            {c.message_excerpt && (
              <div className="rounded-lg p-3 bg-slate-800/60 border border-slate-700">
                <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Saathi message excerpt</p>
                <p className="text-xs text-slate-400 italic leading-relaxed">&ldquo;{c.message_excerpt}&rdquo;</p>
              </div>
            )}

            {/* Flag note */}
            {flagged && (
              <p className="text-xs text-orange-400 bg-orange-500/10 rounded-lg px-3 py-2">
                ⚠️ {c.admin_note}
              </p>
            )}

            {/* Actions */}
            {!rejecting ? (
              <div className="flex gap-2 pt-1">
                <button
                  disabled={isPending}
                  onClick={e => { e.stopPropagation(); act(() => verifyCorrection(c.id), 'verified') }}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 transition-colors"
                >
                  {isPending ? 'Working…' : '✅ Verify & award 50 SP'}
                </button>
                <button
                  onClick={e => { e.stopPropagation(); setRejecting(true) }}
                  className="px-4 py-2 rounded-lg text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-300 transition-colors"
                >
                  ❌ Reject
                </button>
                <button
                  disabled={isPending}
                  onClick={e => { e.stopPropagation(); act(() => markDuplicate(c.id), 'duplicate') }}
                  className="px-4 py-2 rounded-lg text-xs font-medium bg-slate-700 hover:bg-slate-600 text-slate-400 transition-colors"
                >
                  🔁 Duplicate
                </button>
              </div>
            ) : (
              <div className="flex gap-2 pt-1" onClick={e => e.stopPropagation()}>
                <input
                  value={rejectNote}
                  onChange={e => setNote(e.target.value)}
                  placeholder="Reason for rejection (optional)"
                  className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white placeholder-slate-500 outline-none focus:border-red-500/50"
                />
                <button
                  disabled={isPending}
                  onClick={() => act(() => rejectCorrection(c.id, rejectNote), 'rejected')}
                  className="px-4 py-2 rounded-lg text-xs font-bold bg-red-600 hover:bg-red-500 text-white disabled:opacity-40"
                >
                  {isPending ? 'Rejecting…' : 'Confirm Reject'}
                </button>
                <button onClick={() => setRejecting(false)}
                  className="px-3 py-2 rounded-lg text-xs text-slate-500 hover:text-slate-300">
                  Cancel
                </button>
              </div>
            )}
          </td>
        </tr>
      )}
    </>
  )
}
