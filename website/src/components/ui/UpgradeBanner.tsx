'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'

export type UpgradeTrigger =
  | 'session_milestone'
  | 'quota_low'
  | 'cooling'
  | 'shell_broken'
  | 'board_engaged'
  | 'news_engaged'

type BannerConfig = {
  headline: string
  subtext: string
  cta: string
  ctaUrl: string
  urgency: 'low' | 'medium' | 'high'
}

const BANNER_CONFIGS: Record<UpgradeTrigger, BannerConfig> = {
  session_milestone: {
    headline: 'Enjoying your Saathi? ✦',
    subtext: 'Founding Student Plus · ₹199/month · No cooling · 20 chats daily',
    cta: 'Upgrade now →',
    ctaUrl: '/pricing?plan=plus&trigger=session',
    urgency: 'low',
  },
  quota_low: {
    headline: 'Running low on chats today',
    subtext:
      'Plus gives you 20 every day. Pro gives you 50. Never stop mid-thought.',
    cta: 'Remove the limit →',
    ctaUrl: '/pricing?plan=plus&trigger=quota',
    urgency: 'medium',
  },
  cooling: {
    headline: 'Your Saathi is ready. Are you? 🔥',
    subtext:
      'Upgrade to Plus and the cooling period disappears — forever. ₹199/month.',
    cta: 'End the wait →',
    ctaUrl: '/pricing?plan=plus&trigger=cooling',
    urgency: 'high',
  },
  shell_broken: {
    headline: 'You just found your direction ✦',
    subtext:
      "Don't let daily limits slow what you just started. Plus removes every barrier.",
    cta: 'Protect your momentum →',
    ctaUrl: '/pricing?plan=plus&trigger=shell',
    urgency: 'high',
  },
  board_engaged: {
    headline: 'Learning from the community?',
    subtext:
      'Plus members post unlimited questions. Faculty answers yours first.',
    cta: 'Join Plus →',
    ctaUrl: '/pricing?plan=plus&trigger=board',
    urgency: 'low',
  },
  news_engaged: {
    headline: 'Stay ahead in your field',
    subtext:
      'Plus members get research alerts matched to their soul profile. Daily.',
    cta: 'Get personalised alerts →',
    ctaUrl: '/pricing?plan=plus&trigger=news',
    urgency: 'low',
  },
}

const URGENCY_BG: Record<string, string> = {
  low: 'rgba(201,153,58,0.12)',
  medium: 'rgba(251,146,60,0.12)',
  high: 'rgba(239,68,68,0.1)',
}
const URGENCY_BORDER: Record<string, string> = {
  low: 'rgba(201,153,58,0.35)',
  medium: 'rgba(251,146,60,0.4)',
  high: 'rgba(239,68,68,0.35)',
}
const URGENCY_ACCENT: Record<string, string> = {
  low: '#C9993A',
  medium: '#FB923C',
  high: '#F87171',
}

export function UpgradeBanner({
  trigger,
  studentName,
  onDismiss,
}: {
  trigger: UpgradeTrigger
  studentName?: string
  onDismiss: () => void
}) {
  const config = BANNER_CONFIGS[trigger]

  function handleUpgrade() {
    sessionStorage.setItem('upgrade_return_url', window.location.pathname)
    sessionStorage.setItem('upgrade_trigger', trigger)
  }

  return (
    <motion.div
      initial={{ y: 80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: 80, opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        position: 'fixed',
        bottom: '24px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50,
        width: 'calc(100% - 48px)',
        maxWidth: '520px',
        padding: '16px 20px',
        borderRadius: '16px',
        background: URGENCY_BG[config.urgency],
        border: `1px solid ${URGENCY_BORDER[config.urgency]}`,
        backdropFilter: 'blur(12px)',
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.4)',
      }}
    >
      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: '13px',
            fontWeight: '600',
            color: '#ffffff',
            margin: '0 0 3px',
          }}
        >
          {studentName
            ? config.headline.replace('[Name]', studentName)
            : config.headline}
        </p>
        <p
          style={{
            fontSize: '11px',
            color: 'rgba(255,255,255,0.5)',
            margin: 0,
            lineHeight: 1.5,
          }}
        >
          {config.subtext}
        </p>
      </div>

      {/* CTA */}
      <Link
        href={config.ctaUrl}
        onClick={handleUpgrade}
        style={{
          flexShrink: 0,
          padding: '8px 16px',
          borderRadius: '10px',
          background: URGENCY_ACCENT[config.urgency],
          color: '#0B1F3A',
          fontSize: '12px',
          fontWeight: '700',
          textDecoration: 'none',
          whiteSpace: 'nowrap',
        }}
      >
        {config.cta}
      </Link>

      {/* Dismiss */}
      <button
        onClick={onDismiss}
        style={{
          flexShrink: 0,
          background: 'none',
          border: 'none',
          color: 'rgba(255,255,255,0.25)',
          cursor: 'pointer',
          fontSize: '18px',
          padding: '0',
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </motion.div>
  )
}
