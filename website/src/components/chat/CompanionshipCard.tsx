'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { SAATHIS } from '@/constants/saathis'
import { toSlug, toVerticalUuid } from '@/constants/verticalIds'
import { getSaathiSuggestions } from '@/lib/saathiSuggestions'
import type { Profile } from '@/types'

type CompanionshipData = {
  just_reached:    boolean
  already_reached?: boolean
  sessions?:       number
  depth_score?:    number
  days_together?:  number
  flame_stage?:    string
}

type SoulProfile = {
  academic_level?:       string | null
  institution_name?:     string | null
  future_subjects?:      string[] | null
  future_research_area?: string | null
}

type Props = {
  profile:        Profile
  verticalId:     string    // UUID — primary Saathi UUID from profiles
  location:       'sidebar' | 'chat'
  isLegalTheme?:  boolean
  primaryColor?:  string
  onAddSaathi?:   (verticalUuid: string) => void  // returns UUID
}

// ─── Add Saathi Modal ─────────────────────────────────────────────────────────

function AddSaathiModal({
  profile,
  currentVerticalId,   // UUID
  primaryColor,
  onDone,
  onClose,
}: {
  profile:           Profile
  currentVerticalId: string    // UUID
  primaryColor:      string
  onDone:            (verticalUuid: string, method: 'points' | 'paid') => void
  onClose:           () => void
}) {
  const [step,          setStep]          = useState<'suggest' | 'all' | 'confirm'>('suggest')
  const [enrolledSlugs, setEnrolledSlugs] = useState<string[]>([])  // slugs for filtering SAATHIS
  const [suggestions,   setSuggestions]   = useState<ReturnType<typeof getSaathiSuggestions>>([])
  const [selected,      setSelected]      = useState<typeof SAATHIS[0] | null>(null)
  const [soul,          setSoul]          = useState<SoulProfile>({})
  const [paying,        setPaying]        = useState(false)
  const [spending,      setSpending]      = useState(false)
  const [pointsBal,     setPointsBal]     = useState(0)
  const [error,         setError]         = useState<string | null>(null)

  useEffect(() => {
    const supabase = createClient()
    Promise.all([
      supabase
        .from('saathi_enrollments')
        .select('vertical_id')      // UUIDs from DB
        .eq('user_id', profile.id),
      supabase
        .from('student_soul')
        .select('academic_level, future_subjects, future_research_area')
        .eq('user_id', profile.id)
        .eq('vertical_id', currentVerticalId)   // UUID — correct
        .maybeSingle(),
      supabase
        .from('student_points')
        .select('total_points')
        .eq('user_id', profile.id)
        .maybeSingle(),
      supabase
        .from('profiles')
        .select('institution_name')
        .eq('id', profile.id)
        .maybeSingle(),
    ]).then(([{ data: enr }, { data: soulData }, { data: pts }, { data: prof }]) => {
      // Convert UUIDs → slugs for SAATHIS filtering
      const slugs = (enr ?? [])
        .map((e: { vertical_id: string }) => toSlug(e.vertical_id))
        .filter(Boolean) as string[]
      setEnrolledSlugs(slugs)

      const soulProfile: SoulProfile = {
        academic_level:       soulData?.academic_level,
        institution_name:     (prof as { institution_name?: string } | null)?.institution_name ?? (profile as Profile & { institution_name?: string }).institution_name,
        future_subjects:      soulData?.future_subjects,
        future_research_area: soulData?.future_research_area,
      }
      setSoul(soulProfile)
      setPointsBal((pts as { total_points?: number } | null)?.total_points ?? 0)

      // getSaathiSuggestions receives SLUGS — correct
      setSuggestions(getSaathiSuggestions(slugs, soulProfile, 3))
    })
  }, [profile.id, profile, currentVerticalId])

  // Filter using slugs — SAATHIS.id is always a slug
  const allUnenrolled = SAATHIS.filter((s) => !enrolledSlugs.includes(s.id))
  const canUsePoints  = pointsBal >= 500

  async function handlePaid() {
    if (!selected || paying) return
    setPaying(true)
    setError(null)
    try {
      // Convert selected slug → UUID for the order
      const verticalUuid = toVerticalUuid(selected.id)
      if (!verticalUuid) throw new Error('Unknown Saathi')

      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not logged in')

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/razorpay-order`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
          },
          body: JSON.stringify({
            planId:     'saathi_addon',
            verticalId: verticalUuid,   // ← UUID, not slug
            billing:    'monthly',
          }),
        }
      )
      const order = await res.json() as { orderId?: string; amount?: number; error?: string }
      if (!order.orderId) throw new Error(order.error ?? 'Order creation failed')

      const rzp = new (window as Window & {
        Razorpay: new (opts: object) => { open: () => void }
      }).Razorpay({
        key:         process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID ?? '',
        amount:      order.amount ?? 9900,
        currency:    'INR',
        order_id:    order.orderId,
        name:        'EdUsaathiAI',
        description: `Add ${selected.name} · ₹99/month`,
        theme:       { color: primaryColor },
        handler:     () => {
          onDone(verticalUuid, 'paid')   // ← UUID to parent
        },
        modal: { ondismiss: () => setPaying(false) },
      })
      rzp.open()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed')
      setPaying(false)
    }
  }

  async function handlePoints() {
    if (!selected || spending || !canUsePoints) return
    setSpending(true)
    setError(null)
    try {
      // Convert selected slug → UUID before RPC call
      const verticalUuid = toVerticalUuid(selected.id)
      if (!verticalUuid) throw new Error('Unknown Saathi')

      const supabase = createClient()
      const { data, error: rpcError } = await supabase.rpc('unlock_saathi', {
        p_user_id:     profile.id,
        p_vertical_id: verticalUuid,   // ← UUID, not slug
        p_points_cost: 500,
      })
      if (rpcError || !data?.success) {
        setError(data?.error ?? 'Could not unlock. Please try again.')
        setSpending(false)
        return
      }
      onDone(verticalUuid, 'points')   // ← UUID to parent
    } catch {
      setError('Something went wrong. Please try again.')
      setSpending(false)
    }
  }

  // suppress unused soul warning — used in getSaathiSuggestions call above
  void soul

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(6,15,29,0.88)', backdropFilter: 'blur(16px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.94, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 24 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl overflow-hidden"
        style={{ background: '#0B1F3A', border: '1px solid rgba(255,255,255,0.1)' }}
      >
        {/* Header */}
        <div className="px-6 py-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-playfair text-lg font-bold text-white">
                {step === 'confirm' && selected ? `Add ${selected.name}?` : 'Add another Saathi'}
              </p>
              <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                {step === 'suggest' ? 'Soul-matched for you · or browse all'
                  : step === 'all' ? 'All available Saathis'
                  : '₹99/month or 500 SP'}
              </p>
            </div>
            <button onClick={onClose}
              style={{ background: 'none', border: 'none', cursor: 'pointer',
                color: 'rgba(255,255,255,0.3)', fontSize: '18px' }}>✕</button>
          </div>
        </div>

        {/* Content */}
        <div className="px-5 py-4">
          <AnimatePresence mode="wait">

            {/* Suggestions / All */}
            {(step === 'suggest' || step === 'all') && (
              <motion.div key={step}
                initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}>
                <div className="mb-3 flex flex-col gap-2 max-h-64 overflow-y-auto">
                  {(step === 'suggest'
                    ? suggestions.map((s) => s.saathi)
                    : allUnenrolled
                  ).map((s, i) => {
                    const suggestion = suggestions.find((sg) => sg.saathi.id === s.id)
                    return (
                      <button key={s.id}
                        onClick={() => { setSelected(s); setStep('confirm') }}
                        className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-all"
                        style={{ background: 'rgba(255,255,255,0.04)',
                          border: '0.5px solid rgba(255,255,255,0.08)' }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = `${s.primary}18`
                          e.currentTarget.style.borderColor = `${s.primary}50`
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.04)'
                          e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'
                        }}>
                        <span style={{ fontSize: '22px', flexShrink: 0 }}>{s.emoji}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-white">{s.name}</p>
                          <p className="text-[10px] truncate"
                            style={{ color: 'rgba(255,255,255,0.4)' }}>
                            {suggestion?.reasons[0] ?? s.tagline}
                          </p>
                        </div>
                        {step === 'suggest' && i === 0 && (
                          <span className="rounded-full px-2 py-0.5 text-[8px] font-bold"
                            style={{ background: `${primaryColor}20`, color: primaryColor, flexShrink: 0 }}>
                            Best match
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>

                {step === 'suggest' && allUnenrolled.length > 3 && (
                  <button onClick={() => setStep('all')}
                    className="w-full text-center text-[11px] py-1"
                    style={{ color: 'rgba(255,255,255,0.35)', background: 'none',
                      border: 'none', cursor: 'pointer' }}>
                    Browse all {allUnenrolled.length} Saathis →
                  </button>
                )}
                {step === 'all' && (
                  <button onClick={() => setStep('suggest')}
                    className="w-full text-center text-[11px] py-1"
                    style={{ color: 'rgba(255,255,255,0.35)', background: 'none',
                      border: 'none', cursor: 'pointer' }}>
                    ← Back to recommendations
                  </button>
                )}
              </motion.div>
            )}

            {/* Confirm + payment choice */}
            {step === 'confirm' && selected && (
              <motion.div key="confirm"
                initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}>
                <div className="mb-4 rounded-2xl p-4 text-center"
                  style={{ background: `${selected.primary}12`,
                    border: `0.5px solid ${selected.primary}35` }}>
                  <span style={{ fontSize: '36px' }}>{selected.emoji}</span>
                  <p className="mt-2 text-sm font-bold text-white">{selected.name}</p>
                  <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    {selected.tagline}
                  </p>
                </div>

                <p className="mb-3 text-center text-[11px] font-semibold"
                  style={{ color: 'rgba(255,255,255,0.4)' }}>
                  Choose how to unlock
                </p>

                <button onClick={() => void handlePaid()} disabled={paying}
                  className="w-full rounded-xl py-3 mb-2 text-sm font-bold transition-all hover:brightness-110 disabled:opacity-60"
                  style={{ background: primaryColor, color: '#060F1D' }}>
                  {paying ? 'Opening payment…' : 'Add for ₹99/month →'}
                </button>

                <button onClick={() => void handlePoints()}
                  disabled={spending || !canUsePoints}
                  className="w-full rounded-xl py-2.5 text-sm font-semibold transition-all disabled:opacity-50"
                  style={{
                    background:  canUsePoints ? 'rgba(74,222,128,0.1)' : 'rgba(255,255,255,0.04)',
                    border:      canUsePoints ? '0.5px solid rgba(74,222,128,0.35)' : '0.5px solid rgba(255,255,255,0.08)',
                    color:       canUsePoints ? '#4ADE80' : 'rgba(255,255,255,0.3)',
                  }}>
                  {spending ? 'Unlocking…'
                    : canUsePoints
                      ? `Use 500 Saathi Points (you have ${pointsBal})`
                      : `Need 500 SP to unlock free (you have ${pointsBal})`}
                </button>

                {error && (
                  <p className="mt-3 rounded-xl px-3 py-2 text-center text-xs"
                    style={{ color: '#FCA5A5', background: 'rgba(239,68,68,0.1)',
                      border: '0.5px solid rgba(239,68,68,0.3)' }}>
                    {error}
                  </p>
                )}

                <button onClick={() => setStep('suggest')}
                  className="mt-3 w-full text-center text-[11px]"
                  style={{ color: 'rgba(255,255,255,0.3)', background: 'none',
                    border: 'none', cursor: 'pointer' }}>
                  ← Choose a different Saathi
                </button>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── CompanionshipCard ────────────────────────────────────────────────────────

export function CompanionshipCard({
  profile,
  verticalId,      // UUID — always from profiles.primary_saathi_id
  location,
  isLegalTheme = false,
  primaryColor = '#C9993A',
  onAddSaathi,
}: Props) {
  const [visible,   setVisible]   = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [data,      setData]      = useState<CompanionshipData | null>(null)
  const [done,      setDone]      = useState<{ method: 'points' | 'paid' } | null>(null)

  // Convert UUID → slug to find Saathi display data
  const saathiSlug = toSlug(verticalId)
  const saathi     = SAATHIS.find((s) => s.id === saathiSlug)

  const checkCompanionship = useCallback(async () => {
    if (profile.role !== 'student') return
    if (!verticalId) return
    const supabase = createClient()

    // Check if card already shown or acted on
    const { data: milestone } = await supabase
      .from('companionship_milestones')
      .select('card_shown_sidebar, card_shown_chat, action_taken')
      .eq('user_id', profile.id)
      .eq('vertical_id', verticalId)   // UUID — correct
      .maybeSingle()

    if (milestone?.action_taken) return
    if (location === 'sidebar' && milestone?.card_shown_sidebar) return
    if (location === 'chat'    && milestone?.card_shown_chat)    return

    const { data: result } = await supabase.rpc('check_companionship', {
      p_user_id:     profile.id,
      p_vertical_id: verticalId,        // UUID — correct
    })

    if (result?.just_reached || result?.already_reached) {
      setData(result as CompanionshipData)
      setVisible(true)
      await supabase.rpc('mark_companionship_card_shown', {
        p_user_id:     profile.id,
        p_vertical_id: verticalId,      // UUID — correct
        p_location:    location,
      })
    }
  }, [profile.id, profile.role, verticalId, location])

  useEffect(() => {
    void checkCompanionship()
  }, [checkCompanionship])

  async function handleDismiss() {
    setVisible(false)
    setDismissed(true)
    const supabase = createClient()
    await supabase
      .from('companionship_milestones')
      .update({ action_taken: 'dismissed' })
      .eq('user_id', profile.id)
      .eq('vertical_id', verticalId)   // UUID — correct
  }

  async function handleDone(newVerticalUuid: string, method: 'points' | 'paid') {
    setShowModal(false)
    setDone({ method })
    setVisible(false)
    const supabase = createClient()
    await supabase
      .from('companionship_milestones')
      .update({ action_taken: method })
      .eq('user_id', profile.id)
      .eq('vertical_id', verticalId)   // UUID — correct
    onAddSaathi?.(newVerticalUuid)     // pass UUID up
  }

  if (!visible || dismissed || !saathi) return null

  const bg     = isLegalTheme ? '#FFFDF7'           : 'rgba(201,153,58,0.06)'
  const border = isLegalTheme ? '1px solid #E8D98A' : '0.5px solid rgba(201,153,58,0.25)'
  const headC  = isLegalTheme ? '#1A1A1A'           : '#FFFFFF'
  const bodyC  = isLegalTheme ? '#555555'           : 'rgba(255,255,255,0.6)'
  const mutedC = isLegalTheme ? 'rgba(0,0,0,0.3)'  : 'rgba(255,255,255,0.25)'
  const padding = location === 'sidebar' ? '12px 14px' : '16px'
  const margin  = location === 'sidebar' ? '4px 12px'  : '12px 0'

  return (
    <>
      <AnimatePresence>
        {visible && !dismissed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3 }}
            style={{ margin, overflow: 'hidden' }}
          >
            <div style={{ borderRadius: '14px', background: bg, border, padding }}>
              <div className="flex items-start justify-between mb-2">
                <span style={{ fontSize: '9px', fontWeight: 700,
                  letterSpacing: '0.1em', textTransform: 'uppercase', color: primaryColor }}>
                  ✦ Full Companionship Reached
                </span>
                <button onClick={handleDismiss}
                  style={{ background: 'none', border: 'none', cursor: 'pointer',
                    color: mutedC, fontSize: '13px', padding: '0 2px', lineHeight: 1 }}>
                  ✕
                </button>
              </div>

              <div className="flex items-center gap-3 mb-3">
                <span style={{ fontSize: '28px' }}>{saathi.emoji}</span>
                <div>
                  <p style={{ fontSize: '13px', fontWeight: 700, color: headC, margin: '0 0 2px' }}>
                    Happy with {saathi.name}?
                  </p>
                  <p style={{ fontSize: '10px', color: bodyC, margin: 0 }}>
                    {data?.sessions ?? 10}+ sessions ·{' '}
                    {data?.days_together ?? 14}+ days ·{' '}
                    Depth {data?.depth_score ?? 60}/100
                  </p>
                </div>
              </div>

              <p style={{ fontSize: '11px', color: bodyC, lineHeight: 1.55, marginBottom: '12px' }}>
                You and {saathi.name} have grown together. Ready to expand your
                learning potential? Add another Saathi for ₹99/month — or use
                500 Saathi Points.
              </p>

              <button onClick={() => setShowModal(true)}
                className="w-full rounded-xl py-2.5 text-xs font-bold transition-all hover:brightness-110"
                style={{ background: primaryColor, color: '#060F1D' }}>
                Add another Saathi →
              </button>

              <button onClick={handleDismiss}
                className="mt-2 w-full text-center text-[10px]"
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: mutedC }}>
                Maybe later
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showModal && (
          <AddSaathiModal
            profile={profile}
            currentVerticalId={verticalId}   // UUID — passed through correctly
            primaryColor={primaryColor}
            onDone={handleDone}
            onClose={() => setShowModal(false)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {done && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={{ position: 'fixed', bottom: '32px', left: '50%',
              transform: 'translateX(-50%)', zIndex: 60,
              padding: '14px 24px', borderRadius: '16px',
              background: 'rgba(11,31,58,0.95)',
              border: `1px solid ${primaryColor}50`,
              backdropFilter: 'blur(16px)', textAlign: 'center' }}
          >
            <p style={{ fontSize: '14px', fontWeight: 700, color: primaryColor, margin: '0 0 4px' }}>
              New Saathi added! ✦
            </p>
            <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)', margin: 0 }}>
              {done.method === 'paid'
                ? 'Billing ₹99/month · Cancel anytime'
                : '500 Saathi Points spent'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
