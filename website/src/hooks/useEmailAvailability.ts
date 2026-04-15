'use client'

/**
 * useEmailAvailability — debounced lookup against profiles.email.
 *
 * Behaviour:
 *   • onChange: clear status, then schedule a check 400ms after the
 *     user stops typing — only if the email is a valid format.
 *   • onBlur: cancel any pending debounce and check immediately.
 *   • Empty input → idle (no UI). Invalid format on blur → 'invalid'.
 *
 * Status is exposed; the caller renders copy/colour appropriate to its
 * surface (login vs faculty-apply use different messages).
 */

import { useCallback, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export type EmailAvailabilityStatus =
  | 'idle'
  | 'checking'
  | 'available'
  | 'taken'
  | 'invalid'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function useEmailAvailability() {
  const [status, setStatus] = useState<EmailAvailabilityStatus>('idle')
  const timer       = useRef<number | null>(null)
  const lastChecked = useRef<string>('')

  const cancel = useCallback(() => {
    if (timer.current !== null) {
      window.clearTimeout(timer.current)
      timer.current = null
    }
  }, [])

  const runCheck = useCallback(async (email: string) => {
    const trimmed = email.trim().toLowerCase()
    if (!trimmed) return
    // Skip duplicate lookups for the same email.
    if (trimmed === lastChecked.current && (status === 'taken' || status === 'available')) return
    lastChecked.current = trimmed
    setStatus('checking')
    try {
      const supabase = createClient()
      // RPC over direct .select() — profiles RLS is id = auth.uid() so an
      // anon client can't read other rows. The SECURITY DEFINER function
      // returns boolean only, no row data.
      const { data, error } = await supabase
        .rpc('email_is_registered', { check_email: trimmed })
      if (error) {
        // Network / function hiccup — fail open, hide the indicator.
        setStatus('idle')
        return
      }
      setStatus(data === true ? 'taken' : 'available')
    } catch {
      setStatus('idle')
    }
    // status intentionally omitted from deps — runCheck reads it for an
    // optimisation only; we don't want to re-create the function on every
    // status flip (would invalidate the timer reference).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const onChange = useCallback((email: string) => {
    cancel()
    if (!email) {
      lastChecked.current = ''
      setStatus('idle')
      return
    }
    if (!EMAIL_REGEX.test(email.trim())) {
      // Don't shout 'invalid' while the user is mid-type — wait for blur.
      setStatus('idle')
      return
    }
    setStatus('idle')
    timer.current = window.setTimeout(() => runCheck(email), 400)
  }, [cancel, runCheck])

  const onBlur = useCallback((email: string) => {
    cancel()
    if (!email) { setStatus('idle'); return }
    if (!EMAIL_REGEX.test(email.trim())) { setStatus('invalid'); return }
    runCheck(email)
  }, [cancel, runCheck])

  const reset = useCallback(() => {
    cancel()
    lastChecked.current = ''
    setStatus('idle')
  }, [cancel])

  return { status, onChange, onBlur, reset }
}
