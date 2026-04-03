'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';

interface DeleteAccountModalProps {
  userId: string;
  onClose: () => void;
}

export default function DeleteAccountModal({ userId, onClose }: DeleteAccountModalProps) {
  const [checked, setChecked] = useState(false);
  const [confirmText, setConfirmText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const canSubmit = checked && confirmText.trim() === 'DELETE';

  async function handleDelete() {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const supabase = createClient();
      await supabase.from('dpdp_requests').insert({
        user_id: userId,
        request_type: 'delete',
        status: 'pending',
      });
      setDone(true);
      setTimeout(async () => {
        await supabase.auth.signOut();
      }, 5000);
    } catch (e) {
      console.error('Delete request failed:', e);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(6,15,29,0.9)', backdropFilter: 'blur(12px)' }}
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.92, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.92, opacity: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl p-7"
        style={{ background: '#0B1F3A', border: '1.5px solid rgba(239,68,68,0.35)' }}
      >
        {done ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-4">📬</div>
            <h3 className="font-playfair text-xl font-bold text-white mb-2">Deletion request received</h3>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Your account will be deleted within 30 days. You&apos;ll receive an email confirmation.
              Signing you out in 5 seconds...
            </p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-xl" style={{ background: 'rgba(239,68,68,0.15)' }}>
                ⚠️
              </div>
              <div>
                <h3 className="font-bold text-white">Delete my account</h3>
                <p className="text-xs" style={{ color: 'rgba(239,68,68,0.8)' }}>This is permanent</p>
              </div>
            </div>

            <div className="rounded-xl p-4 mb-5 space-y-1.5" style={{ background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
              <p className="text-xs font-semibold text-white mb-2">Deleting your account will:</p>
              {[
                'Remove all your personal data within 30 days',
                'Delete your soul profile permanently',
                'Cancel any active subscriptions',
                'This cannot be undone',
              ].map((item, i) => (
                <p key={i} className="text-xs flex gap-2" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  <span style={{ color: '#EF4444' }}>•</span> {item}
                </p>
              ))}
            </div>

            {/* Step 1 */}
            <label className="flex items-start gap-3 mb-4 cursor-pointer">
              <input
                type="checkbox"
                checked={checked}
                onChange={(e) => setChecked(e.target.checked)}
                className="mt-0.5 accent-red-500"
              />
              <span className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                I understand this cannot be undone
              </span>
            </label>

            {/* Step 2 */}
            <div className="mb-5">
              <label className="block text-xs font-semibold mb-1.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
                Type DELETE to confirm
              </label>
              <input
                type="text"
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none"
                style={{
                  background: 'rgba(239,68,68,0.06)',
                  border: `1px solid ${confirmText === 'DELETE' ? 'rgba(239,68,68,0.7)' : 'rgba(255,255,255,0.1)'}`,
                  fontFamily: 'monospace',
                }}
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="flex-1 rounded-xl py-3 text-sm font-semibold"
                style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={!canSubmit || submitting}
                className="flex-1 rounded-xl py-3 text-sm font-bold transition-all disabled:opacity-40"
                style={{ background: canSubmit ? '#EF4444' : 'rgba(239,68,68,0.3)', color: '#fff' }}
              >
                {submitting ? 'Processing...' : 'Delete my account'}
              </button>
            </div>
          </>
        )}
      </motion.div>
    </motion.div>
  );
}
