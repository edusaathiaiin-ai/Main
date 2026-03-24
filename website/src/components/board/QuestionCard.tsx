'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import type { BoardQuestion } from '@/types';

// ── Inline micro UI primitives ──────────────────────────────────────────────
// (Shadcn-style but without the installation dependency on Tailwind v4 config)

function Badge({ children, variant = 'gold' }: { children: React.ReactNode; variant?: 'gold' | 'green' | 'saathi' }) {
  const styles: Record<string, React.CSSProperties> = {
    gold: { background: 'rgba(201,153,58,0.15)', border: '0.5px solid rgba(201,153,58,0.4)', color: '#C9993A' },
    green: { background: 'rgba(34,197,94,0.1)', border: '0.5px solid rgba(34,197,94,0.35)', color: '#4ADE80' },
    saathi: { background: 'rgba(79,70,229,0.12)', border: '0.5px solid rgba(79,70,229,0.3)', color: '#818CF8' },
  };
  return (
    <span
      className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={styles[variant]}
    >
      {children}
    </span>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

type QuestionWithMeta = BoardQuestion & {
  authorName?: string;
  authorRole?: string;
  aiAnswer?: string | null;
  facultyVerified?: boolean;
};

type Props = {
  question: QuestionWithMeta;
  currentUserId?: string;
  primaryColor: string;
};

export function QuestionCard({ question, currentUserId: _currentUserId, primaryColor }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [flagged, setFlagged] = useState(false);
  const [hovered, setHovered] = useState(false);

  const initials = question.is_anonymous
    ? 'A'
    : (question.authorName ?? 'U')[0].toUpperCase();

  const roleColor =
    question.authorRole === 'faculty' ? '#16A34A'
    : question.authorRole === 'student' ? '#4F46E5'
    : '#6B7280';

  async function handleFlag() {
    if (flagged) return;
    const supabase = createClient();
    await supabase.from('moderation_flags').insert({
      question_id: question.id,
      user_id: _currentUserId,
      reason: 'user_flag',
    });
    setFlagged(true);
  }

  return (
    <motion.article
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      animate={{ y: hovered ? -2 : 0 }}
      transition={{ duration: 0.15 }}
      className="relative rounded-2xl p-5 mb-3 transition-all duration-200"
      style={{
        background: '#0A1929',
        border: `0.5px solid ${hovered ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)'}`,
      }}
    >
      {/* Author row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div
            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
            style={{ background: `${roleColor}22`, border: `0.5px solid ${roleColor}55`, color: roleColor }}
          >
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-white">
                {question.is_anonymous ? 'Anonymous Student' : (question.authorName ?? 'Student')}
              </span>
              {question.authorRole === 'faculty' && (
                <Badge variant="green">✓ Faculty</Badge>
              )}
              {question.facultyVerified && (
                <Badge variant="green">✓ Verified</Badge>
              )}
            </div>
            <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
              {timeAgo(question.created_at)}
            </p>
          </div>
        </div>

        {/* Topic tag */}
        {question.tags?.[0] && (
          <span
            className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
            style={{ background: `${primaryColor}1a`, color: primaryColor }}
          >
            {question.tags[0]}
          </span>
        )}
      </div>

      {/* Question title */}
      <h3 className="font-playfair text-[17px] font-medium text-white mb-3 leading-snug">
        {question.title}
      </h3>

      {/* AI Answer */}
      {question.aiAnswer && (
        <div
          className="mb-3 pl-3 py-2 rounded-r-xl"
          style={{
            borderLeft: `2px solid ${primaryColor}66`,
            background: `${primaryColor}09`,
          }}
        >
          <p className="text-[11px] font-semibold mb-1" style={{ color: primaryColor }}>
            AI Answer ✦
          </p>
          <AnimatePresence initial={false}>
            <motion.p
              className="text-xs text-white/60 leading-relaxed overflow-hidden"
              animate={{ maxHeight: expanded ? 500 : 60 }}
              transition={{ duration: 0.3 }}
              style={{ maxHeight: expanded ? 500 : 60, overflow: 'hidden' }}
            >
              {question.aiAnswer}
            </motion.p>
          </AnimatePresence>
          {question.aiAnswer.length > 200 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-[10px] font-semibold mt-1 transition-colors"
              style={{ color: primaryColor }}
            >
              {expanded ? 'Show less ↑' : 'Read more →'}
            </button>
          )}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
          {question.answer_count ?? 0} {question.answer_count === 1 ? 'answer' : 'answers'}
        </span>

        {/* Flag (hover reveal) */}
        <AnimatePresence>
          {(hovered || flagged) && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={handleFlag}
              className="text-xs px-2 py-1 rounded-lg transition-colors"
              style={{
                color: flagged ? '#FCA5A5' : 'rgba(255,255,255,0.2)',
                background: flagged ? 'rgba(239,68,68,0.1)' : 'transparent',
              }}
              title={flagged ? 'Flagged' : 'Flag this question'}
            >
              {flagged ? '🚩 Flagged' : '🚩'}
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </motion.article>
  );
}
