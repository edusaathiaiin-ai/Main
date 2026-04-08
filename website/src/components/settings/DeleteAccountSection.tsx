'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/authStore'

type DeleteStep = 'idle' | 'warning' | 'confirm' | 'deleting' | 'done'

export function DeleteAccountSection() {
  const router = useRouter()
  const { profile } = useAuthStore()
  const [step, setStep] = useState<DeleteStep>('idle')
  const [reason, setReason] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [error, setError] = useState('')

  const role = profile?.role ?? 'student'
  const isConfirmed = confirmText.toLowerCase().trim() === 'delete my account'

  const warningItems: Record<string, string[]> = {
    student: [
      'Your soul profile, learning history, and flame stage will be permanently deleted',
      'All chat conversations with your Saathi will be erased',
      'Your Saathi Points balance will be lost',
      'Any active subscription will be cancelled (no refund for current period)',
      'Your Community Board posts will become anonymous',
      'This cannot be undone',
    ],
    faculty: [
      'Your faculty profile and verification status will be removed',
      'All session history and earnings data will be deleted',
      'Any live lectures you created will be removed',
      'Student reviews and ratings will become anonymous',
      'Pending payouts will still be processed',
      'This cannot be undone',
    ],
    institution: [
      'Your institution profile will be removed',
      'All internship postings will be delisted',
      'Application data will become anonymous',
      'This cannot be undone',
    ],
  }

  async function handleDelete() {
    if (!isConfirmed || !profile?.id) return
    setStep('deleting')
    setError('')

    try {
      const supabase = createClient()
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Session expired')

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/delete-account`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            reason: reason.trim() || null,
            confirmText: confirmText.trim(),
          }),
        },
      )

      const data = await res.json() as { ok?: boolean; deleted?: boolean; error?: string }
      if (!res.ok || (!data.ok && !data.deleted)) {
        throw new Error(data.error ?? 'Deletion failed')
      }

      setStep('done')
      // Redirect after 3 seconds
      setTimeout(() => {
        router.push('/')
      }, 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
      setStep('confirm')
    }
  }

  if (step === 'idle') {
    return (
      <button
        onClick={() => setStep('warning')}
        style={{
          background: 'none',
          border: '1px solid rgba(239,68,68,0.25)',
          borderRadius: '12px',
          padding: '12px 20px',
          color: 'rgba(239,68,68,0.7)',
          fontSize: '13px',
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s',
          width: '100%',
          textAlign: 'left',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(239,68,68,0.06)'
          e.currentTarget.style.borderColor = 'rgba(239,68,68,0.4)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'none'
          e.currentTarget.style.borderColor = 'rgba(239,68,68,0.25)'
        }}
      >
        Delete my account &rarr;
      </button>
    )
  }

  return (
    <AnimatePresence mode="wait">
      {/* Warning step */}
      {step === 'warning' && (
        <motion.div
          key="warning"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          style={{
            borderRadius: '16px',
            border: '1px solid rgba(239,68,68,0.3)',
            background: 'rgba(239,68,68,0.04)',
            padding: '24px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <span style={{ fontSize: '24px' }}>&#9888;&#65039;</span>
            <div>
              <p style={{ fontSize: '16px', fontWeight: 700, color: '#fff', margin: '0 0 2px' }}>
                Delete your account?
              </p>
              <p style={{ fontSize: '12px', color: 'rgba(239,68,68,0.8)', margin: 0 }}>
                This is permanent and cannot be undone
              </p>
            </div>
          </div>

          <div style={{
            borderRadius: '12px', padding: '16px', marginBottom: '16px',
            background: 'rgba(239,68,68,0.06)', border: '0.5px solid rgba(239,68,68,0.15)',
          }}>
            <p style={{ fontSize: '12px', fontWeight: 600, color: '#fff', margin: '0 0 10px' }}>
              This will permanently:
            </p>
            {(warningItems[role] ?? warningItems.student).map((item, i) => (
              <p key={i} style={{ display: 'flex', gap: '8px', fontSize: '12px', color: 'rgba(255,255,255,0.55)', margin: '0 0 6px' }}>
                <span style={{ color: '#EF4444', flexShrink: 0 }}>&bull;</span> {item}
              </p>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => setStep('idle')}
              style={{
                flex: 1, padding: '12px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
                background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)',
                border: 'none', cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={() => setStep('confirm')}
              style={{
                flex: 1, padding: '12px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
                background: 'rgba(239,68,68,0.15)', color: '#EF4444',
                border: '0.5px solid rgba(239,68,68,0.3)', cursor: 'pointer',
              }}
            >
              I understand, continue &rarr;
            </button>
          </div>
        </motion.div>
      )}

      {/* Confirm step */}
      {step === 'confirm' && (
        <motion.div
          key="confirm"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          style={{
            borderRadius: '16px',
            border: '1px solid rgba(239,68,68,0.35)',
            background: 'rgba(239,68,68,0.04)',
            padding: '24px',
          }}
        >
          <p style={{ fontSize: '14px', fontWeight: 700, color: '#fff', margin: '0 0 16px' }}>
            Final confirmation
          </p>

          {/* Reason (optional) */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>
              Why are you leaving? (optional)
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
              rows={2}
              placeholder="Your feedback helps us improve..."
              style={{
                width: '100%', padding: '10px 14px', borderRadius: '10px', fontSize: '13px',
                color: '#fff', background: 'rgba(255,255,255,0.04)',
                border: '0.5px solid rgba(255,255,255,0.1)', outline: 'none', resize: 'none',
                fontFamily: 'inherit',
              }}
            />
          </div>

          {/* Confirm text */}
          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: '6px' }}>
              Type <span style={{ color: '#EF4444', fontFamily: 'monospace' }}>delete my account</span> to confirm
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="delete my account"
              style={{
                width: '100%', padding: '12px 14px', borderRadius: '10px', fontSize: '13px',
                color: '#fff', fontFamily: 'monospace',
                background: 'rgba(239,68,68,0.06)',
                border: `1px solid ${isConfirmed ? 'rgba(239,68,68,0.6)' : 'rgba(255,255,255,0.1)'}`,
                outline: 'none',
              }}
            />
          </div>

          {error && (
            <p style={{
              fontSize: '12px', color: '#FCA5A5', marginBottom: '12px',
              padding: '10px 14px', borderRadius: '10px',
              background: 'rgba(239,68,68,0.1)', border: '0.5px solid rgba(239,68,68,0.25)',
            }}>
              {error}
            </p>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <button
              onClick={() => { setStep('idle'); setConfirmText(''); setError('') }}
              style={{
                flex: 1, padding: '12px', borderRadius: '10px', fontSize: '13px', fontWeight: 600,
                background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)',
                border: 'none', cursor: 'pointer',
              }}
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={!isConfirmed}
              style={{
                flex: 1, padding: '12px', borderRadius: '10px', fontSize: '13px', fontWeight: 700,
                background: isConfirmed ? '#EF4444' : 'rgba(239,68,68,0.2)',
                color: isConfirmed ? '#fff' : 'rgba(255,255,255,0.3)',
                border: 'none', cursor: isConfirmed ? 'pointer' : 'default',
                transition: 'all 0.2s',
              }}
            >
              Yes, delete everything &rarr;
            </button>
          </div>
        </motion.div>
      )}

      {/* Deleting step */}
      {step === 'deleting' && (
        <motion.div
          key="deleting"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          style={{
            borderRadius: '16px', padding: '32px', textAlign: 'center',
            background: 'rgba(239,68,68,0.04)', border: '1px solid rgba(239,68,68,0.2)',
          }}
        >
          <div style={{
            width: 32, height: 32, borderRadius: '50%', margin: '0 auto 16px',
            border: '3px solid rgba(239,68,68,0.2)', borderTopColor: '#EF4444',
            animation: 'spin 1s linear infinite',
          }} />
          <p style={{ fontSize: '14px', fontWeight: 600, color: '#fff', margin: '0 0 4px' }}>
            Deleting your account...
          </p>
          <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', margin: 0 }}>
            This may take a moment
          </p>
        </motion.div>
      )}

      {/* Done step */}
      {step === 'done' && (
        <motion.div
          key="done"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          style={{
            borderRadius: '16px', padding: '32px', textAlign: 'center',
            background: 'rgba(74,222,128,0.06)', border: '1px solid rgba(74,222,128,0.2)',
          }}
        >
          <p style={{ fontSize: '28px', margin: '0 0 12px' }}>&#x2713;</p>
          <p style={{ fontSize: '16px', fontWeight: 700, color: '#fff', margin: '0 0 8px' }}>
            Account deleted
          </p>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', margin: '0 0 4px' }}>
            A confirmation email has been sent. Redirecting...
          </p>
          <p style={{ fontSize: '11px', color: 'rgba(255,255,255,0.25)', margin: 0 }}>
            We&apos;re sorry to see you go. You can always create a new account.
          </p>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
