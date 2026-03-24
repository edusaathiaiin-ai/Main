'use client';

import { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { QuotaState } from '@/types';

type Props = {
  quota: QuotaState;
  isStreaming: boolean;
  primaryColor: string;
  apiProvider: 'Claude' | 'Groq';
  onSend: (text: string) => Promise<void>;
  inputValue: string;
  setInputValue: (val: string) => void;
};

const MAX_CHARS = 2000;
const SHOW_COUNT_THRESHOLD = 1500;

export function InputArea({
  quota,
  isStreaming,
  primaryColor,
  apiProvider,
  onSend,
  inputValue,
  setInputValue,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isCooling = quota.isCooling;
  const isOut = quota.remaining === 0 && !isCooling;

  // Auto-resize textarea (max 5 lines ≈ 120px)
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = Math.min(el.scrollHeight, 120) + 'px';
  }, [inputValue]);

  function sanitise(raw: string): string {
    return raw.replace(/[<>]/g, '').slice(0, MAX_CHARS);
  }

  async function handleSend() {
    const text = inputValue.trim();
    if (!text || isStreaming || isCooling || isOut) return;
    await onSend(text);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      handleSend();
    }
  }

  // Cooling placeholder
  const placeholder = isCooling
    ? 'Chat resumes when the timer ends...'
    : isOut
    ? 'Daily limit reached — upgrade for more'
    : 'Ask your Saathi anything...';

  const disabled = isCooling || isOut || isStreaming;

  return (
    <div
      className="shrink-0"
      style={{
        borderTop: '0.5px solid rgba(255,255,255,0.07)',
        background: 'rgba(11,31,58,0.6)',
        backdropFilter: 'blur(12px)',
      }}
    >
      {/* Main input row */}
      <div className="flex items-end gap-3 px-4 py-3">
        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={(e) => setInputValue(sanitise(e.target.value))}
          onKeyDown={onKeyDown}
          placeholder={placeholder}
          disabled={disabled}
          rows={1}
          className="flex-1 resize-none rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '0.5px solid rgba(255,255,255,0.1)',
            fontFamily: 'var(--font-dm-sans)',
            lineHeight: '1.5',
            maxHeight: 120,
            opacity: disabled ? 0.5 : 1,
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(201,153,58,0.5)')}
          onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
        />

        {/* Send button */}
        <motion.button
          onClick={handleSend}
          disabled={disabled || !inputValue.trim()}
          whileTap={!disabled ? { scale: 0.92 } : {}}
          className="shrink-0 w-10 h-10 rounded-xl flex items-center justify-center transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed"
          style={{ background: primaryColor }}
        >
          {isStreaming ? (
            <span
              className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin"
            />
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          )}
        </motion.button>
      </div>

      {/* Status row */}
      <div className="flex items-center justify-between px-5 pb-3 gap-4">
        <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.2)' }}>
          Powered by {apiProvider} · ⌘↵ to send
        </p>
        <div className="flex items-center gap-3">
          {inputValue.length > SHOW_COUNT_THRESHOLD && (
            <span
              className="text-[10px] tabular-nums"
              style={{ color: inputValue.length > MAX_CHARS - 100 ? '#FCA5A5' : 'rgba(255,255,255,0.25)' }}
            >
              {inputValue.length.toLocaleString()} / {MAX_CHARS.toLocaleString()}
            </span>
          )}
          {!isCooling && quota.remaining <= 14 && quota.remaining > 0 && (
            <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
              {quota.remaining} chats remaining today
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
