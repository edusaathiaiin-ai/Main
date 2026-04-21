'use client'

import Link from 'next/link'
import type { Saathi } from '@/types'

type Props = {
  activeSaathi: Saathi
  onAskQuestion: () => void
  canPost: boolean
  quotaReached?: boolean
  boardQuota?: {
    allowed: boolean
    used: number
    limit: number
    remaining: number
  } | null
}

// Top contributors: placeholder until we have real aggregation query
const TOP_FACULTY = [
  { name: 'Prof. Ramesh Iyer', badge: '👨‍🏫', verified: true },
  { name: 'Dr. Sunita Mehra', badge: '👩‍🏫', verified: true },
  { name: 'Mr. Aditya Shah', badge: '👨‍🎓', verified: false },
]

// Saathi-specific trending topics — shown in the sidebar
const SAATHI_TOPICS: Record<string, string[]> = {
  // Original 20
  kanoonsaathi:      ['Constitutional Law', 'IPC 302', 'Bail Reform', 'UPSC Prep', 'Section 498A'],
  maathsaathi:       ['Calculus', 'Matrices', 'Integration', 'Probability', 'UPSC Maths'],
  chemsaathi:        ['Organic Reactions', 'Periodic Table', 'Mole Concept', 'Thermodynamics', 'NEET Chem'],
  biosaathi:         ['Cell Biology', 'Genetics', 'Ecology', 'Human Physiology', 'NEET Bio'],
  pharmasaathi:      ['Pharmacokinetics', 'Drug Interactions', 'Dosage Forms', 'Clinical Pharmacy', 'Drug Safety'],
  medicosaathi:      ['Anatomy', 'Clinical Skills', 'Differential Diagnosis', 'MBBS Prep', 'Medical Ethics'],
  nursingsaathi:     ['Patient Care', 'Drug Administration', 'Nursing Ethics', 'ICU Protocols', 'Clinical Practice'],
  psychsaathi:       ['Cognitive Therapy', 'Mental Health', 'Counselling', 'DSM Disorders', 'Psychological Testing'],
  mechsaathi:        ['Thermodynamics', 'Fluid Mechanics', 'Machine Design', 'GATE Prep', 'CAD Tools'],
  civilsaathi:       ['Structural Analysis', 'Concrete Design', 'Soil Mechanics', 'GATE Civil', 'AutoCAD'],
  elecsaathi:        ['Circuit Theory', 'Digital Electronics', 'Power Systems', 'GATE ECE', 'Microcontrollers'],
  compsaathi:        ['Data Structures', 'Algorithms', 'DBMS', 'System Design', 'GATE CS'],
  envirosaathi:      ['Climate Change', 'Environmental Law', 'Sustainability', 'Pollution Control', 'EIA'],
  bizsaathi:         ['Business Strategy', 'Marketing Mix', 'HRM', 'MBA Prep', 'Case Studies'],
  finsaathi:         ['Financial Ratios', 'Valuation', 'CA Prep', 'Equity Analysis', 'Taxation'],
  mktsaathi:         ['Brand Strategy', 'Consumer Behaviour', 'Digital Marketing', 'SEO', 'Market Research'],
  hrsaathi:          ['Talent Acquisition', 'Labour Law', 'Performance Mgmt', 'HR Analytics', 'Org Behaviour'],
  archsaathi:        ['Design Theory', 'Building Materials', 'Urban Planning', 'AutoCAD', 'NATA Prep'],
  historysaathi:     ['Ancient India', 'Freedom Movement', 'Medieval India', 'UPSC History', 'Art & Culture'],
  econsaathi:        ['Macro Economics', 'Indian Economy', 'RBI Policy', 'UPSC Eco', 'International Trade'],
  // New 10
  accountsaathi:     ['Financial Statements', 'GST', 'Tally', 'CA Foundation', 'Cost Accounting'],
  aerospacesaathi:   ['Fluid Dynamics', 'Propulsion', 'ISRO Prep', 'Aircraft Design', 'Orbital Mechanics'],
  agrisaathi:        ['Soil Science', 'Crop Management', 'ICAR Prep', 'Irrigation', 'Agri Policy'],
  biotechsaathi:     ['Genetic Engineering', 'Fermentation', 'GATE BT', 'Bioinformatics', 'Cell Culture'],
  'chemengg-saathi': ['Mass Transfer', 'Reaction Engineering', 'GATE CH', 'Process Design', 'Fluid Mechanics'],
  electronicssaathi: ['Analog Circuits', 'VLSI Design', 'Signal Processing', 'GATE EC', 'Embedded Systems'],
  geosaathi:         ['Plate Tectonics', 'Geomorphology', 'Remote Sensing', 'UPSC Geography', 'Cartography'],
  physicsaathi:      ['Quantum Mechanics', 'Electromagnetism', 'Thermodynamics', 'GATE PH', 'JEE Physics'],
  polscisaathi:      ['Indian Constitution', 'IR Theory', 'Public Policy', 'UPSC Polity', 'Comparative Politics'],
  statssaathi:       ['Probability', 'Regression', 'Hypothesis Testing', 'GATE ST', 'Data Analysis'],
}

const DEFAULT_TOPICS = ['Concepts', 'Exam Prep', 'Case Studies', 'UPSC', 'Research']

