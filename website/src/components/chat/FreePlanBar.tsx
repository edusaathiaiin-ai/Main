'use client'

import type { QuotaState } from '@/types'

type Props = {
  quota:   QuotaState
  planId:  string
  /** true when the user is still inside the 60-day founding free trial */
  isFreeTrial: boolean
}

/**
 * Ambient quota indicator for free-plan users.
 *
 * Lifecycle:
 *   – Shows at all times for free (non-trial) users when NOT cooling
 *   – Disappears the moment cooling starts (CoolingBanner takes over)
 *   – Reappears automatically when quota resets (ChatWindow calls refreshQuota
 *     on timer, which sets isCooling=false and restores remaining)
 */
export function FreePlanBar({ quota, planId, isFreeTrial }: Props) {
  // Plus / Pro / Unlimited / free-trial users don't need this
  if (planId !== 'free' || isFreeTrial) return null
  // CoolingBanner owns this space when cooling
  if (quota.isCooling) return null

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
          : 'rgba(255,255,255,0.02)',
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
