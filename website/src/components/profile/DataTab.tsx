'use client'

import { useState } from 'react'
import { AnimatePresence } from 'framer-motion'
import DataDownloadButton from './DataDownloadButton'
import { DeleteAccountSection } from '@/components/settings/DeleteAccountSection'

interface DataTabProps {
  userId: string
  onEditProfile: () => void
}

const DATA_CATEGORIES = [
  { stored: true, label: 'Account info', detail: 'Name, email, city' },
  {
    stored: true,
    label: 'Academic profile',
    detail: 'Degree, institution, year',
  },
  {
    stored: true,
    label: 'Soul profile',
    detail: 'Topics, interests, tone, flame stage',
  },
  {
    stored: true,
    label: 'Chat messages',
    detail: 'Last 90 days of conversations',
  },
  {
    stored: true,
    label: 'Check-in results',
    detail: 'Quiz scores and timestamps',
  },
  {
    stored: true,
    label: 'Notes saved',
    detail: 'Exported notes from sessions',
  },
  {
    stored: true,
    label: 'Usage data',
    detail: 'Session counts, timestamps, quota info',
  },
  {
    stored: false,
    label: 'We NEVER store',
    detail:
      'Passwords, payment card data, biometrics, location tracking, browsing history outside our app',
  },
]

export default function DataTab({ userId, onEditProfile }: DataTabProps) {
  const [consentWithdrawn, setConsentWithdrawn] = useState(false)

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h3 className="font-display mb-1 text-2xl font-bold">
          Your data. Your rights.
        </h3>
        <p
          className="text-sm leading-relaxed"
          style={{ color: 'var(--text-tertiary)' }}
        >
          Under India&apos;s Digital Personal Data Protection Act 2023, you have
          full control over your personal data.
        </p>
      </div>

      {/* ── What we store ────────────────────────────────────────── */}
      <section
        className="rounded-2xl p-6"
        style={{
          background: 'var(--bg-base)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <h4
          className="mb-4 text-sm font-bold tracking-widest uppercase"
          style={{ color: '#C9993A' }}
        >
          What we store
        </h4>
        <div className="space-y-3">
          {DATA_CATEGORIES.map((cat, i) => (
            <div key={i} className="flex items-start gap-3">
              <span
                className={`mt-0.5 shrink-0 text-sm font-bold ${cat.stored ? 'text-green-400' : 'text-red-400'}`}
              >
                {cat.stored ? '✓' : '✗'}
              </span>
              <div>
                <p
                  className="text-sm font-semibold"
                  style={{
                    color: cat.stored
                      ? 'var(--text-primary)'
                      : 'var(--text-tertiary)',
                  }}
                >
                  {cat.label}
                </p>
                <p
                  className="text-xs"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  {cat.detail}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Your Rights ──────────────────────────────────────────── */}
      <section className="space-y-4">
        <h4
          className="text-xs font-bold tracking-widest uppercase"
          style={{ color: '#C9993A' }}
        >
          Your rights
        </h4>

        {/* Right 1: View data */}
        <div
          className="rounded-xl p-5"
          style={{
            background: 'var(--bg-base)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <p className="mb-1 text-sm font-semibold text-[var(--text-primary)]">
            📄 View your data
          </p>
          <p
            className="mb-3 text-sm"
            style={{ color: 'var(--text-tertiary)' }}
          >
            See all data we hold about you in readable format.
          </p>
          <a
            href="/profile"
            className="text-xs font-semibold"
            style={{ color: '#C9993A' }}
          >
            View in My Profile and My Soul tabs →
          </a>
        </div>

        {/* Right 2: Correct */}
        <div
          className="rounded-xl p-5"
          style={{
            background: 'var(--bg-base)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <p className="mb-1 text-sm font-semibold text-[var(--text-primary)]">
            ✏️ Correct your data
          </p>
          <p
            className="mb-3 text-sm"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Update any information that is inaccurate or incomplete.
          </p>
          <button
            onClick={onEditProfile}
            className="text-xs font-semibold"
            style={{ color: '#C9993A' }}
          >
            Edit my profile →
          </button>
        </div>

        {/* Right 3: Download */}
        <div
          className="rounded-xl p-5"
          style={{
            background: 'var(--bg-base)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <p className="mb-1 text-sm font-semibold text-[var(--text-primary)]">
            ⬇️ Download your data
          </p>
          <p
            className="mb-3 text-sm"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Get a complete copy of your personal data as a JSON file.
          </p>
          <DataDownloadButton userId={userId} />
        </div>

        {/* Right 4: Withdraw consent */}
        <div
          className="rounded-xl p-5"
          style={{
            background: 'var(--bg-base)',
            border: '1px solid var(--border-subtle)',
          }}
        >
          <p className="mb-1 text-sm font-semibold text-[var(--text-primary)]">
            🔕 Manage consent
          </p>
          <p
            className="mb-3 text-sm"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Control whether we may send you non-essential communications
            (newsletters, feature updates).
          </p>
          <label className="flex cursor-pointer items-center gap-2">
            <div
              onClick={() => setConsentWithdrawn(!consentWithdrawn)}
              className={`relative h-5 w-10 cursor-pointer rounded-full transition-colors duration-200`}
              style={{
                background: consentWithdrawn
                  ? 'rgba(239,68,68,0.4)'
                  : 'rgba(74,222,128,0.4)',
              }}
            >
              <div
                className="absolute top-0.5 h-4 w-4 rounded-full transition-all duration-200"
                style={{
                  left: consentWithdrawn ? '22px' : '2px',
                  background: consentWithdrawn ? '#EF4444' : '#4ADE80',
                }}
              />
            </div>
            <span
              className="text-xs"
              style={{ color: 'var(--text-secondary)' }}
            >
              {consentWithdrawn
                ? 'Marketing consent withdrawn'
                : 'Marketing communications enabled'}
            </span>
          </label>
        </div>
      </section>

      {/* ── Delete account — Red zone ────────────────────────────── */}
      <section
        className="space-y-4 rounded-2xl p-6"
        style={{
          background: 'rgba(239,68,68,0.04)',
          border: '1px solid rgba(239,68,68,0.2)',
        }}
      >
        <h4
          className="text-xs font-bold tracking-widest uppercase"
          style={{ color: '#EF4444' }}
        >
          Danger zone
        </h4>
        <DeleteAccountSection />
      </section>

      {/* ── Grievance & Contact ──────────────────────────────────── */}
      <section
        className="rounded-xl p-5"
        style={{
          background: 'var(--bg-base)',
          border: '1px solid var(--border-subtle)',
        }}
      >
        <h4
          className="mb-4 text-sm font-bold tracking-widest uppercase"
          style={{ color: 'var(--text-tertiary)' }}
        >
          Contact & Grievance
        </h4>
        <div
          className="space-y-1 text-sm"
          style={{ color: 'var(--text-tertiary)' }}
        >
          <p>Questions about your data? Reach our Grievance Officer.</p>
          <p className="font-semibold text-[var(--text-primary)]">Jaydeep Buch</p>
          <p>
            <a
              href="mailto:privacy@edusaathiai.in"
              style={{ color: '#C9993A' }}
            >
              privacy@edusaathiai.in
            </a>
          </p>
          <p>Response time: Within 30 days</p>
          <p className="mt-2">EdUsaathiAI, Ahmedabad, Gujarat, India</p>
          <div className="mt-2 flex gap-4">
            <a href="/privacy" style={{ color: '#C9993A' }}>
              Privacy Policy →
            </a>
            <a href="/terms" style={{ color: '#C9993A' }}>
              Terms of Service →
            </a>
          </div>
        </div>
      </section>

    </div>
  )
}
