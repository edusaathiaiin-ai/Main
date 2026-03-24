'use client';

import { motion } from 'framer-motion';
import type { NewsItem } from '@/types';

// Extended with DB fields not yet in type
type ExtendedNewsItem = NewsItem & {
  item_type?: string;
  category?: string;
  tags?: string[];
  isResearchArea?: boolean;
};

type Props = {
  item: ExtendedNewsItem;
  primaryColor: string;
  bgColor: string;
  index: number;
};

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export function NewsCard({ item, primaryColor, bgColor, index }: Props) {
  const isResearch = item.item_type === 'research';

  function handleOpen() {
    if (item.url) window.open(item.url, '_blank', 'noopener,noreferrer');
  }

  return (
    <motion.article
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      whileHover={{ y: -3, transition: { duration: 0.18 } }}
      onClick={handleOpen}
      className="rounded-2xl p-5 flex flex-col gap-3 transition-shadow duration-200 cursor-pointer"
      style={{
        background: `${bgColor}20`,
        border: `0.5px solid ${primaryColor}33`,
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 6px 24px rgba(0,0,0,0.3)')}
      onMouseLeave={(e) => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)')}
    >
      {/* Top row: source + chip */}
      <div className="flex items-center justify-between gap-2">
        <span
          className="text-[10px] font-bold tracking-widest uppercase truncate"
          style={{ color: 'rgba(255,255,255,0.35)' }}
        >
          {item.source}
        </span>
        {isResearch ? (
          <span
            className="shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(139,92,246,0.15)', border: '0.5px solid rgba(139,92,246,0.35)', color: '#A78BFA' }}
          >
            Research Paper
          </span>
        ) : item.category ? (
          <span
            className="shrink-0 text-[9px] font-bold px-2 py-0.5 rounded-full"
            style={{ background: `${primaryColor}18`, border: `0.5px solid ${primaryColor}44`, color: primaryColor }}
          >
            {item.category}
          </span>
        ) : null}
      </div>

      {/* Headline */}
      <h3
        className="text-sm font-semibold text-white leading-snug line-clamp-3"
        style={{ fontFamily: 'var(--font-dm-sans)' }}
      >
        {item.title}
      </h3>

      {/* Summary (research papers show it) */}
      {isResearch && item.summary && (
        <p className="text-xs leading-relaxed line-clamp-2" style={{ color: 'rgba(255,255,255,0.45)' }}>
          {item.summary}
        </p>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-auto">
        <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.28)' }}>
          {timeAgo(item.fetched_at)}
        </span>
        <div className="flex items-center gap-2">
          {item.isResearchArea && (
            <span
              className="text-[9px] font-bold px-2 py-0.5 rounded-full"
              style={{
                background: isResearch ? 'rgba(34,197,94,0.12)' : 'rgba(201,153,58,0.15)',
                border: isResearch ? '0.5px solid rgba(34,197,94,0.35)' : '0.5px solid rgba(201,153,58,0.4)',
                color: isResearch ? '#4ADE80' : '#C9993A',
              }}
            >
              Your Research Area ✦
            </span>
          )}
          {item.url && (
            <span className="text-[11px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
              ↗
            </span>
          )}
        </div>
      </div>
    </motion.article>
  );
}
