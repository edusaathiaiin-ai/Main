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

const URGENCY_BORDER: Record<string, string> = {
  low:    'rgba(184,134,11,0.25)',
  medium: 'rgba(184,134,11,0.40)',
  high:   'rgba(184,134,11,0.60)',
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
        bottom: '72px',
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 50,
        width: 'calc(100% - 32px)',
        maxWidth: '480px',
        padding: '10px 12px 10px 16px',
        borderRadius: '14px',
        background: '#FFFFFF',
        border: `1px solid ${URGENCY_BORDER[config.urgency]}`,
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
      }}
    >
      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <p
          style={{
            fontSize: '12px',
            fontWeight: '600',
            color: '#1A1814',
            margin: 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {studentName
            ? config.headline.replace('[Name]', studentName)
            : config.headline}
        </p>
      </div>

      {/* CTA */}
      <Link
        href={config.ctaUrl}
        onClick={handleUpgrade}
        style={{
          flexShrink: 0,
          padding: '7px 14px',
          borderRadius: '9px',
          background: '#B8860B',
          color: '#FFFFFF',
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
        aria-label="Dismiss"
        style={{
          flexShrink: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '28px',
          height: '28px',
          borderRadius: '50%',
          background: 'rgba(26,24,20,0.06)',
          border: '0.5px solid rgba(26,24,20,0.12)',
          color: '#4A4740',
          cursor: 'pointer',
          fontSize: '16px',
          lineHeight: 1,
          padding: 0,
        }}
      >
        ×
      </button>
    </motion.div>
  )
}
