'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { SAATHIS } from '@/constants/saathis'
import { toSlug, toVerticalUuid } from '@/constants/verticalIds'
import {
  getProgressToNext,
  getNextThreshold,
  formatPoints,
} from '@/constants/saathiPoints'
import { SaathiUnlockModal } from './SaathiUnlockModal'
import type { Profile } from '@/types'

type PointsData = {
  total_points:     number
  lifetime_points:  number
  streak_days:      number
  target_saathi_id: string | null  // UUID from DB
}

type Props = {
  profile:       Profile
  isLegalTheme?: boolean
  primaryColor?: string
  onUnlock?:     (verticalId: string) => void  // returns UUID
}

export function SaathiPointsBar({
  profile,
  isLegalTheme = false,
  primaryColor = '#C9993A',
  onUnlock,
}: Props) {
  const [points,        setPoints]        = useState<PointsData | null>(null)
  const [enrolledCount, setEnrolledCount] = useState(1)
  const [showUnlock,    setShowUnlock]    = useState(false)
  const [showPicker,    setShowPicker]    = useState(false)
  const [justEarned,    setJustEarned]    = useState<number | null>(null)

  const loadPoints = useCallback(async () => {
    const supabase = createClient()
    const [{ data: sp }, { count }] = await Promise.all([
      supabase
        .from('student_points')
        .select('total_points, lifetime_points, streak_days, target_saathi_id')
        .eq('user_id', profile.id)
        .maybeSingle(),
      supabase
        .from('saathi_enrollments')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', profile.id),
    ])
    if (sp) setPoints(sp as PointsData)
    setEnrolledCount(count ?? 1)
  }, [profile.id])

  useEffect(() => {
    if (profile.role !== 'student') return
    void loadPoints()

    const supabase = createClient()
    const channel = supabase
      .channel('points-updates')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'student_points',
          filter: `user_id=eq.${profile.id}` },
        (payload) => {
          const newData = payload.new as PointsData
          const oldData = payload.old as { total_points?: number }
          const earned = (newData.total_points ?? 0) - (oldData.total_points ?? 0)
          if (earned > 0) {
            setJustEarned(earned)
            setTimeout(() => setJustEarned(null), 2500)
          }
          setPoints(newData)
        }
      )
      .subscribe()

    return () => { void supabase.removeChannel(channel) }
  }, [profile.id, profile.role, loadPoints])

  if (profile.role !== 'student' || !points) return null

  const totalPoints   = points.total_points ?? 0
  const progress      = getProgressToNext(totalPoints, enrolledCount)
  const nextThreshold = getNextThreshold(totalPoints, enrolledCount)
  const canUnlock     = nextThreshold && totalPoints >= nextThreshold.points

  // target_saathi_id is UUID from DB → convert to slug to find in SAATHIS
  const targetSlug   = points.target_saathi_id
    ? toSlug(points.target_saathi_id)
    : null
  const targetSaathi = targetSlug
    ? SAATHIS.find((s) => s.id === targetSlug)
    : null

  const labelColor = isLegalTheme ? '#888888'                : 'rgba(255,255,255,0.3)'
  const valueColor = isLegalTheme ? '#1A1A1A'                : '#FFFFFF'
  const trackBg    = isLegalTheme ? '#E8E8E8'                : 'rgba(255,255,255,0.08)'
  const borderColor= isLegalTheme ? '0.5px solid #E8E8E8'   : '0.5px solid rgba(255,255,255,0.06)'

  return (
    <>
      <div className="px-5 py-3" style={{ borderBottom: borderColor }}>

        {/* Header row */}
        <div className="mb-2 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span style={{ fontSize: '11px' }}>✦</span>
            <span className="text-[10px] font-semibold tracking-wider uppercase"
              style={{ color: labelColor }}>
              Saathi Points
            </span>
            {(points.streak_days ?? 0) >= 3 && (
              <span className="rounded-full px-1.5 py-0.5 text-[8px] font-bold"
                style={{ background: 'rgba(245,158,11,0.15)', color: '#F59E0B' }}>
                🔥 {points.streak_days}d
              </span>
            )}
          </div>

          <div className="relative flex items-center gap-1">
            <AnimatePresence>
              {justEarned && (
                <motion.span
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: -2 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="absolute -top-4 right-0 text-[10px] font-bold"
                  style={{ color: '#4ADE80', whiteSpace: 'nowrap' }}>
                  +{justEarned} SP
                </motion.span>
              )}
            </AnimatePresence>
            <span className="text-xs font-bold tabular-nums" style={{ color: valueColor }}>
              {formatPoints(totalPoints)}
            </span>
            <span className="text-[10px]" style={{ color: labelColor }}>SP</span>
          </div>
        </div>

        {/* Progress bar */}
        {progress ? (
          <>
            <div className="mb-1.5 h-1.5 w-full overflow-hidden rounded-full"
              style={{ background: trackBg }}>
              <motion.div
                className="h-full rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress.progress * 100}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                style={{
                  background: canUnlock
                    ? 'linear-gradient(90deg, #4ADE80, #22C55E)'
                    : `linear-gradient(90deg, ${primaryColor}, ${primaryColor}AA)`,
                }}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                {targetSaathi ? (
                  <>
                    <span style={{ fontSize: '12px' }}>{targetSaathi.emoji}</span>
                    <span className="text-[10px]" style={{ color: labelColor }}>
                      {targetSaathi.name}
                    </span>
                  </>
                ) : (
                  <button onClick={() => setShowPicker(true)}
                    className="text-[10px] transition-colors"
                    style={{ color: primaryColor, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
                    Set target Saathi →
                  </button>
                )}
              </div>

              {canUnlock ? (
                <motion.button
                  animate={{ scale: [1, 1.05, 1] }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  onClick={() => setShowUnlock(true)}
                  className="rounded-full px-2.5 py-0.5 text-[10px] font-bold"
                  style={{
                    background: 'rgba(74,222,128,0.15)',
                    border: '0.5px solid rgba(74,222,128,0.4)',
                    color: '#4ADE80', cursor: 'pointer',
                  }}>
                  Unlock! 🎉
                </motion.button>
              ) : (
                <span className="text-[10px]" style={{ color: labelColor }}>
                  {progress.pointsNeeded} SP to go
                </span>
              )}
            </div>
          </>
        ) : (
          <p className="text-[10px]" style={{ color: '#4ADE80' }}>
            ✦ All Saathis unlocked · {formatPoints(totalPoints)} SP earned
          </p>
        )}
      </div>

      {/* Target picker */}
      <AnimatePresence>
        {showPicker && (
          <SaathiTargetPicker
            profile={profile}
            primaryColor={primaryColor}
            isLegalTheme={isLegalTheme}
            onSelect={async (slugSelected) => {
              // Convert slug → UUID before writing to DB
              const uuid = toVerticalUuid(slugSelected)
              if (!uuid) return
              const supabase = createClient()
              await supabase
                .from('student_points')
                .upsert({ user_id: profile.id, target_saathi_id: uuid })
              // Store UUID in local state (consistent with DB)
              setPoints((p) => p ? { ...p, target_saathi_id: uuid } : p)
              setShowPicker(false)
            }}
            onClose={() => setShowPicker(false)}
          />
        )}
      </AnimatePresence>

      {/* Unlock modal */}
      <AnimatePresence>
        {showUnlock && nextThreshold && (
          <SaathiUnlockModal
            profile={profile}
            pointsAvailable={totalPoints}
            pointsCost={nextThreshold.points}
            primaryColor={primaryColor}
            onUnlocked={async (unlockedUuid) => {
              setShowUnlock(false)
              await loadPoints()
              onUnlock?.(unlockedUuid)
            }}
            onClose={() => setShowUnlock(false)}
          />
        )}
      </AnimatePresence>
    </>
  )
}

