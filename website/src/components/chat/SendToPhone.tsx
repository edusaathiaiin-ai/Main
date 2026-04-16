'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'

type Props = {
  messageContent: string
  messageLength: number
  saathiName: string
  saathiSlug: string
  boardName?: string
  boardType?: string
}

function capture(event: string, props: Record<string, unknown>) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ph = require('posthog-js').default
    ph.capture?.(event, props)
  } catch { /* posthog not loaded */ }
}

function formatForWhatsApp(
  content: string,
  boardName: string = 'General',
  saathiName: string = 'Saathi'
): string {
  const clean = content
    .replace(/#{1,6}\s/g, '*')
    .replace(/\*\*(.*?)\*\*/g, '*$1*')
    .replace(/`(.*?)`/g, '_$1_')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
    .slice(0, 3000)
  return `📒 *${saathiName} — ${boardName}*\n─────────────────\n${clean}\n─────────────────\n_edusaathiai.in ✦_`
}

export function SendToPhone({
  messageContent,
  messageLength,
  saathiName,
  saathiSlug,
  boardName,
  boardType,
}: Props) {
  const { profile } = useAuthStore()
  const [state, setState] = useState<'idle' | 'sending' | 'sent' | 'no-phone' | 'outside-window' | 'rate-limit' | 'error'>('idle')

  async function send() {
    if (state === 'sending' || state === 'sent') return
    if (!profile?.id) return

    // Check if WhatsApp linked
    const supabase = createClient()
    const { data: prof } = await supabase
      .from('profiles')
      .select('wa_phone')
      .eq('id', profile.id)
      .single()

    if (!prof?.wa_phone) {
      setState('no-phone')
      setTimeout(() => setState('idle'), 5000)
      return
    }

    setState('sending')

    const formatted = formatForWhatsApp(messageContent, boardName, saathiName)

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Not logged in')

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-to-phone`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
          },
          body: JSON.stringify({
            phone: prof.wa_phone,
            message: formatted,
            boardName: boardName ?? 'General',
            saathiSlug,
          }),
        }
      )

      if (res.ok) {
        setState('sent')
        capture('send_to_phone', {
          saathi_slug: saathiSlug,
          board_type: boardType ?? 'general',
          message_length: messageLength,
        })
        setTimeout(() => setState('idle'), 3000)
      } else {
        const body = await res.json().catch(() => ({})) as { error?: string }
        if (body.error === 'outside_window') {
          setState('outside-window')
          setTimeout(() => setState('idle'), 6000)
        } else if (body.error === 'rate_limit') {
          setState('rate-limit')
          setTimeout(() => setState('idle'), 4000)
        } else {
          setState('error')
          setTimeout(() => setState('idle'), 3000)
        }
      }
    } catch {
      setState('error')
      setTimeout(() => setState('idle'), 3000)
    }
  }

  const label =
    state === 'sending'        ? '⏳' :
    state === 'sent'           ? '✓' :
    state === 'no-phone'       ? '🔗' :
    state === 'outside-window' ? '💬' :
    state === 'rate-limit'     ? '🚫' :
    state === 'error'          ? '⚠️' :
    '📱'

  const title =
    state === 'no-phone'
      ? 'Link your WhatsApp in profile to send notes to your phone instantly'
      : state === 'outside-window'
        ? 'Open WhatsApp Saathi to activate sending, then try again'
        : state === 'rate-limit'
          ? 'Daily limit reached — max 10 sends per day'
          : state === 'sent'
            ? 'Sent to your WhatsApp!'
            : state === 'error'
              ? 'Could not send — try again'
              : 'Send to phone'

  return (
    <motion.button
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      onClick={
        state === 'no-phone' ? () => window.location.assign('/profile#whatsapp')
        : state === 'outside-window' ? () => window.open(`https://wa.me/${process.env.NEXT_PUBLIC_WHATSAPP_SUPPORT_NUMBER ?? '919825593204'}?text=Hi`, '_blank')
        : send
      }
      disabled={state === 'sending'}
      className="flex h-6 w-6 items-center justify-center rounded-full text-xs message-action-btn"
      style={{
        background: state === 'sent'
          ? 'rgba(74,222,128,0.15)'
          : state === 'no-phone' || state === 'outside-window'
            ? 'rgba(245,158,11,0.15)'
            : state === 'error'
              ? 'rgba(239,68,68,0.15)'
              : 'var(--bg-elevated)',
        border: state === 'sent'
          ? '1px solid rgba(74,222,128,0.3)'
          : state === 'no-phone' || state === 'outside-window'
            ? '1px solid rgba(245,158,11,0.3)'
            : state === 'error'
              ? '1px solid rgba(239,68,68,0.3)'
              : '1px solid var(--saathi-border)',
        cursor: state === 'sending' ? 'not-allowed' : 'pointer',
      }}
      title={title}
      aria-label={title}
    >
      {label}
    </motion.button>
  )
}
