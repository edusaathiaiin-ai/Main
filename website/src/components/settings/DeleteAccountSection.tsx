'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'
import { useRouter } from 'next/navigation'

const RED  = '#EF4444'

export function DeleteAccountSection() {
  const { profile } = useAuthStore()
  const router       = useRouter()

  const [step,     setStep]     = useState<'idle' | 'confirm' | 'typing' | 'deleting' | 'done'>('idle')
  const [typed,    setTyped]    = useState('')
  const [error,    setError]    = useState('')
  const [reason,   setReason]   = useState('')

  const CONFIRM_PHRASE = 'delete my account'
  const isConfirmed    = typed.toLowerCase() === CONFIRM_PHRASE

  const roleLabel = profile?.role === 'faculty'      ? 'Faculty account'
    : profile?.role === 'institution' ? 'Institution account'
    : 'Student account'

  async function handleDelete() {
    if (!isConfirmed || !profile) return
    setStep('deleting')
    setError('')

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Session expired. Please sign in again.')

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/delete-account`,
        {
          method:  'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization:  `Bearer ${session.access_token}`,
            apikey:         process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
          },
          body: JSON.stringify({
            reason: reason.trim() || 'No reason provided',
          }),
        }
      )

      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Deletion failed')

      setStep('done')

      // Sign out and redirect after 3 seconds
      setTimeout(async () => {
        await supabase.auth.signOut()
        router.replace('/')
      }, 3000)

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.')
      setStep('typing')
    }
  }

  if (!profile) return null

  return (
    <div style={{
      padding:      '24px',
      borderRadius: '16px',
      background:   'rgba(239,68,68,0.04)',
      border:       '0.5px solid rgba(239,68,68,0.2)',
    }}>
      <h3 style={{
        fontSize:   '15px',
        fontWeight: 700,
        color:      'var(--text-primary)',
        margin:     '0 0 6px',
        fontFamily: 'Playfair Display, serif',
      }}>
        Delete Account
      </h3>
      <p style={{
        fontSize:   '12px',
        color:      'var(--text-tertiary)',
        margin:     '0 0 16px',
        lineHeight: 1.6,
      }}>
        Permanently delete your {roleLabel} and all associated data.
        This includes your profile, learning history, soul data, chat sessions,
        and any active subscriptions. This action cannot be undone.
      </p>

      <AnimatePresence mode="wait">

        {/* Idle state */}
        {step === 'idle' && (
          <motion.button
            key="idle"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setStep('confirm')}
            style={{
              padding:      '10px 20px',
              borderRadius: '10px',
              background:   'rgba(239,68,68,0.1)',
              border:       '0.5px solid rgba(239,68,68,0.3)',
              color:        'var(--error)',
              fontSize:     '13px',
              fontWeight:   600,
              cursor:       'pointer',
              fontFamily:   'DM Sans, sans-serif',
            }}
          >
            Delete my account &rarr;
          </motion.button>
        )}

        {/* Confirm state */}
        {step === 'confirm' && (
          <motion.div
            key="confirm"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div style={{
              padding:      '16px',
              borderRadius: '12px',
              background:   'rgba(239,68,68,0.08)',
              border:       '0.5px solid rgba(239,68,68,0.25)',
              marginBottom: '16px',
            }}>
              <p style={{
                fontSize: '13px', fontWeight: 700,
                color: 'var(--error)', margin: '0 0 8px',
              }}>
                &#9888;&#65039; This will permanently delete:
              </p>
              {[
                'Your profile and personal information',
                'All chat sessions and learning history',
                'Your Saathi soul data and progress',
                'Saathi Points and enrollments',
                'Faculty profile and session history (if applicable)',
                'Any active subscription (no refund for unused days)',
              ].map((item) => (
                <p key={item} style={{
                  fontSize: '12px', color: 'var(--text-secondary)',
                  margin: '0 0 4px', paddingLeft: '12px',
                }}>
                  &middot; {item}
                </p>
              ))}
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{
                display: 'block', fontSize: '11px', fontWeight: 600,
                color: 'var(--text-tertiary)', marginBottom: '6px',
                letterSpacing: '0.06em', textTransform: 'uppercase',
              }}>
                Reason for leaving (optional — helps us improve)
              </label>
              <textarea
                value={reason}
                onChange={e => setReason(e.target.value.slice(0, 500))}
                placeholder="e.g. Found what I needed, switching to another service, not relevant to my studies..."
                rows={2}
                style={{
                  width:        '100%',
                  padding:      '10px 14px',
                  borderRadius: '10px',
                  background:   'var(--bg-elevated)',
                  border:       '0.5px solid var(--border-medium)',
                  color:        'var(--text-primary)',
                  fontSize:     '13px',
                  resize:       'none',
                  outline:      'none',
                  boxSizing:    'border-box',
                  fontFamily:   'DM Sans, sans-serif',
                }}
              />
            </div>

            <div style={{ marginBottom: '14px' }}>
              <label style={{
                display: 'block', fontSize: '12px',
                color: 'var(--text-secondary)', marginBottom: '8px',
              }}>
                Type <strong style={{ color: 'var(--error)' }}>delete my account</strong> to confirm:
              </label>
              <input
                value={typed}
                onChange={e => setTyped(e.target.value)}
                placeholder="delete my account"
                style={{
                  width:        '100%',
                  padding:      '11px 14px',
                  borderRadius: '10px',
                  background:   'var(--bg-elevated)',
                  border:       `0.5px solid ${isConfirmed ? 'rgba(239,68,68,0.5)' : 'var(--border-medium)'}`,
                  color:        'var(--text-primary)',
                  fontSize:     '14px',
                  outline:      'none',
                  boxSizing:    'border-box',
                  fontFamily:   'DM Sans, sans-serif',
                }}
              />
            </div>

            {error && (
              <p style={{
                fontSize: '12px', color: 'var(--error)',
                padding: '8px 12px', borderRadius: '8px',
                background: 'rgba(239,68,68,0.1)', marginBottom: '12px',
              }}>
                &#9888;&#65039; {error}
              </p>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => { setStep('idle'); setTyped(''); setReason('') }}
                style={{
                  padding:    '11px 18px',
                  borderRadius: '10px',
                  background: 'var(--bg-elevated)',
                  border:     '0.5px solid var(--border-medium)',
                  color:      'var(--text-tertiary)',
                  fontSize:   '13px',
                  cursor:     'pointer',
                  fontFamily: 'DM Sans, sans-serif',
                }}
              >
                Cancel
              </button>
              <button
                onClick={() => isConfirmed && setStep('typing')}
                disabled={!isConfirmed}
                style={{
                  flex:         1,
                  padding:      '11px',
                  borderRadius: '10px',
                  background:   isConfirmed ? RED : 'var(--bg-elevated)',
                  color:        isConfirmed ? '#fff' : 'var(--text-ghost)',
                  fontSize:     '13px',
                  fontWeight:   700,
                  border:       'none',
                  cursor:       isConfirmed ? 'pointer' : 'not-allowed',
                  fontFamily:   'DM Sans, sans-serif',
                  transition:   'all 0.2s',
                }}
              >
                I understand, delete permanently &rarr;
              </button>
            </div>
          </motion.div>
        )}

        {/* Final confirmation */}
        {step === 'typing' && (
          <motion.div
            key="typing"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            <div style={{
              padding: '16px', borderRadius: '12px', marginBottom: '16px',
              background: 'rgba(239,68,68,0.1)',
              border: '1px solid rgba(239,68,68,0.3)',
              textAlign: 'center',
            }}>
              <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--error)', margin: '0 0 6px' }}>
                Last chance
              </p>
              <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                Your account will be deleted immediately and permanently.
                You will receive a confirmation email.
              </p>
            </div>

            {error && (
              <p style={{
                fontSize: '12px', color: 'var(--error)',
                padding: '8px 12px', borderRadius: '8px',
                background: 'rgba(239,68,68,0.1)', marginBottom: '12px',
              }}>
                &#9888;&#65039; {error}
              </p>
            )}

            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={() => { setStep('idle'); setTyped(''); setReason('') }}
                style={{
                  padding: '11px 18px', borderRadius: '10px',
                  background: 'var(--bg-elevated)',
                  border: '0.5px solid var(--border-medium)',
                  color: 'var(--text-tertiary)', fontSize: '13px',
                  cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
                }}
              >
                Cancel — keep my account
              </button>
              <button
                onClick={handleDelete}
                style={{
                  flex: 1, padding: '11px', borderRadius: '10px',
                  background: RED, color: '#fff',
                  fontSize: '13px', fontWeight: 700,
                  border: 'none', cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif',
                }}
              >
                Yes, delete everything &rarr;
              </button>
            </div>
          </motion.div>
        )}

        {/* Deleting */}
        {step === 'deleting' && (
          <motion.div
            key="deleting"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ textAlign: 'center', padding: '24px 0' }}
          >
            <div style={{
              width: '32px', height: '32px', borderRadius: '50%',
              border: '2px solid rgba(239,68,68,0.2)',
              borderTopColor: RED,
              animation: 'spin 0.8s linear infinite',
              margin: '0 auto 12px',
            }} />
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
              Deleting your account and all data...
            </p>
          </motion.div>
        )}

        {/* Done */}
        {step === 'done' && (
          <motion.div
            key="done"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ textAlign: 'center', padding: '24px 0' }}
          >
            <p style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text-primary)', margin: '0 0 6px' }}>
              Account deleted
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-tertiary)', margin: 0 }}>
              A confirmation email has been sent. Redirecting...
            </p>
          </motion.div>
        )}

      </AnimatePresence>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
