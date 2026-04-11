'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { todayIST } from '@/lib/date'
import { SAATHIS } from '@/constants/saathis'
import { toSlug } from '@/constants/verticalIds'

type Flashcard = {
  id: string
  vertical_id: string
  front: string
  back: string
  ease_factor: number
  interval_days: number
  repetitions: number
  next_review_date: string
  last_reviewed_at: string | null
  created_at: string
}

type Props = {
  saathiId: string
}

// SM-2 algorithm
function sm2(
  card: Flashcard,
  quality: 0 | 3 | 5
): Pick<
  Flashcard,
  'ease_factor' | 'interval_days' | 'repetitions' | 'next_review_date'
> {
  let { ease_factor, interval_days, repetitions } = card

  if (quality >= 3) {
    if (repetitions === 0) interval_days = 1
    else if (repetitions === 1) interval_days = 6
    else interval_days = Math.round(interval_days * ease_factor)
    repetitions += 1
    ease_factor = Math.max(
      1.3,
      ease_factor + 0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)
    )
  } else {
    repetitions = 0
    interval_days = 1
  }

  const next = new Date()
  next.setDate(next.getDate() + interval_days)
  const next_review_date = next.toISOString().split('T')[0]

  return { ease_factor, interval_days, repetitions, next_review_date }
}

