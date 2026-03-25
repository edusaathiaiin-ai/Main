'use client';

import { useState, useCallback } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { SAATHIS } from '@/constants/saathis';
import type { SaathiWithDescription } from '@/constants/saathis';

const SPRING = { type: 'spring', stiffness: 300, damping: 25 } as const;

function SaathiCard({
  saathi,
  isActive,
  onEnter,
  onLeave,
  onClick,
}: {
  saathi: SaathiWithDescription;
  isActive: boolean;
  onEnter: () => void;
  onLeave: () => void;
  onClick: () => void;
}) {
  const primaryRgb = saathi.primary;

  return (
    <motion.div
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
      onClick={onClick}
      animate={{
        scale: isActive ? 1.04 : 1,
        backgroundColor: isActive ? `${primaryRgb}26` : 'rgba(255,255,255,0.03)',
        borderColor: isActive ? `${primaryRgb}99` : 'rgba(255,255,255,0.07)',
        boxShadow: isActive
          ? `0 20px 60px ${primaryRgb}33`
          : '0 0 0 transparent',
      }}
      transition={SPRING}
      style={{
        border: '0.5px solid rgba(255,255,255,0.07)',
        borderRadius: '16px',
        padding: '24px 20px',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden',
        display: 'block',
      }}
    >
      {/* Breathing green dot — shown on all live Saathis (all 24) */}
      {saathi.isLive && (
        <span style={{
          position: 'absolute', top: '12px', right: '12px',
          width: '8px', height: '8px', borderRadius: '50%',
          background: '#4ADE80',
          boxShadow: '0 0 0 0 rgba(74,222,128,0.6)',
          animation: 'saathi-pulse 2s ease-in-out infinite',
        }} />
      )}

      {/* Emoji */}
      <motion.span
        animate={{ fontSize: isActive ? '40px' : '28px' }}
        transition={SPRING}
        style={{ display: 'block', marginBottom: isActive ? '14px' : '12px', lineHeight: 1.2 }}
      >
        {saathi.emoji}
      </motion.span>

      {/* Name */}
      <div style={{
        fontSize: '14px',
        fontWeight: 600,
        color: isActive ? '#fff' : 'rgba(255,255,255,0.85)',
        marginBottom: '4px',
        transition: 'color 0.2s',
      }}>
        {saathi.name}
      </div>

      {/* Tagline — hidden when active */}
      <AnimatePresence>
        {!isActive && (
          <motion.div
            key="tagline"
            initial={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', lineHeight: 1.5, overflow: 'hidden' }}
          >
            {saathi.tagline}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Expanded content */}
      <AnimatePresence>
        {isActive && (
          <motion.div
            key="expanded"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            {/* Description */}
            <motion.p
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05, duration: 0.2 }}
              style={{
                fontSize: '12px',
                color: 'rgba(255,255,255,0.65)',
                lineHeight: 1.65,
                marginTop: '10px',
                marginBottom: '0',
              }}
            >
              {saathi.description}
            </motion.p>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.2 }}
            >
              <Link
                href={`/login?role=student&saathi=${encodeURIComponent(saathi.id)}`}
                onClick={(e) => e.stopPropagation()}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  color: saathi.accent,
                  fontSize: '13px',
                  fontWeight: 600,
                  fontFamily: 'var(--font-playfair, "Playfair Display", serif)',
                  fontStyle: 'italic',
                  textDecoration: 'none',
                  marginTop: '14px',
                  borderBottom: `1px solid ${saathi.accent}40`,
                  paddingBottom: '2px',
                }}
              >
                Can I be your Saathi? →
              </Link>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function SaathiGrid() {
  const [activeId, setActiveId] = useState<string | null>(null);

  const handleEnter = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  const handleLeave = useCallback(() => {
    setActiveId(null);
  }, []);

  const handleClick = useCallback((id: string) => {
    setActiveId((prev) => (prev === id ? null : id));
  }, []);

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '12px',
      }}
      className="saathi-grid-responsive"
    >
      {SAATHIS.map((s) => (
        <SaathiCard
          key={s.id}
          saathi={s}
          isActive={activeId === s.id}
          onEnter={() => handleEnter(s.id)}
          onLeave={handleLeave}
          onClick={() => handleClick(s.id)}
        />
      ))}
    </div>
  );
}
