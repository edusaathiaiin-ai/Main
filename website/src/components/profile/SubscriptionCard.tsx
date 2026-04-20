'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import type { Profile } from '@/types'
import { getPlan, getPlanTier } from '@/constants/plans'

const PLAN_COLORS: Record<string, string> = {
  free: 'var(--text-ghost)',
  plus: '#C9993A',
  pro: '#7C3AED',
  unlimited: '#EF4444',
}

interface SubscriptionCardProps {
  profile: Profile
}

export default function SubscriptionCard({ profile }: SubscriptionCardProps) {
  const router = useRouter()
  const tier = getPlanTier(profile.plan_id)
  const plan = getPlan(profile.plan_id)
  const planColor = PLAN_COLORS[tier] ?? '#C9993A'

  const isActive = profile.subscription_status === 'active'
  const isPaused = profile.subscription_status === 'paused'
  const expiresAt = profile.subscription_expires_at
    ? new Date(profile.subscription_expires_at).toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null
  const isFree = tier === 'free'

  // Founding access: if active and within 60 day window from created_at
  const [now] = useState(() => Date.now())
  const createdAt = new Date(profile.created_at)
  const daysSinceCreation = Math.floor(
    (now - createdAt.getTime()) / (1000 * 60 * 60 * 24)
  )
  const foundingDaysLeft = Math.max(0, 60 - daysSinceCreation)
  const isFoundingStudent = foundingDaysLeft > 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
      className="rounded-2xl p-6"
      style={{
        background: 'var(--bg-base)',
        border: `1px solid ${planColor}40`,
        boxShadow: `0 0 30px ${planColor}10`,
      }}
    >
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <p
            className="mb-1 text-xs font-semibold tracking-widest uppercase"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Current plan
          </p>
          <div className="flex items-center gap-2">
            <span className="font-playfair text-2xl font-bold">
              {plan.name}
            </span>
            <span
              className="rounded-full px-2.5 py-0.5 text-[11px] font-bold"
              style={{
                background: `${planColor}25`,
                color: planColor,
                border: `1px solid ${planColor}50`,
              }}
            >
              {isActive ? 'Active' : isPaused ? 'Paused' : 'Free'}
            </span>
          </div>
        </div>
        <div className="text-right">
          <p
            className="font-playfair text-xl font-bold"
            style={{ color: planColor }}
          >
            {isFree ? 'Free' : `₹${plan.introPrice ?? plan.priceMonthly}/mo`}
          </p>
          {expiresAt && (
            <p
              className="mt-0.5 text-xs"
              style={{ color: 'var(--text-tertiary)' }}
            >
              {isPaused ? 'Paused until' : 'Renews'} {expiresAt}
            </p>
          )}
        </div>
      </div>

      {/* Founding student countdown */}
      {isFoundingStudent && (
        <div
          className="mb-4 rounded-xl p-3.5"
          style={{
            background: 'rgba(201,153,58,0.08)',
            border: '1px solid rgba(201,153,58,0.25)',
          }}
        >
          <div className="mb-2 flex items-center justify-between">
            <p className="text-xs font-semibold" style={{ color: '#E5B86A' }}>
              ✦ Founding Student Access
            </p>
            <p className="text-xs font-bold" style={{ color: '#C9993A' }}>
              {foundingDaysLeft} days remaining
            </p>
          </div>
          <div
            className="h-1.5 overflow-hidden rounded-full"
            style={{ background: 'var(--border-subtle)' }}
          >
            <div
              className="h-full rounded-full transition-all"
              style={{
                width: `${(foundingDaysLeft / 60) * 100}%`,
                background: 'linear-gradient(90deg, #C9993A, #E5B86A)',
              }}
            />
          </div>
        </div>
      )}

      {/* CTA */}
      {isFree ? (
        <button
          onClick={() => router.push('/pricing')}
          className="w-full rounded-xl py-3 text-sm font-bold transition-all hover:brightness-110"
          style={{ background: '#C9993A', color: '#060F1D' }}
        >
          Upgrade to Saathi Plus →
        </button>
      ) : (
        <div className="flex gap-2">
          <button
            onClick={() => router.push('/pricing')}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
          >
            Manage subscription
          </button>
          <button
            onClick={() => router.push('/pricing')}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold transition-all"
            style={{
              background: 'var(--bg-elevated)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
          >
            View billing →
          </button>
        </div>
      )}
    </motion.div>
  )
}
