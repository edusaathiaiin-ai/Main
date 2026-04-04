'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import type { BoardQuestion } from '@/types';

function Badge({ children, variant = 'gold' }: { children: React.ReactNode; variant?: 'gold' | 'green' | 'saathi' | 'mine' }) {
  const styles: Record<string, React.CSSProperties> = {
    gold:   { background: 'rgba(201,153,58,0.15)',  border: '0.5px solid rgba(201,153,58,0.4)',  color: '#C9993A' },
    green:  { background: 'rgba(34,197,94,0.1)',    border: '0.5px solid rgba(34,197,94,0.35)',  color: '#4ADE80' },
    saathi: { background: 'rgba(79,70,229,0.12)',   border: '0.5px solid rgba(79,70,229,0.3)',   color: '#818CF8' },
    mine:   { background: 'rgba(201,153,58,0.12)',  border: '0.5px solid rgba(201,153,58,0.3)',  color: '#C9993A' },
  };
  return (
    <span
      className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full"
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
  isLegalTheme?: boolean;
};

export function QuestionCard({ question, currentUserId, primaryColor, isLegalTheme = false }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [flagged, setFlagged] = useState(false);
  const [hovered, setHovered] = useState(false);

  const isOwn = !!currentUserId && question.user_id === currentUserId;

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
      target_id: question.id,
      target_type: 'board_question',
      reporter_user_id: currentUserId,
      reason: 'user_flag',
    });
    setFlagged(true);
  }

  const hasAnswer = !!question.aiAnswer || (question.answer_count ?? 0) > 0;

  return (
    <motion.article
      id={`question-${question.id}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      animate={{ y: hovered ? -2 : 0 }}
      transition={{ duration: 0.15 }}
      className="relative rounded-2xl p-5 mb-3 transition-all duration-200"
      style={{
        background: isLegalTheme ? '#FFFFFF' : '#0A1929',
        border: isLegalTheme
          ? `1px solid ${hovered ? '#BBBBBB' : '#E0E0E0'}`
          : `0.5px solid ${hovered ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.06)'}`,
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
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-xs font-semibold" style={{ color: isLegalTheme ? '#1A1A1A' : '#ffffff' }}>
                {question.is_anonymous ? 'Anonymous Student' : (question.authorName ?? 'Student')}
              </span>
              {isOwn && (
                <span
                  className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full"
                  style={isLegalTheme
                    ? { background: '#F0F0F0', border: '0.5px solid #D0D0D0', color: '#555555' }
                    : { background: 'rgba(201,153,58,0.12)', border: '0.5px solid rgba(201,153,58,0.3)', color: '#C9993A' }
                  }
                >
                  Your question
                </span>
              )}
              {question.authorRole === 'faculty' && <Badge variant="green">✓ Faculty</Badge>}
              {question.facultyVerified && (
                isLegalTheme
                  ? <span className="inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: '#1A1A1A', color: '#FFFFFF', border: '0.5px solid #1A1A1A' }}>Faculty Verified ✓</span>
                  : <Badge variant="green">✓ Verified</Badge>
              )}
            </div>
            <p className="text-[10px]" style={{ color: isLegalTheme ? '#AAAAAA' : 'rgba(255,255,255,0.3)' }}>
              {timeAgo(question.created_at)}
            </p>
          </div>
        </div>

        {/* Topic tag */}
        {question.tags?.[0] && (
          <span
            className="text-[10px] font-semibold px-2.5 py-1 rounded-full"
            style={isLegalTheme
              ? { background: '#F0F0F0', color: '#555555', border: '0.5px solid #D0D0D0' }
              : { background: `${primaryColor}1a`, color: primaryColor }
            }
          >
            {question.tags[0]}
          </span>
        )}
      </div>

      {/* Question title */}
      <h3 className="font-playfair text-[17px] font-medium mb-3 leading-snug" style={{ color: isLegalTheme ? '#1A1A1A' : '#ffffff' }}>
        {question.title}
      </h3>

      {/* AI Answer */}
      {question.aiAnswer && (
        <div
          className="mb-3 pl-3 py-2 rounded-r-xl"
          style={isLegalTheme
            ? { borderLeft: '3px solid #1A1A1A', background: '#FFFEF5' }
            : { borderLeft: `2px solid ${primaryColor}66`, background: `${primaryColor}09` }
          }
        >
          <p className="text-[11px] font-semibold mb-1" style={{ color: isLegalTheme ? '#1A1A1A' : primaryColor }}>
            AI Answer ✦
          </p>
          <AnimatePresence initial={false}>
            <motion.p
              className="text-xs leading-relaxed overflow-hidden"
              style={{ color: isLegalTheme ? '#444444' : 'rgba(255,255,255,0.6)', maxHeight: expanded ? 500 : 60, overflow: 'hidden' }}
              animate={{ maxHeight: expanded ? 500 : 60 }}
              transition={{ duration: 0.3 }}
            >
              {question.aiAnswer}
            </motion.p>
          </AnimatePresence>
          {question.aiAnswer.length > 200 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-[10px] font-semibold mt-1 transition-colors"
              style={{ color: isLegalTheme ? '#1A1A1A' : primaryColor }}
            >
              {expanded ? 'Show less ↑' : 'Read more →'}
            </button>
          )}
        </div>
      )}

      {/* Awaiting answer indicator — only for own unanswered questions */}
      {isOwn && !hasAnswer && (
        <div className="mb-3 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          <span className="text-[10px]" style={{ color: isLegalTheme ? '#AAAAAA' : 'rgba(255,255,255,0.35)' }}>
            Awaiting AI answer…
          </span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[11px]" style={{ color: isLegalTheme ? '#AAAAAA' : 'rgba(255,255,255,0.3)' }}>
            {question.answer_count ?? 0} {question.answer_count === 1 ? 'answer' : 'answers'}
          </span>
          {isOwn && hasAnswer && (
            <span className="text-[10px] font-semibold" style={{ color: '#4ADE80' }}>
              ✓ Answered
            </span>
          )}
        </div>

        {/* Flag (hover reveal) — only for other people's questions */}
        <AnimatePresence>
          {!isOwn && (hovered || flagged) && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={handleFlag}
              className="text-xs px-2 py-1 rounded-lg transition-colors"
              style={{
                color: flagged ? '#FCA5A5' : (isLegalTheme ? '#BBBBBB' : 'rgba(255,255,255,0.2)'),
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
