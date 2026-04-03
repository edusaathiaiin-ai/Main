'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/types';

// ── Per-Saathi topic tags ──────────────────────────────────────────────────────

const SAATHI_TAGS: Record<string, string[]> = {
  kanoonsaathi: ['Constitutional Law', 'IPC / BNSS', 'Civil Law', 'Criminal Law', 'UPSC Law', 'Other'],
  mathsaathi: ['Calculus', 'Algebra', 'Statistics', 'Geometry', 'Number Theory', 'Other'],
  sciencesaathi: ['Physics', 'Chemistry', 'Biology', 'Environmental Science', 'Research Methods', 'Other'],
  historysaathi: ['Ancient India', 'Medieval India', 'Modern India', 'World History', 'UPSC History', 'Other'],
  geosaathi: ['Physical Geography', 'Human Geography', 'Indian Geography', 'Maps', 'UPSC Geo', 'Other'],
  ecoSaathi: ['Microeconomics', 'Macroeconomics', 'Indian Economy', 'Development', 'Policy', 'Other'],
};

const DEFAULT_TAGS = ['Concept', 'Theory', 'Practice', 'Exam Prep', 'Fast Answer', 'Other'];

// ── Inline Dialog primitive ───────────────────────────────────────────────────

function DialogOverlay({ onClose }: { onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="fixed inset-0 z-40"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(6px)' }}
    />
  );
}

type Props = {
  open: boolean;
  onClose: () => void;
  saathiId: string;
  saathiName: string;
  primaryColor: string;
  profile: Profile;
  onPosted: (newId: string) => void;
};

export function PostQuestionModal({
  open,
  onClose,
  saathiId,
  saathiName,
  primaryColor,
  profile,
  onPosted,
}: Props) {
  const [title, setTitle] = useState('');
  const [tag, setTag] = useState('');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const tags = SAATHI_TAGS[saathiId] ?? DEFAULT_TAGS;
  const MAX_TITLE = 200;

  async function handleSubmit() {
    if (!title.trim() || submitting) return;
    setSubmitting(true);
    setError(null);

    // 24-hour new account restriction
    const registeredAt = new Date(profile.registered_at);
    const hoursSinceRegistration = (Date.now() - registeredAt.getTime()) / (1000 * 60 * 60);
    if (hoursSinceRegistration < 24) {
      const hoursLeft = Math.ceil(24 - hoursSinceRegistration);
      setError(`Board posting unlocks ${hoursLeft} hour${hoursLeft === 1 ? '' : 's'} after registration. Keep learning in the meantime!`);
      setSubmitting(false);
      return;
    }

    const supabase = createClient();
    const { data: session } = await supabase.auth.getSession();
    if (!session.session) { setError('Not logged in'); setSubmitting(false); return; }

    const { data: q, error: err } = await supabase
      .from('board_questions')
      .insert({
        user_id: profile.id,
        vertical_id: saathiId,
        title: title.trim(),
        body: '',
        tags: tag ? [tag] : [],
        is_anonymous: isAnonymous,
        status: 'open',
      })
      .select('id')
      .single();

    if (err || !q) {
      setError(err?.message ?? 'Failed to post. Try again.');
      setSubmitting(false);
      return;
    }

    // Trigger AI auto-answer (fire and forget)
    fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/board-answer`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.session.access_token}`,
        },
        body: JSON.stringify({ questionId: q.id, saathiId }),
      }
    ).catch(() => {}); // non-blocking

    onPosted(q.id);
    setTitle('');
    setTag('');
    setIsAnonymous(false);
    setSubmitting(false);
    onClose();
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          <DialogOverlay onClose={onClose} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 12 }}
            transition={{ type: 'spring', stiffness: 320, damping: 28 }}
            className="fixed inset-x-4 top-1/2 -translate-y-1/2 z-50 mx-auto max-w-lg rounded-3xl p-7"
            style={{
              background: 'linear-gradient(160deg,#0B1F3A 0%,#060F1D 100%)',
              border: '0.5px solid rgba(255,255,255,0.1)',
              boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
            }}
          >
            {/* Close */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 rounded-full flex items-center justify-center text-sm"
              style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}
            >
              ✕
            </button>

            <h2 className="font-playfair text-2xl font-bold text-white mb-1">
              Ask {saathiName}
            </h2>
            <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>
              Your question will get an AI answer immediately, and community members can reply.
            </p>

            {/* Title textarea */}
            <div className="mb-4">
              <div className="flex justify-between mb-1.5">
                <label className="text-xs font-medium" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Your question <span style={{ color: primaryColor }}>*</span>
                </label>
                <span className="text-[10px]" style={{ color: title.length > MAX_TITLE - 30 ? '#FCA5A5' : 'rgba(255,255,255,0.25)' }}>
                  {title.length} / {MAX_TITLE}
                </span>
              </div>
              <textarea
                value={title}
                onChange={(e) => setTitle(e.target.value.slice(0, MAX_TITLE))}
                placeholder="What would you like to understand or discuss?"
                rows={3}
                className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all resize-none"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '0.5px solid rgba(255,255,255,0.1)',
                  fontFamily: 'var(--font-dm-sans)',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = `${primaryColor}80`)}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
            </div>

            {/* Topic tag */}
            <div className="mb-5">
              <p className="text-xs font-medium mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Topic tag
              </p>
              <div className="flex flex-wrap gap-2">
                {tags.map((t) => {
                  const active = tag === t;
                  return (
                    <button
                      key={t}
                      onClick={() => setTag(active ? '' : t)}
                      className="px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150"
                      style={{
                        background: active ? primaryColor : 'rgba(255,255,255,0.05)',
                        border: `0.5px solid ${active ? primaryColor : 'rgba(255,255,255,0.1)'}`,
                        color: active ? '#060F1D' : 'rgba(255,255,255,0.55)',
                      }}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Anonymous toggle */}
            <div className="flex items-center justify-between mb-6 py-3 px-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.07)' }}>
              <div>
                <p className="text-sm text-white font-medium">Post anonymously</p>
                <p className="text-[11px]" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Shows as &quot;Anonymous Student&quot;
                </p>
              </div>
              <button
                onClick={() => setIsAnonymous(!isAnonymous)}
                className="w-11 h-6 rounded-full transition-all duration-200 relative"
                style={{ background: isAnonymous ? primaryColor : 'rgba(255,255,255,0.12)' }}
              >
                <div
                  className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all duration-200"
                  style={{ left: isAnonymous ? '1.5rem' : '0.25rem' }}
                />
              </button>
            </div>

            {/* Error */}
            {error && (
              <p className="text-xs mb-4" style={{ color: '#FCA5A5' }}>⚠️ {error}</p>
            )}

            {/* Submit */}
            <button
              onClick={handleSubmit}
              disabled={!title.trim() || submitting}
              className="w-full rounded-xl py-3.5 text-base font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: primaryColor, color: '#060F1D' }}
            >
              {submitting ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 rounded-full border-2 border-[#060F1D]/30 border-t-[#060F1D] animate-spin" />
                  Posting...
                </span>
              ) : 'Post Question →'}
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
