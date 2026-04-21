'use client'

import { useState, useEffect, useMemo } from 'react'
import { motion } from 'framer-motion'
import Link from 'next/link'

interface SuspensionScreenProps {
  tier: number
  until?: string | null
  reason?: string | null
  isBanned?: boolean
}

export function SuspensionScreen({
  tier,
  until,
  reason,
  isBanned = false,
}: SuspensionScreenProps) {
  const [timeLeft, setTimeLeft] = useState('')

  const untilDate = useMemo(() => (until ? new Date(until) : null), [until])

  useEffect(() => {
    if (!untilDate || isBanned) return

    function tick() {
      const diff = untilDate!.getTime() - Date.now()
      if (diff <= 0) {
        setTimeLeft('Suspension lifted \u2014 refresh the page')
        return
      }
      const h = Math.floor(diff / 3600000)
      const m = Math.floor((diff % 3600000) / 60000)
      const s = Math.floor((diff % 60000) / 1000)
      setTimeLeft(
        h > 0
          ? `${h}h ${m}m remaining`
          : m > 0
            ? `${m}m ${s}s remaining`
            : `${s}s remaining`
      )
    }

    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [untilDate, isBanned])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center"
      style={{ background: 'rgba(239,68,68,0.02)' }}
    >
      {/* Icon */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
        className="mb-6 text-6xl"
      >
        {isBanned ? '\u{1F6AB}' : tier === 3 ? '\u{26D4}' : '\u{23F8}\u{FE0F}'}
      </motion.div>

      {/* Title */}
      <h2
        className="font-playfair mb-3 text-[28px] font-bold"
        style={{ color: '#F87171' }}
      >
        {isBanned
          ? 'Account Permanently Suspended'
          : tier === 3
            ? 'Account Suspended'
            : 'Temporarily Suspended'}
      </h2>

      {/* Reason */}
      <p
        className="mb-6 max-w-[400px] text-sm"
        style={{ color: 'var(--text-secondary)', lineHeight: 1.7 }}
      >
        {reason ??
          'Your account has been suspended due to a violation of our Terms of Service.'}
      </p>

      {/* Countdown timer for temp suspensions */}
      {!isBanned && untilDate && (
        <div
          className="mb-6 rounded-xl px-8 py-4"
          style={{
            background: 'rgba(239,68,68,0.08)',
            border: '0.5px solid rgba(239,68,68,0.25)',
          }}
        >
          <p
            className="mb-1.5 text-[10px] tracking-widest uppercase"
            style={{ color: 'var(--text-tertiary)' }}
          >
            Suspension lifts in
          </p>
          <p
            className="text-2xl font-bold"
            style={{ color: '#F87171', fontVariantNumeric: 'tabular-nums' }}
          >
            {timeLeft}
          </p>
          <p
            className="mt-1.5 text-[11px]"
            style={{ color: 'var(--text-ghost)' }}
          >
            {untilDate.toLocaleString('en-IN', {
              timeZone: 'Asia/Kolkata',
              dateStyle: 'medium',
              timeStyle: 'short',
            })}{' '}
            IST
          </p>
        </div>
      )}

      {/* What you can still do */}
      {!isBanned && (
        <div
          className="mb-6 rounded-xl px-5 py-4 text-left"
          style={{
            background: 'rgba(74,222,128,0.05)',
            border: '0.5px solid rgba(74,222,128,0.2)',
          }}
        >
          <p
            className="mb-2 text-xs font-semibold"
            style={{ color: '#4ADE80' }}
          >
            You can still:
          </p>
          {[
            { icon: '\u{1F4F0}', text: 'Read News', href: '/news' },
            { icon: '\u{1F3DB}\u{FE0F}', text: 'Browse Board', href: '/board' },
            { icon: '\u{1F464}', text: 'Update Profile', href: '/profile' },
            { icon: '\u{1F4C8}', text: 'View Progress', href: '/progress' },
          ].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-2 py-1 text-xs transition-colors hover:text-white"
              style={{ color: 'var(--text-secondary)', textDecoration: 'none' }}
            >
              <span>{item.icon}</span>
              <span>{item.text}</span>
            </Link>
          ))}
        </div>
      )}

      {/* Appeal link */}
      <a
        href="mailto:support@edusaathiai.in?subject=Account Appeal&body=My account email: [your email]%0D%0AReason for appeal:"
        className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold"
        style={{
          background: 'rgba(201,153,58,0.15)',
          border: '0.5px solid rgba(201,153,58,0.3)',
          color: '#C9993A',
          textDecoration: 'none',
        }}
      >
        \u{2709} Appeal this decision
      </a>

      <p
        className="mt-4 text-[11px]"
        style={{ color: 'var(--text-ghost)' }}
      >
        support@edusaathiai.in
      </p>
    </motion.div>
  )
}
