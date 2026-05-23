'use client'

import type { QuotaState } from '@/types'
import { FREE_TRIAL_DAYS } from '@/constants/plans'

type Props = {
  quota:   QuotaState
  planId:  string
  /** true while the user is inside the 7-day founding-week window */
  isFreeTrial: boolean
  /** profiles.created_at — used to count down the founding week */
  createdAt?: string | null
}

const DAY_MS = 24 * 60 * 60 * 1000

/**
 * Ambient quota / founding-week indicator for free-plan users.
 *
 * Two states:
 *   – Founding week (days 1–7): gold bar counting down the days of full
 *     access, so day 8 is expected — never a surprise drop.
 *   – Free, post-trial: pip-dot quota bar (X of Y chats left today).
 *
 * Hidden for paid plans, and while cooling (CoolingBanner owns that space).
 */
export function FreePlanBar({ quota, planId, isFreeTrial, createdAt }: Props) {
  // Paid plans don't need this bar at all.
  if (planId !== 'free') return null
  // CoolingBanner owns this space when cooling.
  if (quota.isCooling) return null

  // Founding week — count down the full-access window.
  if (isFreeTrial) return <FoundingWeekBar createdAt={createdAt} />

  // Free, post-trial — ambient quota bar.
  const { used, limit, remaining } = quota
  const allUsed = remaining === 0

  return (
    <div
      style={{
        display:       'flex',
        alignItems:    'center',
        justifyContent:'space-between',
        padding:       '6px 16px',
        borderBottom:  '0.5px solid var(--border-subtle)',
        background:    allUsed
          ? 'rgba(239,68,68,0.05)'
          : 'var(--bg-elevated)',
        transition:    'background 0.3s ease',
        flexShrink:    0,
      }}
    >
      {/* Pip dots — one per chat slot */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
        {Array.from({ length: limit }).map((_, i) => {
          const consumed = i < used
          return (
            <span
              key={i}
              style={{
                width:        '7px',
                height:       '7px',
                borderRadius: '50%',
                background:   consumed
                  ? allUsed
                    ? 'rgba(239,68,68,0.45)'
                    : 'var(--saathi-primary)'
                  : 'var(--border-medium)',
                transition:   'background 0.3s ease',
                flexShrink:   0,
              }}
            />
          )
        })}
      </div>

      {/* Text */}
      <span
        style={{
          fontSize:   '11px',
          fontFamily: 'var(--font-body)',
          color:      allUsed ? 'rgba(239,68,68,0.7)' : 'var(--text-tertiary)',
          fontWeight: allUsed ? 600 : 400,
          transition: 'color 0.3s ease',
        }}
      >
        {allUsed
          ? 'Chats used up — cooling starts now'
          : `${remaining} of ${limit} free chat${limit === 1 ? '' : 's'} left today`}
      </span>
    </div>
  )
}

/**
 * Founding-week banner (days 1–7). Gentle gold bar that counts down the
 * full-access window so the day-8 transition to the free plan is expected,
 * never a surprise. Deliberately calm — informative, not a nag.
 */
function FoundingWeekBar({ createdAt }: { createdAt?: string | null }) {
  if (!createdAt) return null

  const msLeft   = new Date(createdAt).getTime() + FREE_TRIAL_DAYS * DAY_MS - Date.now()
  const daysLeft = Math.max(1, Math.ceil(msLeft / DAY_MS))
  const lastDay  = daysLeft <= 1

  return (
    <div
      style={{
        display:      'flex',
        alignItems:   'center',
        gap:          '8px',
        padding:      '6px 16px',
        borderBottom: '0.5px solid rgba(184,134,11,0.22)',
        background:   'rgba(184,134,11,0.07)',
        flexShrink:   0,
      }}
    >
      <span style={{ fontSize: '12px', flexShrink: 0 }} aria-hidden="true">✨</span>
      <span
        style={{
          fontSize:   '11px',
          fontFamily: 'var(--font-body)',
          color:      'var(--gold, #B8860B)',
          fontWeight: 500,
          lineHeight: 1.4,
        }}
      >
        {lastDay
          ? 'Last day of full access — tomorrow your free plan keeps Study Notes + Citizen Guide'
          : `Founding week · ${daysLeft} days of full access — all 5 modes, 10 chats each`}
      </span>
    </div>
  )
}