// ─── Target Saathi picker ─────────────────────────────────────────────────────

function SaathiTargetPicker({
  profile,
  primaryColor,
  isLegalTheme,
  onSelect,  // receives SLUG — caller converts to UUID
  onClose,
}: {
  profile:       Profile
  primaryColor:  string
  isLegalTheme:  boolean
  onSelect:      (slug: string) => Promise<void>
  onClose:       () => void
}) {
  const [enrolledSlugs, setEnrolledSlugs] = useState<string[]>([])

  useEffect(() => {
    const supabase = createClient()
    supabase
      .from('saathi_enrollments')
      .select('vertical_id')       // UUIDs from DB
      .eq('user_id', profile.id)
      .then(({ data }) => {
        // Convert UUIDs → slugs for comparison against SAATHIS.id
        const slugs = (data ?? [])
          .map((e: { vertical_id: string }) => toSlug(e.vertical_id))
          .filter(Boolean) as string[]
        setEnrolledSlugs(slugs)
      })
  }, [profile.id])

  // Filter using slugs — SAATHIS.id is always a slug
  const available = SAATHIS.filter((s) => !enrolledSlugs.includes(s.id))

  const bg     = isLegalTheme ? '#FFFFFF'            : '#0D2140'
  const border = isLegalTheme ? '1px solid #E0E0E0'  : '1px solid rgba(255,255,255,0.12)'

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end justify-center p-4 md:items-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        exit={{ y: 40, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl"
        style={{ background: bg, border, padding: '20px' }}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="font-playfair text-base font-bold"
               style={{ color: isLegalTheme ? '#1A1A1A' : '#FFFFFF' }}>
              Set your next goal
            </p>
            <p className="text-[11px]"
               style={{ color: isLegalTheme ? '#888888' : 'rgba(255,255,255,0.4)' }}>
              Which Saathi are you earning toward?
            </p>
          </div>
          <button onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer',
              color: isLegalTheme ? '#AAAAAA' : 'rgba(255,255,255,0.3)', fontSize: '18px' }}>
            ✕
          </button>
        </div>

        <div className="flex max-h-64 flex-col gap-2 overflow-y-auto">
          {available.map((s) => (
            <button
              key={s.id}
              onClick={() => void onSelect(s.id)}  // passes SLUG; caller converts to UUID
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all"
              style={{
                background:  isLegalTheme ? '#F4F4F4' : 'rgba(255,255,255,0.05)',
                border:      isLegalTheme ? '1px solid #E8E8E8' : '0.5px solid rgba(255,255,255,0.08)',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = `${s.primary}15`
                e.currentTarget.style.borderColor = `${s.primary}50`
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = isLegalTheme ? '#F4F4F4' : 'rgba(255,255,255,0.05)'
                e.currentTarget.style.borderColor = isLegalTheme ? '#E8E8E8' : 'rgba(255,255,255,0.08)'
              }}
            >
              <span style={{ fontSize: '20px' }}>{s.emoji}</span>
              <div>
                <p className="text-xs font-semibold"
                   style={{ color: isLegalTheme ? '#1A1A1A' : '#FFFFFF' }}>
                  {s.name}
                </p>
                <p className="text-[10px]"
                   style={{ color: isLegalTheme ? '#888888' : 'rgba(255,255,255,0.4)' }}>
                  {s.tagline}
                </p>
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}