export function BoardSidebar({
  activeSaathi,
  onAskQuestion,
  canPost,
  quotaReached = false,
  boardQuota,
}: Props) {
  return (
    <aside className="hidden w-[300px] shrink-0 flex-col gap-4 lg:flex">
      {/* Ask button */}
      <div>
        {canPost && !quotaReached ? (
          <button
            onClick={onAskQuestion}
            className="w-full rounded-2xl py-3.5 text-base font-bold transition-all duration-200"
            style={{ background: '#C9993A', color: '#060F1D' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#E5B86A')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#C9993A')}
          >
            ✦ Ask a Question
          </button>
        ) : quotaReached ? (
          <div>
            <button
              className="w-full cursor-not-allowed rounded-2xl py-3.5 text-base font-bold opacity-50"
              style={{ background: '#C9993A', color: '#060F1D' }}
            >
              ✦ Ask a Question
            </button>
            <div
              style={{
                marginTop: '10px',
                padding: '10px 14px',
                background: 'rgba(201,153,58,0.08)',
                border: '0.5px solid rgba(201,153,58,0.25)',
                borderRadius: '10px',
                fontSize: '11px',
                color: 'var(--text-secondary)',
                textAlign: 'center',
                lineHeight: 1.5,
              }}
            >
              Daily limit reached ·{' '}
              <Link
                href="/pricing"
                style={{ color: '#B8860B', fontWeight: '600' }}
              >
                Upgrade →
              </Link>
            </div>
          </div>
        ) : (
          <div className="group relative w-full">
            <button
              className="w-full cursor-not-allowed rounded-2xl py-3.5 text-base font-bold opacity-50"
              style={{ background: '#C9993A', color: '#060F1D' }}
            >
              ✦ Ask a Question
            </button>
            <div
              className="pointer-events-none absolute -top-12 left-1/2 z-10 w-56 -translate-x-1/2 rounded-xl px-3 py-2 text-center text-xs opacity-0 transition-opacity group-hover:opacity-100"
              style={{
                background: '#1A1814',
                border: '0.5px solid var(--border-medium)',
                color: 'var(--text-primary)',
              }}
            >
              Board posting available for Indian students
            </div>
          </div>
        )}

        {/* Quota indicator */}
        {boardQuota && canPost && (
          <div
            style={{
              fontSize: '11px',
              color: 'var(--text-tertiary)',
              textAlign: 'center',
              marginTop: '8px',
            }}
          >
            {boardQuota.allowed ? (
              boardQuota.limit < 999 && (
                <span>
                  {boardQuota.remaining} question
                  {boardQuota.remaining === 1 ? '' : 's'} left today
                </span>
              )
            ) : (
              <span style={{ color: '#C2410C' }}>
                Daily limit reached · Resets at midnight IST
              </span>
            )}
          </div>
        )}
      </div>

      {/* Active Saathi card */}
      <div
        className="rounded-2xl p-4"
        style={{
          background: `${activeSaathi.primary}12`,
          border: `0.5px solid ${activeSaathi.primary}33`,
        }}
      >
        <div className="mb-2 flex items-center gap-3">
          <span className="text-2xl">{activeSaathi.emoji}</span>
          <div>
            <p
              className="text-sm font-bold"
              style={{ color: 'var(--text-primary)' }}
            >
              {activeSaathi.name}
            </p>
            <p
              className="text-[10px]"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {activeSaathi.tagline}
            </p>
          </div>
        </div>
        <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
          Questions in this community are answered by AI and reviewed by
          faculty.
        </p>
      </div>

      {/* Top contributors */}
      <div
        className="rounded-2xl p-4"
        style={{
          background: 'var(--bg-elevated)',
          border: '0.5px solid var(--border-subtle)',
        }}
      >
        <p
          className="mb-3 text-xs font-semibold tracking-wider uppercase"
          style={{ color: 'var(--text-tertiary)' }}
        >
          Top Contributors
        </p>
        <div className="space-y-2.5">
          {TOP_FACULTY.map((f, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full text-xs"
                style={{
                  background: 'rgba(22,163,74,0.12)',
                  border: '0.5px solid rgba(22,163,74,0.3)',
                }}
              >
                {f.badge}
              </div>
              <div className="flex-1">
                <p
                  className="text-xs font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  {f.name}
                </p>
              </div>
              {f.verified && (
                <span
                  className="rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                  style={{
                    background: 'rgba(22,163,74,0.12)',
                    border: '0.5px solid rgba(22,163,74,0.35)',
                    color: '#15803D',
                  }}
                >
                  ✓
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Trending topics */}
      <div
        className="rounded-2xl p-4"
        style={{
          background: 'var(--bg-elevated)',
          border: '0.5px solid var(--border-subtle)',
        }}
      >
        <p
          className="mb-3 text-xs font-semibold tracking-wider uppercase"
          style={{ color: 'var(--text-tertiary)' }}
        >
          Trending Topics
        </p>
        <div className="flex flex-wrap gap-2">
          {(SAATHI_TOPICS[activeSaathi.id] ?? DEFAULT_TOPICS).map((topic) => (
            <span
              key={topic}
              className="rounded-full px-2.5 py-1 text-[10px] font-medium"
              style={{
                background: `${activeSaathi.primary}18`,
                border: `0.5px solid ${activeSaathi.primary}40`,
                color: 'var(--text-secondary)',
              }}
            >
              {topic}
            </span>
          ))}
        </div>
      </div>
    </aside>
  )
}
