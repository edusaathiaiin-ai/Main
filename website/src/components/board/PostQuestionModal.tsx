'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import type { Profile } from '@/types'

// ── Per-Saathi topic tags ──────────────────────────────────────────────────────

const SAATHI_TAGS: Record<string, string[]> = {
  kanoonsaathi: [
    'Constitutional Law',
    'IPC / BNSS',
    'Civil Law',
    'Criminal Law',
    'UPSC Law',
    'Other',
  ],
  mathsaathi: [
    'Calculus',
    'Algebra',
    'Statistics',
    'Geometry',
    'Number Theory',
    'Other',
  ],
  sciencesaathi: [
    'Physics',
    'Chemistry',
    'Biology',
    'Environmental Science',
    'Research Methods',
    'Other',
  ],
  historysaathi: [
    'Ancient India',
    'Medieval India',
    'Modern India',
    'World History',
    'UPSC History',
    'Other',
  ],
  geosaathi: [
    'Physical Geography',
    'Human Geography',
    'Indian Geography',
    'Maps',
    'UPSC Geo',
    'Other',
  ],
  ecoSaathi: [
    'Microeconomics',
    'Macroeconomics',
    'Indian Economy',
    'Development',
    'Policy',
    'Other',
  ],
}

const DEFAULT_TAGS = [
  'Concept',
  'Theory',
  'Practice',
  'Exam Prep',
  'Fast Answer',
  'Other',
]

// ── Inline Dialog primitive ───────────────────────────────────────────────────

function DialogOverlay({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-40"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
    />
  )
}

type Props = {
  open: boolean
  onClose: () => void
  saathiSlug: string // slug — used for tag lookup + AI trigger
  verticalUuid: string // UUID — used for DB insert
  saathiName: string
  primaryColor: string
  profile: Profile
  onPosted: (newId: string) => void
  boardQuota?: { allowed: boolean; used: number; limit: number } | null
}

