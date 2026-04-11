'use client'

import { useEffect, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

type Challenge = {
  id: string
  question: string
  options: string[]
  correct_option: number
  explanation: string
  topic: string
  difficulty: string
}

type Attempt = {
  selected_option: number
  is_correct: boolean
  streak_count: number
}

type Props = {
  saathiId: string
  primaryColor?: string
}

const DIFFICULTY_COLOR: Record<string, string> = {
  easy: '#22C55E',
  medium: '#F59E0B',
  hard: '#EF4444',
}

export function DailyChallengeWidget({
  saathiId,
  primaryColor = '#C9993A',
}: Props) {
  const [open, setOpen] = useState(false)
  const [challenge, setChallenge] = useState<Challenge | null>(null)
  const [attempt, setAttempt] = useState<Attempt | null>(null)
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<number | null>(null)
  const [result, setResult] = useState<{
    is_correct: boolean
    correct_option: number
    explanation: string
    streak: number
  } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { data, error } = await supabase.functions.invoke(
        'daily-challenge',
        {
          method: 'GET',
          headers: { 'x-query': `saathi_id=${saathiId}` },
        }
      )

      // functions.invoke doesn't support GET params natively — use fetch directly
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/daily-challenge?saathi_id=${saathiId}`,
        {
          headers: {
            Authorization: `Bearer ${session?.access_token ?? ''}`,
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
          },
        }
      )
      // Suppress unused variable warning from first invoke call
      void data
      void error

      if (!res.ok) return
      const payload = (await res.json()) as {
        challenge: Challenge
        attempt: Attempt | null
      }
      setChallenge(payload.challenge)
      setAttempt(payload.attempt)
      if (payload.attempt) {
        setSelected(payload.attempt.selected_option)
        setResult({
          is_correct: payload.attempt.is_correct,
          correct_option: payload.challenge.correct_option,
          explanation: payload.challenge.explanation,
          streak: payload.attempt.streak_count,
        })
      }
    } catch {
      // Silently fail — challenge is non-critical
    } finally {
      setLoading(false)
    }
  }, [saathiId])

  useEffect(() => {
    void load()
  }, [load])

  async function submitAnswer(optionIndex: number) {
    if (!challenge || submitting || selected !== null) return
    setSelected(optionIndex)
    setSubmitting(true)
    try {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/daily-challenge`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session?.access_token ?? ''}`,
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            challenge_id: challenge.id,
            selected_option: optionIndex,
          }),
        }
      )
      if (!res.ok) return
      const data = (await res.json()) as {
        is_correct: boolean
        correct_option: number
        explanation: string
        streak: number
      }
      setResult(data)
      setAttempt({
        selected_option: optionIndex,
        is_correct: data.is_correct,
        streak_count: data.streak,
      })
    } finally {
      setSubmitting(false)
    }
  }

  // Don't render if no challenge loaded or still loading
  if (loading || !challenge) return null

  const alreadyDone = !!attempt
  const streakCount = attempt?.streak_count ?? result?.streak ?? 0

  return (
    <>
      {/* Floating trigger button */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1.5, type: 'spring', stiffness: 300 }}
        onClick={() => setOpen(true)}
        style={{
          position: 'fixed',
          bottom: '80px',
          right: '16px',
          zIndex: 40,
          background: alreadyDone
            ? 'linear-gradient(135deg, #22C55E22, #22C55E11)'
            : `linear-gradient(135deg, ${primaryColor}33, ${primaryColor}11)`,
          border: `0.5px solid ${alreadyDone ? '#22C55E55' : `${primaryColor}55`}`,
          borderRadius: '20px',
          padding: '8px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          cursor: 'pointer',
          backdropFilter: 'blur(12px)',
          boxShadow: `0 8px 24px ${alreadyDone ? '#22C55E20' : `${primaryColor}25`}`,
        }}
      >
        <span style={{ fontSize: '16px' }}>{alreadyDone ? '✅' : '🎯'}</span>
        <div style={{ textAlign: 'left' }}>
          <p
            style={{
              fontSize: '11px',
              fontWeight: 700,
              color: alreadyDone ? '#22C55E' : primaryColor,
              margin: 0,
              lineHeight: 1.2,
            }}
          >
            {alreadyDone ? 'Done!' : 'Daily Challenge'}
          </p>
          {streakCount > 0 && (
            <p
              style={{
                fontSize: '9px',
                color: 'rgba(255,255,255,0.4)',
                margin: 0,
              }}
            >
              🔥 {streakCount} day streak
            </p>
          )}
        </div>
      </motion.button>

      {/* Modal */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 50,
              background: 'rgba(0,0,0,0.7)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '16px',
            }}
          >
            <motion.div
              initial={{ scale: 0.92, y: 20, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.92, y: 20, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 300, damping: 28 }}
              onClick={(e) => e.stopPropagation()}
              style={{
                background: '#0B1F3A',
                border: `0.5px solid ${primaryColor}30`,
                borderRadius: '20px',
                padding: '24px',
                maxWidth: '480px',
                width: '100%',
                maxHeight: '80vh',
                overflowY: 'auto',
              }}
            >
              {/* Header */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: '20px',
                }}
              >
                <div
                  style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
                >
                  <span style={{ fontSize: '20px' }}>🎯</span>
                  <div>
                    <p
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: primaryColor,
                        margin: 0,
                      }}
                    >
                      Daily Challenge
                    </p>
                    <p
                      style={{
                        fontSize: '10px',
                        color: 'rgba(255,255,255,0.35)',
                        margin: 0,
                      }}
                    >
                      {new Date().toLocaleDateString('en-IN', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: 'rgba(255,255,255,0.65)',
                    cursor: 'pointer',
                    fontSize: '18px',
                    lineHeight: 1,
                  }}
                >
                  ×
                </button>
              </div>

              {/* Topic + difficulty chips */}
              <div
                style={{
                  display: 'flex',
                  gap: '8px',
                  marginBottom: '18px',
                  flexWrap: 'wrap',
                }}
              >
                {challenge.topic && (
                  <span
                    style={{
                      fontSize: '10px',
                      fontWeight: 600,
                      padding: '3px 10px',
                      borderRadius: '20px',
                      background: `${primaryColor}18`,
                      border: `0.5px solid ${primaryColor}40`,
                      color: primaryColor,
                    }}
                  >
                    {challenge.topic}
                  </span>
                )}
                <span
                  style={{
                    fontSize: '10px',
                    fontWeight: 600,
                    padding: '3px 10px',
                    borderRadius: '20px',
                    background: `${DIFFICULTY_COLOR[challenge.difficulty] ?? '#F59E0B'}15`,
                    border: `0.5px solid ${DIFFICULTY_COLOR[challenge.difficulty] ?? '#F59E0B'}40`,
                    color: DIFFICULTY_COLOR[challenge.difficulty] ?? '#F59E0B',
                  }}
                >
                  {challenge.difficulty}
                </span>
              </div>

              {/* Question */}
              <p
                style={{
                  fontSize: '15px',
                  color: '#fff',
                  lineHeight: 1.65,
                  marginBottom: '20px',
                  fontFamily: 'var(--font-dm-sans)',
                }}
              >
                {challenge.question}
              </p>

              {/* Options */}
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px',
                  marginBottom: '20px',
                }}
              >
                {(challenge.options as string[]).map((opt, i) => {
                  const isSelected = selected === i
                  const isCorrect = result ? i === result.correct_option : false
                  const isWrong = result && isSelected && !result.is_correct

                  let bg = 'rgba(255,255,255,0.04)'
                  let border = 'rgba(255,255,255,0.1)'
                  let color = 'rgba(255,255,255,0.75)'

                  if (result) {
                    if (isCorrect) {
                      bg = 'rgba(34,197,94,0.12)'
                      border = '#22C55E55'
                      color = '#4ADE80'
                    } else if (isWrong) {
                      bg = 'rgba(239,68,68,0.12)'
                      border = '#EF444455'
                      color = '#FCA5A5'
                    } else {
                      bg = 'rgba(255,255,255,0.02)'
                      color = 'rgba(255,255,255,0.65)'
                    }
                  } else if (isSelected) {
                    bg = `${primaryColor}18`
                    border = `${primaryColor}60`
                    color = primaryColor
                  }

                  return (
                    <motion.button
                      key={i}
                      onClick={() => void submitAnswer(i)}
                      disabled={!!result || submitting}
                      whileHover={!result ? { scale: 1.01 } : {}}
                      whileTap={!result ? { scale: 0.99 } : {}}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: '10px',
                        background: bg,
                        border: `0.5px solid ${border}`,
                        borderRadius: '12px',
                        padding: '12px 14px',
                        cursor: result ? 'default' : 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s',
                      }}
                    >
                      <span
                        style={{
                          width: '22px',
                          height: '22px',
                          borderRadius: '50%',
                          background:
                            result && isCorrect
                              ? '#22C55E'
                              : result && isWrong
                                ? '#EF4444'
                                : `${primaryColor}30`,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '11px',
                          fontWeight: 700,
                          color: result ? '#fff' : primaryColor,
                          flexShrink: 0,
                        }}
                      >
                        {result && isCorrect
                          ? '✓'
                          : result && isWrong
                            ? '✗'
                            : String.fromCharCode(65 + i)}
                      </span>
                      <span
                        style={{ fontSize: '14px', color, lineHeight: 1.5 }}
                      >
                        {opt}
                      </span>
                    </motion.button>
                  )
                })}
              </div>

              {/* Result */}
              <AnimatePresence>
                {result && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    style={{
                      background: result.is_correct
                        ? 'rgba(34,197,94,0.08)'
                        : 'rgba(239,68,68,0.08)',
                      border: `0.5px solid ${result.is_correct ? '#22C55E30' : '#EF444430'}`,
                      borderRadius: '12px',
                      padding: '14px 16px',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        marginBottom: '8px',
                      }}
                    >
                      <span style={{ fontSize: '18px' }}>
                        {result.is_correct ? '🎉' : '💡'}
                      </span>
                      <p
                        style={{
                          fontSize: '13px',
                          fontWeight: 700,
                          color: result.is_correct ? '#4ADE80' : '#FCA5A5',
                          margin: 0,
                        }}
                      >
                        {result.is_correct
                          ? 'Correct!'
                          : 'Not quite — but you learned!'}
                      </p>
                      {result.streak > 0 && (
                        <span
                          style={{
                            marginLeft: 'auto',
                            fontSize: '11px',
                            fontWeight: 700,
                            padding: '2px 8px',
                            borderRadius: '20px',
                            background: '#F59E0B20',
                            border: '0.5px solid #F59E0B40',
                            color: '#F59E0B',
                          }}
                        >
                          🔥 {result.streak} day{result.streak !== 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <p
                      style={{
                        fontSize: '13px',
                        color: 'rgba(255,255,255,0.65)',
                        lineHeight: 1.6,
                        margin: 0,
                      }}
                    >
                      {result.explanation}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
