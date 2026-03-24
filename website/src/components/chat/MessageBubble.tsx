'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { ChatMessage } from '@/types';

type Props = {
  message: ChatMessage;
  isStreaming?: boolean;
  streamingText?: string;
  botName?: string;
  showBotLabel?: boolean;
  onFlag?: (messageId: string) => void;
  primaryColor?: string;
};

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });
}

function TypingCursor() {
  return (
    <motion.span
      className="inline-block w-0.5 h-4 ml-0.5 rounded-sm align-middle"
      style={{ background: 'rgba(255,255,255,0.6)' }}
      animate={{ opacity: [1, 0] }}
      transition={{ repeat: Infinity, duration: 0.7, ease: 'easeInOut' }}
    />
  );
}

function ThreeDots() {
  return (
    <span className="flex items-center gap-1 py-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-2 h-2 rounded-full"
          style={{ background: 'rgba(255,255,255,0.5)' }}
          animate={{ scale: [1, 1.4, 1], opacity: [0.5, 1, 0.5] }}
          transition={{ repeat: Infinity, duration: 1.2, delay: i * 0.2 }}
        />
      ))}
    </span>
  );
}

export function MessageBubble({
  message,
  isStreaming,
  streamingText,
  botName,
  showBotLabel,
  onFlag,
  primaryColor = '#C9993A',
}: Props) {
  const [hovered, setHovered] = useState(false);
  const isUser = message.role === 'user';

  // Displayed text — use streamingText for the active assistant message
  const displayText = isStreaming && !isUser ? (streamingText ?? '') : message.content;
  const isEmpty = !displayText && isStreaming;

  return (
    <div className={`flex flex-col ${isUser ? 'items-end' : 'items-start'} gap-1 mb-3`}>
      {/* Bot label (first in sequence) */}
      {!isUser && showBotLabel && botName && (
        <span className="text-[11px] font-medium ml-1 mb-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {botName}
        </span>
      )}

      <div
        className="relative group"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <motion.div
          initial={{ opacity: 0, y: 6, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.2 }}
          className="px-4 py-3 text-[15px] leading-relaxed max-w-[70%] break-words"
          style={
            isUser
              ? {
                  background: primaryColor,
                  color: '#060F1D',
                  borderRadius: '18px 18px 4px 18px',
                  fontFamily: 'var(--font-dm-sans)',
                  fontWeight: 500,
                }
              : {
                  background: '#0F2847',
                  color: '#fff',
                  borderRadius: '4px 18px 18px 18px',
                  fontFamily: 'var(--font-dm-sans)',
                  maxWidth: '75%',
                  border: '0.5px solid rgba(255,255,255,0.07)',
                }
          }
        >
          {isEmpty ? (
            <ThreeDots />
          ) : (
            <>
              <span className="whitespace-pre-wrap">{displayText}</span>
              {isStreaming && !isUser && <TypingCursor />}
            </>
          )}
        </motion.div>

        {/* Flag button (assistant only, on hover) */}
        {!isUser && !isStreaming && onFlag && hovered && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={() => onFlag(message.id)}
            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs"
            style={{ background: 'rgba(239,68,68,0.15)', border: '0.5px solid rgba(239,68,68,0.3)' }}
            title="Flag this message"
          >
            🚩
          </motion.button>
        )}
      </div>

      {/* Timestamp */}
      {!isStreaming && (
        <span className="text-[10px] mx-1" style={{ color: 'rgba(255,255,255,0.2)' }}>
          {formatTime(message.createdAt)}
        </span>
      )}
    </div>
  );
}