export function PostQuestionModal({
  open,
  onClose,
  saathiSlug,
  verticalUuid,
  saathiName,
  primaryColor,
  profile,
  onPosted,
  boardQuota,
}: Props) {
  const [title, setTitle] = useState('')
  const [tag, setTag] = useState('')
  const [isAnonymous, setIsAnonymous] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [quotaError, setQuotaError] = useState(false)
  const [postedId, setPostedId] = useState<string | null>(null)

  const tags = SAATHI_TAGS[saathiSlug] ?? DEFAULT_TAGS
  const MAX_TITLE = 200

  function handleClose() {
    // Reset form state when closing
    setTitle('')
    setTag('')
    setIsAnonymous(false)
    setError(null)
    setQuotaError(false)
    setPostedId(null)
    onClose()
  }

  async function handleSubmit() {
    if (!title.trim() || submitting) return
    setSubmitting(true)
    setError(null)
    setQuotaError(false)

    // Server-side gate: covers quota, 24h restriction, and profile completeness
    try {
      const quotaRes = await fetch('/api/board/quota')
      if (quotaRes.ok) {
        const quota = await quotaRes.json()
        if (!quota.allowed) {
          setQuotaError(true)
          setSubmitting(false)
          return
        }
      }
    } catch {
      // Network error — let the insert proceed; RLS enforces at DB level
    }

    const supabase = createClient()
    const { data: session } = await supabase.auth.getSession()
    if (!session.session) {
      setError('Not logged in')
      setSubmitting(false)
      return
    }

    const { data: q, error: err } = await supabase
      .from('board_questions')
      .insert({
        user_id: profile.id,
        vertical_id: verticalUuid,
        title: title.trim(),
        body: '',
        tags: tag ? [tag] : [],
        is_anonymous: isAnonymous,
        status: 'open',
      })
      .select('id')
      .single()

    if (err || !q) {
      // RLS quota block (42501 = insufficient_privilege)
      if (err?.code === '42501') {
        setQuotaError(true)
      } else {
        setError(err?.message ?? 'Failed to post. Try again.')
      }
      setSubmitting(false)
      return
    }

    // Trigger AI auto-answer (fire and forget)
    fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/board-answer`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${session.session.access_token}`,
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
      },
      body: JSON.stringify({ questionId: q.id, saathiId: saathiSlug }),
    }).catch(() => {})

    // Notify parent to refresh feed
    onPosted(q.id)

    // Show success screen (don't close yet)
    setPostedId(q.id)
    setSubmitting(false)
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <DialogOverlay onClose={handleClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-lg -translate-y-1/2 rounded-3xl p-7"
            style={{
              background: 'linear-gradient(160deg,#0B1F3A 0%,#060F1D 100%)',
              border: '0.5px solid rgba(255,255,255,0.1)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
            }}
          >
            {/* ── Success state ─────────────────────────────────────────── */}
            {postedId ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{ textAlign: 'center', padding: '32px 20px' }}
              >
                {/* Animated checkmark */}
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 200, delay: 0.1 }}
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    background: 'rgba(74,222,128,0.15)',
                    border: '2px solid #4ADE80',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 20px',
                    fontSize: '28px',
                    color: '#4ADE80',
                  }}
                >
                  ✓
                </motion.div>

                <h3
                  style={{
                    fontFamily: 'var(--font-playfair)',
                    fontSize: '22px',
                    fontWeight: '700',
                    color: '#fff',
                    margin: '0 0 10px',
                  }}
                >
                  Question posted!
                </h3>

                <p
                  style={{
                    fontSize: '13px',
                    color: 'rgba(255,255,255,0.5)',
                    margin: '0 0 6px',
                    lineHeight: 1.6,
                  }}
                >
                  {saathiName} is generating an AI answer right now.
                </p>
                <p
                  style={{
                    fontSize: '13px',
                    color: 'rgba(255,255,255,0.5)',
                    margin: '0 0 28px',
                    lineHeight: 1.6,
                  }}
                >
                  Community members can also reply. We&apos;ll notify you when
                  someone answers.
                </p>

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                  }}
                >
                  {/* Primary CTA — go see the question */}
                  <Link
                    href={`/board?question=${postedId}`}
                    onClick={handleClose}
                    style={{
                      display: 'block',
                      padding: '13px',
                      background: primaryColor,
                      color: '#0B1F3A',
                      borderRadius: '12px',
                      fontSize: '13px',
                      fontWeight: '700',
                      textDecoration: 'none',
                      textAlign: 'center',
                    }}
                  >
                    See your question + AI answer →
                  </Link>

                  {/* Secondary — stay here */}
                  <button
                    onClick={handleClose}
                    style={{
                      padding: '12px',
                      background: 'transparent',
                      border: '0.5px solid rgba(255,255,255,0.15)',
                      borderRadius: '12px',
                      color: 'rgba(255,255,255,0.5)',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    Back to chat
                  </button>
                </div>

                <p
                  style={{
                    fontSize: '11px',
                    color: 'rgba(255,255,255,0.2)',
                    marginTop: '16px',
                  }}
                >
                  You&apos;ll get a notification when someone from the community
                  replies.
                </p>
              </motion.div>
            ) : (
              /* ── Post form ──────────────────────────────────────────── */
              <>
                {/* Close */}
                <button
                  onClick={handleClose}
                  className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full text-sm"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    color: 'rgba(255,255,255,0.4)',
                  }}
                >
                  ✕
                </button>

                <h2 className="font-playfair mb-1 text-2xl font-bold text-white">
                  Ask {saathiName}
                </h2>
                <p
                  className="mb-6 text-sm"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                >
                  Your question will get an AI answer immediately, and community
                  members can reply.
                </p>

                {/* Title textarea */}
                <div className="mb-4">
                  <div className="mb-1.5 flex justify-between">
                    <label
                      className="text-xs font-medium"
                      style={{ color: 'rgba(255,255,255,0.5)' }}
                    >
                      Your question{' '}
                      <span style={{ color: primaryColor }}>*</span>
                    </label>
                    <span
                      className="text-[10px]"
                      style={{
                        color:
                          title.length > MAX_TITLE - 30
                            ? '#FCA5A5'
                            : 'rgba(255,255,255,0.25)',
                      }}
                    >
                      {title.length} / {MAX_TITLE}
                    </span>
                  </div>
                  <textarea
                    value={title}
                    onChange={(e) =>
                      setTitle(e.target.value.slice(0, MAX_TITLE))
                    }
                    placeholder="What would you like to understand or discuss?"
                    rows={3}
                    className="w-full resize-none rounded-xl px-4 py-3 text-sm text-white transition-all outline-none"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '0.5px solid rgba(255,255,255,0.1)',
                      fontFamily: 'var(--font-dm-sans)',
                    }}
                    onFocus={(e) =>
                      (e.currentTarget.style.borderColor = `${primaryColor}80`)
                    }
                    onBlur={(e) =>
                      (e.currentTarget.style.borderColor =
                        'rgba(255,255,255,0.1)')
                    }
                  />
                </div>

                {/* Topic tag */}
                <div className="mb-5">
                  <p
                    className="mb-2 text-xs font-medium"
                    style={{ color: 'rgba(255,255,255,0.5)' }}
                  >
                    Topic tag
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((t) => {
                      const active = tag === t
                      return (
                        <button
                          key={t}
                          onClick={() => setTag(active ? '' : t)}
                          className="rounded-full px-3 py-1.5 text-xs font-medium transition-all duration-150"
                          style={{
                            background: active
                              ? primaryColor
                              : 'rgba(255,255,255,0.05)',
                            border: `0.5px solid ${active ? primaryColor : 'rgba(255,255,255,0.1)'}`,
                            color: active
                              ? '#060F1D'
                              : 'rgba(255,255,255,0.55)',
                          }}
                        >
                          {t}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* Anonymous toggle */}
                <div
                  className="mb-6 flex items-center justify-between rounded-xl px-4 py-3"
                  style={{
                    background: 'rgba(255,255,255,0.03)',
                    border: '0.5px solid rgba(255,255,255,0.07)',
                  }}
                >
                  <div>
                    <p className="text-sm font-medium text-white">
                      Post anonymously
                    </p>
                    <p
                      className="text-[11px]"
                      style={{ color: 'rgba(255,255,255,0.35)' }}
                    >
                      Shows as &quot;Anonymous Student&quot;
                    </p>
                  </div>
                  <button
                    onClick={() => setIsAnonymous(!isAnonymous)}
                    className="relative h-6 w-11 rounded-full transition-all duration-200"
                    style={{
                      background: isAnonymous
                        ? primaryColor
                        : 'rgba(255,255,255,0.12)',
                    }}
                  >
                    <div
                      className="absolute top-1 h-4 w-4 rounded-full bg-white transition-all duration-200"
                      style={{ left: isAnonymous ? '1.5rem' : '0.25rem' }}
                    />
                  </button>
                </div>

                {/* Place B — quota error */}
                {quotaError ? (
                  <div
                    style={{
                      padding: '16px',
                      background: 'rgba(201,153,58,0.06)',
                      border: '0.5px solid rgba(201,153,58,0.25)',
                      borderRadius: '12px',
                      marginBottom: '16px',
                      textAlign: 'center',
                    }}
                  >
                    <p style={{ fontSize: '20px', margin: '0 0 8px' }}>⚡</p>
                    <p
                      style={{
                        fontSize: '13px',
                        fontWeight: '700',
                        color: '#C9993A',
                        margin: '0 0 4px',
                      }}
                    >
                      Daily limit reached
                    </p>
                    <p
                      style={{
                        fontSize: '12px',
                        color: 'rgba(255,255,255,0.45)',
                        margin: '0 0 16px',
                        lineHeight: 1.5,
                      }}
                    >
                      You&apos;ve used all {boardQuota?.limit} questions for
                      today. Upgrade for more.
                    </p>

                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '8px',
                      }}
                    >
                      <Link
                        href="/pricing"
                        onClick={handleClose}
                        style={{
                          display: 'block',
                          padding: '12px',
                          background: '#C9993A',
                          color: '#0B1F3A',
                          borderRadius: '10px',
                          fontSize: '13px',
                          fontWeight: '700',
                          textDecoration: 'none',
                          textAlign: 'center',
                        }}
                      >
                        Upgrade to Plus — ₹199/month →
                      </Link>

                      <button
                        onClick={handleClose}
                        style={{
                          padding: '11px',
                          background: 'transparent',
                          border: '0.5px solid rgba(255,255,255,0.12)',
                          borderRadius: '10px',
                          color: 'rgba(255,255,255,0.4)',
                          fontSize: '12px',
                          cursor: 'pointer',
                        }}
                      >
                        Close — come back tomorrow
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Regular error */}
                    {error && (
                      <p className="mb-4 text-xs" style={{ color: '#FCA5A5' }}>
                        ⚠️ {error}
                      </p>
                    )}

                    {/* Submit */}
                    <button
                      onClick={handleSubmit}
                      disabled={!title.trim() || submitting}
                      className="w-full rounded-xl py-3.5 text-base font-semibold transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50"
                      style={{ background: primaryColor, color: '#060F1D' }}
                    >
                      {submitting ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#060F1D]/30 border-t-[#060F1D]" />
                          Posting...
                        </span>
                      ) : (
                        'Post Question →'
                      )}
                    </button>
                  </>
                )}
              </>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
