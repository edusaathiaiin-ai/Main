'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { SAATHIS } from '@/constants/saathis'
import type { SaathiWithDescription } from '@/constants/saathis'

const SPRING = { type: 'spring', stiffness: 280, damping: 24 } as const

type WelcomeOverlayProps = {
  saathi: SaathiWithDescription
  displayName: string
  academicLevel: string
  onBegin: () => void
}

function WelcomeOverlay({
  saathi,
  displayName,
  academicLevel,
  onBegin,
}: WelcomeOverlayProps) {
  const firstName = displayName.split(' ')[0] ?? displayName

  const academicLabel: Record<string, string> = {
    bachelor: 'an undergraduate student',
    masters: 'a postgraduate student',
    phd: 'a doctoral researcher',
    diploma: 'a diploma student',
    competitive: 'preparing for competitive exams',
    professional: 'a working professional',
    postdoc: 'a postdoctoral researcher',
    professional_learner: 'a lifelong learner',
    exploring: 'exploring your path',
  }

  return (
    <motion.div
      key="welcome"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background:
          'linear-gradient(180deg, #060F1D 0%, #0B1F3A 50%, #060F1D 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        textAlign: 'center',
      }}
    >
      {/* Ambient glow */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
          background: `radial-gradient(ellipse 60% 50% at 50% 30%, ${saathi.primary}20, transparent 70%)`,
        }}
      />

      <div
        style={{
          position: 'relative',
          zIndex: 10,
          maxWidth: '560px',
          width: '100%',
        }}
      >
        {/* Emoji */}
        <motion.div
          initial={{ scale: 0.5, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ ...SPRING, delay: 0.15 }}
          style={{ fontSize: '64px', marginBottom: '20px', lineHeight: 1 }}
        >
          {saathi.emoji}
        </motion.div>

        {/* Saathi name */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3, duration: 0.35 }}
          style={{
            fontFamily: 'var(--font-playfair, "Playfair Display", serif)',
            fontSize: '14px',
            fontWeight: 600,
            letterSpacing: '2px',
            textTransform: 'uppercase',
            color: saathi.accent,
            marginBottom: '24px',
          }}
        >
          {saathi.name}
        </motion.p>

        {/* Welcome message */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.45, duration: 0.4 }}
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '0.5px solid rgba(255,255,255,0.1)',
            borderRadius: '20px',
            padding: '32px',
            marginBottom: '32px',
            textAlign: 'left',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--font-playfair, "Playfair Display", serif)',
              fontSize: '22px',
              fontWeight: 700,
              color: '#fff',
              marginBottom: '20px',
              lineHeight: 1.3,
            }}
          >
            Welcome, {firstName}. 🙏
          </p>
          <p
            style={{
              fontSize: '15px',
              color: 'rgba(255,255,255,0.7)',
              lineHeight: 1.75,
              marginBottom: '14px',
            }}
          >
            I am <strong style={{ color: '#fff' }}>{saathi.name}</strong>, your{' '}
            <strong style={{ color: saathi.accent }}>
              {saathi.tagline.toLowerCase()}
            </strong>{' '}
            companion.
          </p>
          <p
            style={{
              fontSize: '15px',
              color: 'rgba(255,255,255,0.7)',
              lineHeight: 1.75,
              marginBottom: '14px',
            }}
          >
            I know you&apos;re{' '}
            {academicLabel[academicLevel] ?? 'on your learning journey'} — and
            I&apos;m here for exactly that path.
          </p>
          <p
            style={{
              fontSize: '15px',
              color: 'rgba(255,255,255,0.7)',
              lineHeight: 1.75,
              marginBottom: '14px',
            }}
          >
            Every session we have together, I&apos;ll remember. Every concept we
            explore, every challenge you face, every question you ask — it all
            stays with me.
          </p>
          <p
            style={{
              fontFamily: 'var(--font-playfair, "Playfair Display", serif)',
              fontSize: '16px',
              fontStyle: 'italic',
              color: 'rgba(255,255,255,0.85)',
              lineHeight: 1.6,
            }}
          >
            This isn&apos;t just a chat. This is the beginning of a Saathi
            relationship.
            <br />
            Shall we begin?
          </p>
        </motion.div>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.65, duration: 0.35 }}
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '12px',
            alignItems: 'center',
          }}
        >
          <button
            onClick={onBegin}
            style={{
              width: '100%',
              maxWidth: '360px',
              padding: '16px 32px',
              background: '#C9993A',
              color: '#060F1D',
              border: 'none',
              borderRadius: '12px',
              fontSize: '16px',
              fontWeight: 700,
              cursor: 'pointer',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.background =
                '#E5B86A'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.background =
                '#C9993A'
            }}
          >
            Yes, let&apos;s begin →
          </button>

          <Link
            href="/profile"
            style={{
              fontSize: '13px',
              color: 'rgba(255,255,255,0.4)',
              textDecoration: 'none',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLAnchorElement).style.color =
                'rgba(255,255,255,0.7)'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLAnchorElement).style.color =
                'rgba(255,255,255,0.4)'
            }}
          >
            Tell me more about you first
          </Link>
        </motion.div>
      </div>
    </motion.div>
  )
}

// ─── Main export ──────────────────────────────────────────────────────────────

type ChatWelcomeGateProps = {
  userId: string
  profileName: string
  saathiId: string | null
  academicLevel: string
  sessionCount: number
  userRole?: string | null
  children: React.ReactNode
}

export function ChatWelcomeGate({
  userId,
  profileName,
  saathiId,
  academicLevel,
  sessionCount,
  userRole,
  children,
}: ChatWelcomeGateProps) {
  const [showWelcome, setShowWelcome] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [saathi, setSaathi] = useState<SaathiWithDescription | null>(null)

  useEffect(() => {
    function run() {
      // Faculty, institution, and public users never see the student welcome.
      // Copy is student-specific ("undergraduate student" etc.) and the
      // overlay would misrepresent the relationship.
      if (userRole && userRole !== 'student') return

      // Only show for first-ever session (session_count === 0)
      if (sessionCount > 0) return

      // Find saathi from constants
      const found = SAATHIS.find((s) => s.id === saathiId) ?? SAATHIS[0]
      setSaathi(found)

      // Check if welcome was already shown (client-side guard using localStorage as fallback)
      const key = `edusaathiai.welcomed.${userId}`
      if (localStorage.getItem(key)) return

      setShowWelcome(true)
    }
    run()
  }, [userId, saathiId, sessionCount, userRole])

  const handleBegin = async () => {
    // Mark as welcomed in localStorage immediately (fast path)
    localStorage.setItem(`edusaathiai.welcomed.${userId}`, '1')

    setDismissed(true)
    setShowWelcome(false)

    // Fire-and-forget: mark soul as welcomed in DB
    try {
      const supabase = createClient()
      await supabase
        .from('student_soul')
        .update({ first_session_welcomed: true })
        .eq('user_id', userId)
        .eq('vertical_id', saathiId ?? '')
    } catch {
      // Non-critical — localStorage guard is sufficient
    }
  }

  return (
    <>
      <AnimatePresence>
        {showWelcome && !dismissed && saathi && (
          <WelcomeOverlay
            saathi={saathi}
            displayName={profileName}
            academicLevel={academicLevel}
            onBegin={handleBegin}
          />
        )}
      </AnimatePresence>

      {/* Always render children — overlay sits above */}
      <motion.div
        animate={{ opacity: showWelcome && !dismissed ? 0.3 : 1 }}
        transition={{ duration: 0.3 }}
        style={{ width: '100%', height: '100%' }}
      >
        {children}
      </motion.div>
    </>
  )
}
