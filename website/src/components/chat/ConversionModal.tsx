'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { NUDGE_LIBRARY } from '@/constants/nudges'

type Props = {
  open: boolean
  trigger: 'quota_hit' | 'plus_bot_tap'
  botName?: string
  onClose: () => void
}

function randomNudge(): string {
  const arr = NUDGE_LIBRARY
  return (
    arr[Math.floor(Math.random() * arr.length)]?.english ??
    'Upgrade to unlock more.'
  )
}

export function ConversionModal({ open, trigger, botName, onClose }: Props) {
  const nudge = randomNudge()

  const title =
    trigger === 'quota_hit'
      ? "You've reached your daily limit"
      : `${botName ?? 'This bot'} needs Plus`

  const subtitle =
    trigger === 'quota_hit'
      ? nudge
      : `${botName} is available on the Plus plan and above.`

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-40"
            style={{
              background: 'rgba(0,0,0,0.6)',
              backdropFilter: 'blur(6px)',
            }}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.94, y: 16 }}
            transition={{ type: 'spring', stiffness: 300, damping: 28 }}
            className="fixed inset-x-4 top-1/2 z-50 mx-auto max-w-md -translate-y-1/2 rounded-3xl p-8"
            style={{
              background: 'var(--bg-surface)',
              border: '1px solid var(--border-medium)',
              boxShadow: 'var(--shadow-xl)',
            }}
          >
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-full text-sm transition-colors"
              style={{
                background: 'var(--bg-elevated)',
                color: 'var(--text-ghost)',
              }}
            >
              ✕
            </button>

            {/* Badge */}
            <div className="mb-6">
              <span
                className="rounded-full px-3 py-1 text-xs font-bold tracking-widest uppercase"
                style={{
                  background: 'rgba(201,153,58,0.15)',
                  border: '0.5px solid rgba(201,153,58,0.4)',
                  color: '#C9993A',
                }}
              >
                {trigger === 'quota_hit' ? '🔒 Daily Limit' : '⭐ Plus Feature'}
              </span>
            </div>

            {/* Title */}
            <h2 className="font-display mb-3 text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
              {title}
            </h2>
            <p
              className="mb-8 text-sm leading-relaxed"
              style={{ color: 'var(--text-secondary)' }}
            >
              {subtitle}
            </p>

            {/* Plan cards */}
            <div className="mb-6 space-y-3">
              {[
                {
                  name: 'Plus',
                  price: '₹199/mo',
                  detail: '20 chats/day · All 5 bots · Priority support',
                  color: '#C9993A',
                },
                {
                  name: 'Pro',
                  price: '₹499/mo',
                  detail: '50 chats/day · 24h cooling · Advanced analytics',
                  color: '#7C3AED',
                },
              ].map((plan) => (
                <a
                  key={plan.name}
                  href="/pricing"
                  onClick={onClose}
                  className="flex items-center justify-between rounded-xl px-4 py-3 transition-all duration-150"
                  style={{
                    background: `${plan.color}18`,
                    border: `0.5px solid ${plan.color}44`,
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.background = `${plan.color}28`)
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.background = `${plan.color}18`)
                  }
                >
                  <div>
                    <p className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>{plan.name}</p>
                    <p
                      className="text-xs"
                      style={{ color: 'var(--text-tertiary)' }}
                    >
                      {plan.detail}
                    </p>
                  </div>
                  <span
                    className="text-sm font-semibold"
                    style={{ color: plan.color }}
                  >
                    {plan.price}
                  </span>
                </a>
              ))}
            </div>

            <button
              onClick={onClose}
              className="w-full py-2 text-center text-xs transition-colors"
              style={{ color: 'var(--text-ghost)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-tertiary)')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-ghost)')}
            >
              Continue with free plan
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
