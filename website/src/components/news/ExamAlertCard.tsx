'use client';

import { motion } from 'framer-motion';

export type ExamAlert = {
  id: string;
  vertical_id: string;
  exam_name: string;
  exam_date: string;
  source_url: string | null;
  notes: string | null;
};

type Props = {
  exam: ExamAlert;
  index: number;
};

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr);
  const now = new Date();
  target.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / 86400000);
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export function ExamAlertCard({ exam, index }: Props) {
  const days = daysUntil(exam.exam_date);
  const isUrgent = days <= 7;
  const isWarning = days <= 30 && !isUrgent;

  const countdownColor = isUrgent ? '#EF4444' : isWarning ? '#F59E0B' : '#6B7280';
  const countdownText = days === 0 ? 'Today!' : days === 1 ? 'Tomorrow!' : `in ${days} days`;

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      className="rounded-2xl p-5 flex items-start gap-4"
      style={{
        background: isUrgent ? 'rgba(239,68,68,0.08)' : 'rgba(245,158,11,0.08)',
        border: `0.5px solid ${isUrgent ? 'rgba(239,68,68,0.35)' : 'rgba(245,158,11,0.4)'}`,
      }}
    >
      {/* Calendar icon */}
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center text-2xl shrink-0"
        style={{
          background: isUrgent ? 'rgba(239,68,68,0.15)' : 'rgba(245,158,11,0.15)',
        }}
      >
        📅
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-bold text-white mb-1 leading-tight">
          {exam.exam_name}
        </h3>
        <p className="text-xs mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
          {formatDate(exam.exam_date)}
        </p>
        {exam.notes && (
          <p className="text-[11px] mb-2 line-clamp-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {exam.notes}
          </p>
        )}
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold" style={{ color: countdownColor }}>
            {countdownText}
          </span>
          {exam.source_url && (
            <a
              href={exam.source_url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-[10px] font-semibold transition-colors"
              style={{ color: 'rgba(255,255,255,0.35)' }}
              onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
              onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
            >
              Official site ↗
            </a>
          )}
        </div>
      </div>
    </motion.article>
  );
}
