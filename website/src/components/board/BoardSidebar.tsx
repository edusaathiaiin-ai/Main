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
                background: 'rgba(201,153,58,0.06)',
                border: '0.5px solid rgba(201,153,58,0.2)',
                borderRadius: '10px',
                fontSize: '11px',
                color: 'rgba(255,255,255,0.45)',
                textAlign: 'center',
                lineHeight: 1.5,
              }}
            >
              Daily limit reached ·{' '}
              <Link
                href="/pricing"
                style={{ color: '#C9993A', fontWeight: '600' }}
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
                background: '#0B1F3A',
                border: '0.5px solid rgba(255,255,255,0.12)',
                color: 'rgba(255,255,255,0.7)',
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
              color: 'rgba(255,255,255,0.35)',
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
              <span style={{ color: '#FB923C' }}>
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
            <p className="text-sm font-bold text-white">{activeSaathi.name}</p>
            <p
              className="text-[10px]"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              {activeSaathi.tagline}
            </p>
          </div>
        </div>
        <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Questions in this community are answered by AI and reviewed by
          faculty.
        </p>
      </div>

      {/* Top contributors */}
      <div
        className="rounded-2xl p-4"
        style={{
          background: 'rgba(255,255,255,0.03)',
          border: '0.5px solid rgba(255,255,255,0.07)',
        }}
      >
        <p
          className="mb-3 text-xs font-semibold tracking-wider uppercase"
          style={{ color: 'rgba(255,255,255,0.35)' }}
        >
          Top Contributors
        </p>
        <div className="space-y-2.5">
          {TOP_FACULTY.map((f, i) => (
            <div key={i} className="flex items-center gap-2.5">
              <div
                className="flex h-7 w-7 items-center justify-center rounded-full text-xs"
                style={{
                  background: 'rgba(22,163,74,0.15)',
                  border: '0.5px solid rgba(22,163,74,0.3)',
                }}
              >
                {f.badge}
              </div>
              <div className="flex-1">
                <p className="text-xs font-semibold text-white">{f.name}</p>
              </div>
              {f.verified && (
                <span
                  className="rounded-full px-1.5 py-0.5 text-[9px] font-bold"
                  style={{
                    background: 'rgba(34,197,94,0.1)',
                    border: '0.5px solid rgba(34,197,94,0.3)',
                    color: '#4ADE80',
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
          background: 'rgba(255,255,255,0.03)',
          border: '0.5px solid rgba(255,255,255,0.07)',
        }}
      >
        <p
          className="mb-3 text-xs font-semibold tracking-wider uppercase"
          style={{ color: 'rgba(255,255,255,0.35)' }}
        >
          Trending Topics
        </p>
        <div className="flex flex-wrap gap-2">
          {[
            'Constitutional Law',
            'IPC 302',
            'Bail Reform',
            'UPSC Prep',
            'Section 498A',
          ].map((topic) => (
            <span
              key={topic}
              className="rounded-full px-2.5 py-1 text-[10px] font-medium"
              style={{
                background: `${activeSaathi.primary}15`,
                border: `0.5px solid ${activeSaathi.primary}33`,
                color: activeSaathi.primary,
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
