'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

// ── Data ─────────────────────────────────────────────────────────────────────

type RoleId = 'student' | 'faculty' | 'public' | 'institution';

type RoleContent = {
  heading: string;
  subheading: string;
  bullets: string[];
  cta: string;
  ctaLink: string;
  ctaColor: string;
  note: string;
};

const TABS: { id: RoleId; emoji: string; label: string }[] = [
  { id: 'student',     emoji: '🎓', label: 'Students'       },
  { id: 'faculty',     emoji: '👨‍🏫', label: 'Faculty'        },
  { id: 'public',      emoji: '🌐', label: 'General Public'  },
  { id: 'institution', emoji: '🏢', label: 'Institutions'    },
];

const ROLE_CONTENT: Record<RoleId, RoleContent> = {
  student: {
    heading: 'Your Saathi. Your subjects. Your soul.',
    subheading:
      'EdUsaathiAI is the only AI that remembers who you are — not just what you asked. Every session builds on the last.',
    bullets: [
      '24 specialist Saathis — Law, NEET, UPSC, CS, Finance, and more',
      'Soul memory across every session — no more re-explaining yourself',
      'Exam preparation + career discovery in the same platform',
    ],
    cta: 'Begin for free →',
    ctaLink: '/login?role=student',
    ctaColor: '#C9993A',
    note: 'First 500 students get 60 days free. No card.',
  },
  faculty: {
    heading: 'Your knowledge. India\'s students.',
    subheading:
      'EdUsaathiAI gives verified faculty a platform to reach students far beyond the walls of their classroom.',
    bullets: [
      'Answer student questions and earn your Faculty Verified ✓ badge',
      'Your expertise reaches students across India — not just your college',
      'Free Plus access during faculty beta programme',
    ],
    cta: 'Join as Faculty →',
    ctaLink: '/login?role=faculty',
    ctaColor: '#4ADE80',
    note: 'Faculty badge verified within 48 hours.',
  },
  public: {
    heading: 'Curious minds. No exam required.',
    subheading:
      'You don\'t need to be enrolled anywhere to learn something profound today. EdUsaathiAI welcomes everyone.',
    bullets: [
      'Explore any of 24 subjects — completely free, no enrollment needed',
      'Ask freely, read today\'s research headlines, join the community board',
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
};

// ── Component ─────────────────────────────────────────────────────────────────

export function FourJourneysSection() {
  const [active, setActive] = useState<RoleId>('student');
  const content = ROLE_CONTENT[active];

  return (
    <section
      id="for-everyone"
      style={{ padding: '100px 48px', maxWidth: '900px', margin: '0 auto' }}
    >
      {/* Eyebrow */}
      <div style={{ textAlign: 'center', marginBottom: '48px' }}>
        <p style={{
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
        }}>
          <span style={{ display: 'block', width: '24px', height: '1px', background: '#C9993A' }} />
          Built for every kind of learner
        </p>
        <h2 style={{
          fontFamily: '\'Playfair Display\', serif',
          fontSize: 'clamp(36px, 4vw, 56px)',
          fontWeight: '700',
          lineHeight: 1.1,
          letterSpacing: '-1px',
          margin: 0,
          color: '#fff',
        }}>
          One platform.{' '}
          <em style={{ color: '#C9993A', fontStyle: 'italic' }}>Four journeys.</em>
        </h2>
      </div>

      {/* Tab switcher */}
      <div style={{
        display: 'flex',
        background: 'rgba(255,255,255,0.04)',
        border: '0.5px solid rgba(255,255,255,0.08)',
        borderRadius: '14px',
        padding: '4px',
        marginBottom: '48px',
        gap: '4px',
        overflowX: 'auto',
      }}>
        {TABS.map((tab) => {
          const isActive = active === tab.id;
          const roleColor = ROLE_CONTENT[tab.id].ctaColor;
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
                fontFamily: '\'DM Sans\', sans-serif',
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
              <span role="img" aria-hidden="true">{tab.emoji}</span>
              <span className="tab-label">{tab.label}</span>
            </button>
          );
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
          <h3 style={{
            fontFamily: '\'Playfair Display\', serif',
            fontSize: 'clamp(24px, 3vw, 36px)',
            fontWeight: '700',
            margin: '0 0 12px',
            color: '#ffffff',
            lineHeight: 1.2,
          }}>
            {content.heading}
          </h3>

          <p style={{
            fontSize: '17px',
            fontWeight: '300',
            color: 'rgba(255,255,255,0.55)',
            lineHeight: 1.7,
            margin: '0 0 28px',
          }}>
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
                <span style={{
                  color: content.ctaColor,
                  fontWeight: '700',
                  fontSize: '14px',
                  flexShrink: 0,
                  marginTop: '2px',
                }}>
                  ✓
                </span>
                <span style={{
                  fontSize: '15px',
                  color: 'rgba(255,255,255,0.75)',
                  lineHeight: 1.6,
                }}>
                  {bullet}
                </span>
              </div>
            ))}
          </div>

          {/* CTA row */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '20px',
            flexWrap: 'wrap',
          }}>
            <Link
              href={content.ctaLink}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                background: content.ctaColor,
                color: '#0B1F3A',
                fontFamily: '\'DM Sans\', sans-serif',
                fontSize: '15px',
                fontWeight: '600',
                padding: '14px 32px',
                borderRadius: '10px',
                textDecoration: 'none',
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.88';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = `0 12px 40px ${content.ctaColor}44`;
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              {content.cta}
            </Link>

            <p style={{
              fontSize: '12px',
              color: 'rgba(255,255,255,0.3)',
              margin: 0,
            }}>
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
  );
}