function FlipCard({
  card,
  primaryColor,
  onReview,
  onDelete,
}: {
  card: Flashcard
  primaryColor: string
  onReview: (id: string, quality: 0 | 3 | 5) => Promise<void>
  onDelete: (id: string) => void
}) {
  const [flipped, setFlipped] = useState(false)
  const [reviewing, setReviewing] = useState(false)

  async function handleReview(quality: 0 | 3 | 5) {
    setReviewing(true)
    await onReview(card.id, quality)
    setReviewing(false)
    setFlipped(false)
  }

  const saathi = SAATHIS.find((s) => s.id === toSlug(card.vertical_id))

  return (
    <div style={{ perspective: '1000px' }}>
      <motion.div
        onClick={() => !reviewing && setFlipped((f) => !f)}
        animate={{ rotateY: flipped ? 180 : 0 }}
        transition={{
          duration: 0.5,
          type: 'spring',
          stiffness: 200,
          damping: 20,
        }}
        style={{
          transformStyle: 'preserve-3d',
          position: 'relative',
          minHeight: '180px',
          cursor: reviewing ? 'default' : 'pointer',
        }}
      >
        {/* Front */}
        <div
          style={{
            position: flipped ? 'absolute' : 'relative',
            top: 0,
            left: 0,
            right: 0,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            background: 'rgba(255,255,255,0.03)',
            border: `0.5px solid ${primaryColor}25`,
            borderRadius: '16px',
            padding: '20px',
            minHeight: '180px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              marginBottom: '12px',
            }}
          >
            <span
              style={{
                fontSize: '9px',
                fontWeight: 700,
                color: primaryColor,
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
              }}
            >
              {saathi?.emoji} {saathi?.name ?? card.vertical_id}
            </span>
            <div style={{ display: 'flex', gap: '6px' }}>
              <span
                style={{
                  fontSize: '9px',
                  padding: '2px 7px',
                  borderRadius: '20px',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.3)',
                }}
              >
                Rep {card.repetitions}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(card.id)
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'rgba(255,255,255,0.2)',
                  cursor: 'pointer',
                  fontSize: '12px',
                  padding: '0',
                  lineHeight: 1,
                }}
                title="Delete flashcard"
              >
                ×
              </button>
            </div>
          </div>
          <p
            style={{
              fontSize: '15px',
              color: '#fff',
              lineHeight: 1.6,
              flex: 1,
              margin: 0,
            }}
          >
            {card.front || '(empty front)'}
          </p>
          <p
            style={{
              fontSize: '10px',
              color: 'rgba(255,255,255,0.2)',
              marginTop: '12px',
              margin: '12px 0 0',
            }}
          >
            Tap to reveal →
          </p>
        </div>

        {/* Back */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            backfaceVisibility: 'hidden',
            WebkitBackfaceVisibility: 'hidden',
            transform: 'rotateY(180deg)',
            background: `${primaryColor}08`,
            border: `0.5px solid ${primaryColor}40`,
            borderRadius: '16px',
            padding: '20px',
            minHeight: '180px',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <p
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: primaryColor,
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              marginBottom: '12px',
            }}
          >
            Answer
          </p>
          <p
            style={{
              fontSize: '14px',
              color: 'rgba(255,255,255,0.85)',
              lineHeight: 1.65,
              flex: 1,
              margin: '0 0 16px',
              whiteSpace: 'pre-wrap',
            }}
          >
            {card.back}
          </p>

          {/* SM-2 review buttons */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ display: 'flex', gap: '8px' }}
          >
            <button
              onClick={() => void handleReview(0)}
              disabled={reviewing}
              style={{
                flex: 1,
                padding: '8px 6px',
                borderRadius: '8px',
                background: 'rgba(239,68,68,0.12)',
                border: '0.5px solid rgba(239,68,68,0.3)',
                color: '#FCA5A5',
                fontSize: '11px',
                fontWeight: 700,
                cursor: reviewing ? 'wait' : 'pointer',
              }}
            >
              😅 Forgot
            </button>
            <button
              onClick={() => void handleReview(3)}
              disabled={reviewing}
              style={{
                flex: 1,
                padding: '8px 6px',
                borderRadius: '8px',
                background: 'rgba(245,158,11,0.12)',
                border: '0.5px solid rgba(245,158,11,0.3)',
                color: '#FCD34D',
                fontSize: '11px',
                fontWeight: 700,
                cursor: reviewing ? 'wait' : 'pointer',
              }}
            >
              🤔 Hard
            </button>
            <button
              onClick={() => void handleReview(5)}
              disabled={reviewing}
              style={{
                flex: 1,
                padding: '8px 6px',
                borderRadius: '8px',
                background: 'rgba(34,197,94,0.12)',
                border: '0.5px solid rgba(34,197,94,0.3)',
                color: '#4ADE80',
                fontSize: '11px',
                fontWeight: 700,
                cursor: reviewing ? 'wait' : 'pointer',
              }}
            >
              ✅ Got it!
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export function FlashcardsClient({ saathiId }: Props) {
  const [cards, setCards] = useState<Flashcard[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'due' | 'all'>('due')

  const saathi = SAATHIS.find((s) => s.id === saathiId) ?? SAATHIS[0]
  const primaryColor = saathi.primary

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data } = await supabase
      .from('flashcards')
      .select('*')
      .order('created_at', { ascending: false })
    setCards((data as Flashcard[]) ?? [])
    setLoading(false)
  }, [])

  useEffect(() => {
    async function run() {
      await load()
    }
    void run()
  }, [load])

  const handleReview = useCallback(
    async (id: string, quality: 0 | 3 | 5) => {
      const card = cards.find((c) => c.id === id)
      if (!card) return
      const updates = sm2(card, quality)
      const supabase = createClient()
      await supabase
        .from('flashcards')
        .update({
          ...updates,
          last_reviewed_at: new Date().toISOString(),
        })
        .eq('id', id)
      setCards((prev) =>
        prev.map((c) => (c.id === id ? { ...c, ...updates } : c))
      )
    },
    [cards]
  )

  const handleDelete = useCallback((id: string) => {
    const supabase = createClient()
    void supabase.from('flashcards').delete().eq('id', id)
    setCards((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const today = todayIST()
  const dueCards = cards.filter((c) => c.next_review_date <= today)
  const displayCards = tab === 'due' ? dueCards : cards

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#060F1D',
        color: '#fff',
        paddingBottom: '80px',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '20px 20px 0',
          background: '#060F1D',
          borderBottom: '0.5px solid rgba(255,255,255,0.07)',
          paddingBottom: '0',
        }}
      >
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              marginBottom: '16px',
            }}
          >
            <Link
              href="/chat"
              style={{
                color: 'rgba(255,255,255,0.35)',
                textDecoration: 'none',
                fontSize: '13px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
              }}
            >
              ← Chat
            </Link>
            <div style={{ flex: 1 }}>
              <h1
                style={{
                  fontSize: '22px',
                  fontFamily: 'var(--font-playfair)',
                  color: '#fff',
                  margin: 0,
                }}
              >
                My <span style={{ color: primaryColor }}>Flashcards</span>
              </h1>
            </div>
          </div>

          {/* Stats row */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
            <div style={{ textAlign: 'center' }}>
              <p
                style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  color: primaryColor,
                  margin: 0,
                }}
              >
                {cards.length}
              </p>
              <p
                style={{
                  fontSize: '10px',
                  color: 'rgba(255,255,255,0.35)',
                  margin: 0,
                }}
              >
                Total
              </p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p
                style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  color: '#F59E0B',
                  margin: 0,
                }}
              >
                {dueCards.length}
              </p>
              <p
                style={{
                  fontSize: '10px',
                  color: 'rgba(255,255,255,0.35)',
                  margin: 0,
                }}
              >
                Due today
              </p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <p
                style={{
                  fontSize: '20px',
                  fontWeight: 700,
                  color: '#4ADE80',
                  margin: 0,
                }}
              >
                {cards.filter((c) => c.repetitions >= 3).length}
              </p>
              <p
                style={{
                  fontSize: '10px',
                  color: 'rgba(255,255,255,0.35)',
                  margin: 0,
                }}
              >
                Mastered
              </p>
            </div>
          </div>

          {/* Tab bar */}
          <div style={{ display: 'flex', gap: '0', borderBottom: 'none' }}>
            {(['due', 'all'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                style={{
                  padding: '8px 16px',
                  background: 'none',
                  border: 'none',
                  borderBottom:
                    tab === t
                      ? `2px solid ${primaryColor}`
                      : '2px solid transparent',
                  color: tab === t ? primaryColor : 'rgba(255,255,255,0.35)',
                  fontSize: '13px',
                  fontWeight: tab === t ? 700 : 400,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                {t === 'due'
                  ? `Due (${dueCards.length})`
                  : `All (${cards.length})`}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
        {loading ? (
          <div
            style={{
              display: 'flex',
              justifyContent: 'center',
              paddingTop: '60px',
            }}
          >
            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                border: `2px solid ${primaryColor}30`,
                borderTop: `2px solid ${primaryColor}`,
                animation: 'spin 0.8s linear infinite',
              }}
            />
          </div>
        ) : displayCards.length === 0 ? (
          <div style={{ textAlign: 'center', paddingTop: '60px' }}>
            <p style={{ fontSize: '40px', marginBottom: '12px' }}>
              {tab === 'due' ? '🎉' : '🃏'}
            </p>
            <p
              style={{
                fontSize: '16px',
                color: 'rgba(255,255,255,0.6)',
                marginBottom: '8px',
              }}
            >
              {tab === 'due' ? "You're all caught up!" : 'No flashcards yet'}
            </p>
            <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.3)' }}>
              {tab === 'due'
                ? 'Come back tomorrow for more reviews.'
                : 'Hover over any bot message in chat and tap 🃏 to save a flashcard.'}
            </p>
            {tab === 'due' && cards.length > 0 && (
              <button
                onClick={() => setTab('all')}
                style={{
                  marginTop: '16px',
                  padding: '10px 20px',
                  borderRadius: '10px',
                  background: `${primaryColor}20`,
                  border: `0.5px solid ${primaryColor}40`,
                  color: primaryColor,
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Browse all cards
              </button>
            )}
          </div>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
              gap: '14px',
            }}
          >
            <AnimatePresence mode="popLayout">
              {displayCards.map((card) => (
                <motion.div
                  key={card.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                >
                  <FlipCard
                    card={card}
                    primaryColor={primaryColor}
                    onReview={handleReview}
                    onDelete={handleDelete}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  )
}
