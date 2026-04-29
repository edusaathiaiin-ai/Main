'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import type { ReactNode } from 'react'

// ── Data ─────────────────────────────────────────────────────────────────────

type RoleId = 'student' | 'faculty' | 'public' | 'institution' | 'educational_institution'

type RoleContent = {
  heading: string
  subheading: string
  bullets: string[]
  cta: string
  ctaLink: string
  ctaColor: string
  ctaTextColor?: string          // optional override; defaults to navy #0B1F3A
  note: string
  spotlightCard?: ReactNode
  // Optional secondary call-to-action shown next to the primary CTA. Used
  // by the Educational Institution tab to surface "See pricing →" without
  // pulling the visitor off the journey.
  subCtaText?: string
  subCtaLink?: string
}

const TABS: { id: RoleId; emoji: string; label: string }[] = [
  { id: 'student',                emoji: '🎓',   label: 'Students' },
  { id: 'faculty',                emoji: '👨‍🏫', label: 'Faculty' },
  { id: 'public',                 emoji: '🌐',   label: 'General Public' },
  { id: 'institution',            emoji: '🏢',   label: 'Institutions' },
  { id: 'educational_institution', emoji: '🏫',  label: 'Educational Institution' },
]

const ROLE_CONTENT: Record<RoleId, RoleContent> = {
  student: {
    heading: 'Your Saathi. Your subjects. Your soul.',
    subheading:
      'EdUsaathiAI is the only AI that remembers who you are — not just what you asked. Every session builds on the last.',
    bullets: [
      '30 specialist Saathis — Law, NEET, UPSC, CS, Finance, and more',
      'Soul memory — your Saathi knows your name, semester, subjects, and dream',
      'Exam preparation + career discovery in the same platform',
      'Book live lectures from verified professors — pay per seat, learn live',
      'Request a lecture on any topic — professors read your profile and respond',
      '1:1 sessions with subject experts — doubt clearing, research guidance, deep dives',
      'Retired IISc, AIIMS, NLU professors — access otherwise impossible',
      'Declare what you want to learn — matching professors find YOU and build a session around it',
    ],
    cta: 'Begin for free →',
    ctaLink: '/login?role=student',
    ctaColor: '#C9993A',
    note: 'First 500 students get 60 days free. No card.',
    spotlightCard: (
      <div
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '0.5px solid rgba(255,255,255,0.12)',
          borderRadius: '12px',
          padding: '14px 16px',
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            marginBottom: '10px',
          }}
        >
          <span style={{ fontSize: '16px' }}>👨‍🏫</span>
          <p
            style={{
              fontSize: '12px',
              fontWeight: '700',
              color: 'rgba(255,255,255,0.8)',
              margin: 0,
            }}
          >
            Real professors. Real sessions.
          </p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {[
            {
              name: 'Prof. R.K. Krishnamurthy',
              detail: 'Constitutional Law · NLU · 38 years',
              price: '₹1,500',
              color: '#C9993A',
            },
            {
              name: 'Dr. Savitaben Desai',
              detail: 'Pharmacology · Gujarat Uni · 30 years',
              price: '₹1,000',
              color: '#4ADE80',
            },
          ].map((prof, i) => (
            <div
              key={i}
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 10px',
                background: 'rgba(255,255,255,0.03)',
                border: '0.5px solid rgba(255,255,255,0.08)',
                borderRadius: '8px',
              }}
            >
              <div>
                <p
                  style={{
                    fontSize: '12px',
                    fontWeight: '700',
                    color: '#fff',
                    margin: '0 0 1px',
                  }}
                >
                  {prof.name}
                </p>
                <p
                  style={{
                    fontSize: '10px',
                    color: 'rgba(255,255,255,0.35)',
                    margin: 0,
                  }}
                >
                  {prof.detail}
                </p>
              </div>
              <span
                style={{
                  fontSize: '11px',
                  fontWeight: '700',
                  color: prof.color,
                  whiteSpace: 'nowrap',
                  marginLeft: '8px',
                }}
              >
                {prof.price}
              </span>
            </div>
          ))}
        </div>
        <p
          style={{
            fontSize: '10px',
            color: 'rgba(255,255,255,0.3)',
            margin: '10px 0 0',
            lineHeight: 1.5,
          }}
        >
          ✦ Professors read your soul profile before every session. They know
          your semester, subjects, and struggles. Not a YouTube video. A real
          expert who prepared for YOU.
        </p>
      </div>
    ),
  },
  faculty: {
    heading: "Your knowledge. India's students.",
    subheading:
      'EdUsaathiAI gives verified faculty a platform to teach, earn, and reach students far beyond their classroom walls.',
    bullets: [
      'Set your own fee — students pay what you decide',
      'Announce lectures — students book seats and pay upfront',
      'Teach a series of 3–5 lectures, earn per session completed',
      "Your knowledge doesn't retire when you do — reach students across India",
      'Post research intern opportunities — find motivated students directly',
      'Answer student questions on the Board — your verified badge builds your reputation',
      'Faculty Verified ✓ badge on every answer',
      'AI tools — question paper generator, study material creator, analytics',
      'Retired? Our Emeritus programme welcomes you back to the classroom',
    ],
    cta: 'Join as Faculty — Start Earning →',
    ctaLink: '/teach',
    ctaColor: '#C9993A',
    ctaTextColor: '#060F1D',
    note: "We review every application personally. You'll hear from us within 48 hours.",
    spotlightCard: (
      <div
        style={{
          background: 'rgba(201,153,58,0.1)',
          border: '0.5px solid rgba(201,153,58,0.35)',
          borderRadius: '12px',
          padding: '12px 16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <span style={{ fontSize: '24px' }}>💰</span>
        <div>
          <p
            style={{
              fontSize: '13px',
              fontWeight: '700',
              color: '#C9993A',
              margin: '0 0 2px',
            }}
          >
            Faculty earning potential
          </p>
          <p
            style={{
              fontSize: '12px',
              color: 'rgba(255,255,255,0.55)',
              margin: 0,
              lineHeight: 1.5,
            }}
          >
            5 sessions/month at ₹1,500 =
            <strong style={{ color: '#fff' }}> ₹6,000/month</strong> · 30-seat
            lecture at ₹1,000 =
            <strong style={{ color: '#fff' }}> ₹24,000 in one evening</strong>
          </p>
        </div>
      </div>
    ),
  },
  public: {
    heading: 'Curious minds. No exam required.',
    subheading:
      "You don't need to be enrolled anywhere to learn something profound today. EdUsaathiAI welcomes everyone.",
    bullets: [
      'Explore any of 30 subjects — completely free, no enrollment needed',
      "Ask freely, read today's research headlines, join the community board",
      'No syllabus pressure. No deadlines. Just curiosity.',
    ],
    cta: 'Start exploring →',
    ctaLink: '/login?role=public',
    ctaColor: '#FB923C',
    note: 'Free access to Bot 1 + Bot 5 across all Saathis.',
  },
  institution: {
    heading: 'Find the talent before everyone else.',
    subheading:
      'EdUsaathiAI gives institutions direct access to motivated, self-driven students — filtered by subject, passion, and academic stage.',
    bullets: [
      'Post internships directly to relevant Saathi communities — no agents, no fees',
      'Soul-matched applicants — see student passion level, career interest, subject depth',
      'Students apply with their soul profile — no CVs, no gatekeeping',
    ],
    cta: 'Register your institution →',
    ctaLink: '/login?role=institution',
    ctaColor: '#A78BFA',
    note: 'Verified by our team within 48 hours.',
  },
  educational_institution: {
    heading: "Your faculty's knowledge deserves better tools.",
    subheading:
      'EdUsaathiAI gives every professor in your institution a research-grade interactive classroom — without requiring them to be technologists. Their knowledge stays at the centre. The platform carries everything else.',
    bullets: [
      'Interactive classroom for all 30 subjects',
      'AI Teaching Assistant — faculty speaks, tools appear',
      'Permanent Research Archive for every student session',
      'Principal dashboard + one-click NAAC report',
      '3 hours/day classroom window included (weekdays)',
    ],
    cta: 'Start Free Trial →',
    ctaLink: '/education-institutions',
    ctaColor: '#38BDF8',
    ctaTextColor: '#0B1F3A',
    note: 'Personal call from Jaydeep within 48 hours. No credit card.',
    subCtaText: 'See pricing →',
    subCtaLink: '/education-institutions#pricing',
  },
}

// ── Component ─────────────────────────────────────────────────────────────────

export function FourJourneysSection() {
  const [active, setActive] = useState<RoleId>('student')
  const content = ROLE_CONTENT[active]

  return (
    <section
      id="for-everyone"
      style={{ padding: '100px 48px', maxWidth: '900px', margin: '0 auto' }}
    >
      {/* Eyebrow */}
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <p
          style={{
            fontSize: '11px',
            fontWeight: '600',
            letterSpacing: '2px',
            textTransform: 'uppercase',
            color: '#C9993A',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
          }}
        >
          <span
            style={{
              display: 'block',
              width: '24px',
              height: '1px',
              background: '#C9993A',
            }}
          />
          Built for every kind of learner
        </p>
        <h2
          style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 'clamp(36px, 4vw, 56px)',
            fontWeight: '700',
            lineHeight: 1.1,
            letterSpacing: '-1px',
            margin: 0,
            color: '#fff',
          }}
        >
          One platform.{' '}
          <em style={{ color: '#C9993A', fontStyle: 'italic' }}>
            Four journeys.
          </em>
        </h2>
      </div>

      {/* Tab switcher */}
      <div
        style={{
          display: 'flex',
          background: 'rgba(255,255,255,0.04)',
          border: '0.5px solid rgba(255,255,255,0.08)',
          borderRadius: '14px',
          padding: '4px',
          marginBottom: '48px',
          gap: '4px',
          overflowX: 'auto',
        }}
      >
        {TABS.map((tab) => {
          const isActive = active === tab.id
          const roleColor = ROLE_CONTENT[tab.id].ctaColor
          return (
            <button
              key={tab.id}
              onClick={() => setActive(tab.id)}
              style={{
                flex: '1 1 0',
                minWidth: '80px',
                padding: '10px 14px',
                borderRadius: '10px',
                border: 'none',
                cursor: 'pointer',
                fontSize: '13px',
                fontWeight: isActive ? '600' : '400',
                fontFamily: "'DM Sans', sans-serif",
                background: isActive ? '#ffffff' : 'transparent',
                color: isActive ? '#0B1F3A' : 'rgba(255,255,255,0.45)',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                whiteSpace: 'nowrap',
                outline: isActive ? `2px solid ${roleColor}22` : 'none',
                outlineOffset: '-2px',
              }}
            >
              <span role="img" aria-hidden="true">
                {tab.emoji}
              </span>
              <span className="tab-label">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Animated content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={active}
          initial={{ opacity: 0, x: -16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 16 }}
          transition={{ duration: 0.22, ease: 'easeOut' }}
          style={{ maxWidth: '680px', margin: '0 auto' }}
        >
          <h3
            style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 'clamp(24px, 3vw, 36px)',
              fontWeight: '700',
              margin: '0 0 12px',
              color: '#ffffff',
              lineHeight: 1.2,
            }}
          >
            {content.heading}
          </h3>

          <p
            style={{
              fontSize: '17px',
              fontWeight: '300',
              color: 'rgba(255,255,255,0.55)',
              lineHeight: 1.7,
              margin: '0 0 28px',
            }}
          >
            {content.subheading}
          </p>

          {/* Bullets */}
          <div style={{ marginBottom: '36px' }}>
            {content.bullets.map((bullet, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  marginBottom: '14px',
                }}
              >
                <span
                  style={{
                    color: content.ctaColor,
                    fontWeight: '700',
                    fontSize: '14px',
                    flexShrink: 0,
                    marginTop: '2px',
                  }}
                >
                  ✓
                </span>
                <span
                  style={{
                    fontSize: '15px',
                    color: 'rgba(255,255,255,0.75)',
                    lineHeight: 1.6,
                  }}
                >
                  {bullet}
                </span>
              </div>
            ))}
          </div>

          {/* Earning spotlight (faculty only) */}
          {content.spotlightCard}

          {/* CTA row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              flexWrap: 'wrap',
            }}
          >
            <Link
              href={content.ctaLink}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: content.ctaColor,
                color: content.ctaTextColor ?? '#0B1F3A',
                fontFamily: "'DM Sans', sans-serif",
                fontSize: '15px',
                fontWeight: '600',
                padding: '14px 32px',
                borderRadius: '10px',
                textDecoration: 'none',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.88'
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = `0 12px 40px ${content.ctaColor}44`
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              {content.cta}
            </Link>

            {content.subCtaLink && content.subCtaText && (
              <Link
                href={content.subCtaLink}
                style={{
                  fontSize: '13px',
                  fontWeight: 500,
                  color: '#C9993A',
                  textDecoration: 'underline',
                  textUnderlineOffset: '3px',
                }}
              >
                {content.subCtaText}
              </Link>
            )}

            <p
              style={{
                fontSize: '12px',
                color: 'rgba(255,255,255,0.3)',
                margin: 0,
              }}
            >
              {content.note}
            </p>
          </div>
        </motion.div>
      </AnimatePresence>

      {/* Mobile styles */}
      <style>{`
        @media (max-width: 640px) {
          .tab-label { display: none; }
        }
      `}</style>
    </section>
  )
}
