'use client'

import { useState } from 'react'
import { getBrowserClient } from '@/lib/supabase-browser'

type Props = {
  userId: string
  userName: string | null
  userEmail: string | null
  hasPhone: boolean
}

type Channel = 'email' | 'whatsapp'
type State = 'idle' | 'sending' | 'sent' | 'error'

export function DirectActions({ userId, userName, userEmail, hasPhone }: Props) {
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [state, setState]     = useState<State>('idle')
  const [sentVia, setSentVia] = useState<Channel | null>(null)
  const [errMsg, setErrMsg]   = useState('')

  const canSend = subject.trim().length > 0 && message.trim().length > 0

  async function send(channel: Channel) {
    if (!canSend) return
    setState('sending')
    setErrMsg('')

    try {
      const sb = getBrowserClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) throw new Error('Not authenticated')
      const { data: { session } } = await sb.auth.getSession()
      if (!session?.access_token) throw new Error('No session')

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-nudge`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            segment:    'specific_user',
            userId,
            subject:    subject.trim(),
            message:    message.trim(),
            channels:   [channel],
            senderName: 'Jaydeep from EdUsaathiAI',
          }),
        }
      )

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? `HTTP ${res.status}`)
      if (data.reach === 0) throw new Error('Message not delivered — user may have no ' + (channel === 'email' ? 'email address' : 'phone number') + ' on record')

      setSentVia(channel)
      setState('sent')
      // Reset after 5s
      setTimeout(() => {
        setState('idle')
        setSentVia(null)
        setSubject('')
        setMessage('')
      }, 5000)
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : 'Something went wrong')
      setState('error')
      setTimeout(() => setState('idle'), 4000)
    }
  }

  return (
    <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5">
      <h2 className="text-xs text-slate-500 uppercase tracking-wider font-semibold mb-4">
        Direct Actions
      </h2>

      {state === 'sent' ? (
        <div className="rounded-xl p-4 bg-emerald-500/10 border border-emerald-500/20 text-center space-y-1">
          <p className="text-emerald-400 font-semibold text-sm">
            {sentVia === 'email' ? '📧' : '💬'} Message sent to {userName ?? userEmail ?? 'user'}
          </p>
          <p className="text-slate-500 text-xs">
            Delivered via {sentVia === 'email' ? `email (${userEmail})` : 'WhatsApp'} from admin@edusaathiai.in
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Recipient context */}
          <p className="text-xs text-slate-500">
            Sending personally to <span className="text-slate-300 font-medium">{userName ?? 'this user'}</span>
            {userEmail && <span className="text-slate-600"> · {userEmail}</span>}
          </p>

          {/* Subject */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              placeholder={`Hey ${userName?.split(' ')[0] ?? 'there'}, just checking in…`}
              disabled={state === 'sending'}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-amber-500/60 disabled:opacity-50 transition-colors"
            />
          </div>

          {/* Message */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1">Message</label>
            <textarea
              rows={4}
              value={message}
              onChange={e => setMessage(e.target.value)}
              placeholder={`Hi ${userName?.split(' ')[0] ?? 'there'},\n\nI noticed you haven't chatted in a couple of days. Your Saathi misses you…`}
              disabled={state === 'sending'}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-amber-500/60 resize-none disabled:opacity-50 transition-colors"
            />
            <p className="text-right text-[10px] text-slate-700 mt-0.5">{message.length}/2000</p>
          </div>

          {/* Error */}
          {state === 'error' && (
            <p className="text-xs text-red-400 bg-red-500/10 rounded-lg px-3 py-2">
              ⚠️ {errMsg}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex gap-2 pt-1">
            <button
              onClick={() => send('email')}
              disabled={!canSend || state === 'sending' || !userEmail}
              title={!userEmail ? 'No email address on record' : ''}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-amber-500 hover:bg-amber-400 text-slate-950 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {state === 'sending' && sentVia === null ? (
                <span className="w-3.5 h-3.5 border-2 border-slate-900/40 border-t-slate-900 rounded-full animate-spin" />
              ) : '📧'}
              {state === 'sending' ? 'Sending…' : 'Send Email'}
            </button>

            <button
              onClick={() => send('whatsapp')}
              disabled={!canSend || state === 'sending' || !hasPhone}
              title={!hasPhone ? 'No phone number on record' : ''}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              💬 WhatsApp
            </button>

            {!hasPhone && (
              <span className="self-center text-[10px] text-slate-600">
                No phone on record
              </span>
            )}
          </div>

          <p className="text-[10px] text-slate-700 leading-relaxed">
            Emails arrive from <span className="text-slate-600">admin@edusaathiai.in</span> · not logged in nudge_campaigns · personal use only
          </p>
        </div>
      )}
    </div>
  )
}
