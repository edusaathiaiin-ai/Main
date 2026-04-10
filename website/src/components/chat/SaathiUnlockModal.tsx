'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { SAATHIS } from '@/constants/saathis'
import { toSlug, toVerticalUuid } from '@/constants/verticalIds'
import { formatPoints } from '@/constants/saathiPoints'
import type { Profile } from '@/types'

type Props = {
  profile:         Profile
  pointsAvailable: number
  pointsCost:      number
  primaryColor?:   string
  onUnlocked:      (verticalUuid: string) => Promise<void>  // returns UUID
  onClose:         () => void
}

type EnrollmentRow = { vertical_id: string }  // UUID from DB

export function SaathiUnlockModal({
  profile,
  pointsAvailable,
  pointsCost,
  primaryColor = '#C9993A',
  onUnlocked,
  onClose,
}: Props) {
  const [step,          setStep]          = useState<'celebrate' | 'pick' | 'confirm' | 'done'>('celebrate')
  const [enrolledSlugs, setEnrolledSlugs] = useState<string[]>([])  // slugs for SAATHIS comparison
  const [selected,      setSelected]      = useState<typeof SAATHIS[0] | null>(null)
  const [unlocking,     setUnlocking]     = useState(false)
  const [error,         setError]         = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('saathi_enrollments')
      .select('vertical_id')      // UUIDs from DB
      .eq('user_id', profile.id)
      .then(({ data }) => {
        // Convert UUIDs → slugs for comparison against SAATHIS.id
        const slugs = (data as EnrollmentRow[] ?? [])
          .map((e) => toSlug(e.vertical_id))
          .filter(Boolean) as string[]
        setEnrolledSlugs(slugs)
      })
  }, [profile.id])

  // Filter using slugs — SAATHIS.id is always a slug
  const available = SAATHIS.filter((s) => !enrolledSlugs.includes(s.id))

  async function handleUnlock() {
    if (!selected || unlocking) return
    setUnlocking(true)
    setError(null)
    try {
      // Convert selected slug → UUID before calling RPC
      const verticalUuid = toVerticalUuid(selected.id)
      if (!verticalUuid) throw new Error('Unknown Saathi')

      const supabase = createClient()
      const { data, error: rpcError } = await supabase.rpc('unlock_saathi', {
        p_user_id:     profile.id,
        p_vertical_id: verticalUuid,   // ← UUID, not slug
        p_points_cost: pointsCost,
      })
      if (rpcError || !data?.success) {
        setError(data?.error ?? 'Something went wrong. Please try again.')
        setUnlocking(false)
        return
      }
      setStep('done')
      // Pass UUID back to parent
      setTimeout(() => void onUnlocked(verticalUuid), 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
      setUnlocking(false)
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(6,15,29,0.88)', backdropFilter: 'blur(16px)' }}
      onClick={step === 'celebrate' ? () => setStep('pick') : undefined}
    >
      <AnimatePresence mode="wait">

        {/* ── Celebrate ─────────────────────────────────────────────── */}
        {step === 'celebrate' && (
          <motion.div key="celebrate"
            initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl p-8 text-center"
            style={{ background: 'var(--bg-surface)', border: `1.5px solid ${primaryColor}50`,
              boxShadow: `0 0 60px ${primaryColor}20` }}>
            <motion.div animate={{ rotate: [0, 15, -15, 10, -10, 0] }}
              transition={{ duration: 0.6, delay: 0.2 }} className="mb-4 text-6xl">
              🎉
            </motion.div>
            <h2 className="font-display mb-3 text-2xl font-bold"
              style={{ color: primaryColor }}>
              Saathi Points milestone!
            </h2>
            <p className="mb-2 text-5xl font-bold tabular-nums" style={{ color: 'var(--text-primary)' }}>
              {formatPoints(pointsAvailable)}
            </p>
            <p className="mb-6 text-sm" style={{ color: 'var(--text-tertiary)' }}>
              Saathi Points earned through learning
            </p>
            <div className="mb-6 rounded-2xl p-4"
              style={{ background: `${primaryColor}10`, border: `0.5px solid ${primaryColor}30` }}>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                You&apos;ve earned the right to unlock
                <br /><span style={{ color: primaryColor }}>a new Saathi</span> — for free.
              </p>
            </div>
            <button onClick={() => setStep('pick')}
              className="w-full rounded-xl py-3 text-sm font-bold transition-all hover:brightness-110"
              style={{ background: primaryColor, color: '#060F1D' }}>
              Choose my new Saathi →
            </button>
            <p className="mt-3 text-[11px]" style={{ color: 'var(--text-ghost)' }}>
              Tap anywhere to continue
            </p>
          </motion.div>
        )}

        {/* ── Pick ──────────────────────────────────────────────────── */}
        {step === 'pick' && (
          <motion.div key="pick"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl overflow-hidden"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-medium)' }}>
            <div className="px-6 py-5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-display text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
                    Choose your new Saathi
                  </p>
                  <p className="text-[11px]" style={{ color: 'var(--text-tertiary)' }}>
                    Costs {formatPoints(pointsCost)} SP · You have {formatPoints(pointsAvailable)} SP
                  </p>
                </div>
                <button onClick={onClose}
                  style={{ background: 'none', border: 'none', cursor: 'pointer',
                    color: 'var(--text-ghost)', fontSize: '18px' }}>✕</button>
              </div>
            </div>

            <div className="max-h-72 overflow-y-auto px-4 py-3"
              style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {available.length === 0 ? (
                <p className="py-8 text-center text-sm"
                  style={{ color: 'var(--text-tertiary)' }}>
                  You&apos;ve unlocked all available Saathis! 🎊
                </p>
              ) : (
                available.map((s) => (
                  <button key={s.id}
                    onClick={() => { setSelected(s); setStep('confirm') }}
                    className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all"
                    style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = `${s.primary}15`
                      e.currentTarget.style.borderColor = `${s.primary}50`
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = 'var(--bg-elevated)'
                      e.currentTarget.style.borderColor = 'var(--border-subtle)'
                    }}>
                    <span style={{ fontSize: '22px', flexShrink: 0 }}>{s.emoji}</span>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{s.name}</p>
                      <p className="text-[10px] truncate"
                        style={{ color: 'var(--text-tertiary)' }}>{s.tagline}</p>
                    </div>
                    <span className="text-[10px] font-bold"
                      style={{ color: s.accent ?? primaryColor, flexShrink: 0 }}>
                      Select →
                    </span>
                  </button>
                ))
              )}
            </div>
          </motion.div>
        )}

        {/* ── Confirm ───────────────────────────────────────────────── */}
        {step === 'confirm' && selected && (
          <motion.div key="confirm"
            initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl p-6 text-center"
            style={{ background: 'var(--bg-surface)', border: `1.5px solid ${selected.primary}50` }}>
            <span className="mb-3 block text-5xl">{selected.emoji}</span>
            <h3 className="font-display mb-2 text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
              Unlock {selected.name}?
            </h3>
            <p className="mb-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
              {selected.tagline}
            </p>
            <p className="mb-6 text-sm" style={{ color: 'var(--text-tertiary)' }}>
              This will spend{' '}
              <span style={{ color: primaryColor, fontWeight: 700 }}>
                {formatPoints(pointsCost)} Saathi Points
              </span>
            </p>
            {error && (
              <p className="mb-4 rounded-xl px-3 py-2 text-xs"
                style={{ color: 'var(--error)', background: 'rgba(239,68,68,0.08)',
                  border: '1px solid rgba(239,68,68,0.25)' }}>
                {error}
              </p>
            )}
            <div className="flex gap-3">
              <button onClick={() => setStep('pick')}
                className="flex-1 rounded-xl py-2.5 text-sm transition-all"
                style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                ← Back
              </button>
              <button onClick={() => void handleUnlock()} disabled={unlocking}
                className="flex-1 rounded-xl py-2.5 text-sm font-bold transition-all hover:brightness-110 disabled:opacity-70"
                style={{ background: primaryColor, color: '#060F1D' }}>
                {unlocking ? 'Unlocking…' : `Unlock ${selected.name} ✦`}
              </button>
            </div>
          </motion.div>
        )}

        {/* ── Done ──────────────────────────────────────────────────── */}
        {step === 'done' && selected && (
          <motion.div key="done"
            initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 20 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-3xl p-8 text-center"
            style={{ background: 'var(--bg-surface)', border: `2px solid ${selected.primary}`,
              boxShadow: `0 0 50px ${selected.primary}25` }}>
            <motion.div animate={{ rotate: [0, -10, 10, -8, 8, 0] }}
              transition={{ duration: 0.5 }} className="mb-4 text-6xl">
              {selected.emoji}
            </motion.div>
            <h3 className="font-display mb-2 text-2xl font-bold"
              style={{ color: selected.accent ?? primaryColor }}>
              {selected.name} unlocked!
            </h3>
            <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
              Your new soul partner is ready.
            </p>
          </motion.div>
        )}

      </AnimatePresence>
    </motion.div>
  )
}
