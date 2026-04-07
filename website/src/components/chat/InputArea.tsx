'use client'

import { useRef, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import type { QuotaState } from '@/types'
import { VoiceInput } from './VoiceInput'

type Props = {
  quota: QuotaState
  isStreaming: boolean
  primaryColor: string
  onSend: (text: string, imageBase64?: string) => Promise<void>
  inputValue: string
  setInputValue: (val: string) => void
  isLegalTheme?: boolean
}

const MAX_CHARS = 2000
const SHOW_COUNT_THRESHOLD = 1500

export function InputArea({
  quota,
  isStreaming,
  primaryColor,
  onSend,
  inputValue,
  setInputValue,
  isLegalTheme = false,
}: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [pendingImage, setPendingImage] = useState<string | null>(null)  // base64 data URL
  const isCooling = quota.isCooling
  const isOut = quota.remaining === 0 && !isCooling

  // Auto-resize textarea (max 5 lines ≈ 120px)
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [inputValue])

  function sanitise(raw: string): string {
    return raw.replace(/[<>]/g, '').slice(0, MAX_CHARS)
  }

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return
    const reader = new FileReader()
    reader.onload = () => setPendingImage(reader.result as string)
    reader.readAsDataURL(file)
    // reset input so same file can be re-selected
    e.target.value = ''
  }

  async function handleSend() {
    const text = inputValue.trim()
    if ((!text && !pendingImage) || isStreaming || isCooling || isOut) return
    const imageBase64 = pendingImage ?? undefined
    setPendingImage(null)
    await onSend(text || '📷 Sketch uploaded', imageBase64)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
      return
    }
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSend()
    }
  }

  // Cooling placeholder
  const placeholder = isCooling
    ? 'Chat resumes when the timer ends...'
    : isOut
      ? 'Daily limit reached — upgrade for more'
      : 'Ask your Saathi anything...'

  const disabled = isCooling || isOut || isStreaming

  return (
    <div
      className="shrink-0"
      style={{
        borderTop: isLegalTheme
          ? '1px solid #D0D0D0'
          : '0.5px solid rgba(255,255,255,0.07)',
        background: isLegalTheme
          ? '#F8F8F8'
          : 'var(--bg-tertiary, rgba(11,31,58,0.6))',
        backdropFilter: isLegalTheme ? 'none' : 'blur(12px)',
      }}
    >
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleImageSelect}
        style={{ display: 'none' }}
      />

      {/* Image preview */}
      {pendingImage && (
        <div className="flex items-center gap-2 px-4 pt-3">
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={pendingImage}
              alt="Sketch preview"
              style={{ height: '56px', width: '56px', objectFit: 'cover', borderRadius: '8px',
                border: `1px solid ${primaryColor}55` }}
            />
            <button
              onClick={() => setPendingImage(null)}
              style={{ position: 'absolute', top: '-6px', right: '-6px', width: '16px', height: '16px',
                borderRadius: '50%', background: '#EF4444', border: 'none', cursor: 'pointer',
                color: '#fff', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              ✕
            </button>
          </div>
          <p style={{ fontSize: '11px', color: isLegalTheme ? '#888' : 'rgba(255,255,255,0.4)' }}>
            Sketch ready — add a note or send now
          </p>
        </div>
      )}

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
          className="flex-1 resize-none rounded-xl px-4 py-3 text-sm transition-all outline-none"
          style={{
            background: isLegalTheme ? '#FFFFFF' : 'rgba(255,255,255,0.05)',
            border: isLegalTheme
              ? `1px solid #D0D0D0`
              : '0.5px solid rgba(255,255,255,0.1)',
            color: isLegalTheme ? '#1A1A1A' : '#ffffff',
            fontFamily: 'var(--font-dm-sans)',
            lineHeight: '1.5',
            maxHeight: 120,
            opacity: disabled ? 0.5 : 1,
          }}
          onFocus={(e) =>
            (e.currentTarget.style.borderColor = isLegalTheme
              ? '#1A1A1A'
              : 'rgba(201,153,58,0.5)')
          }
          onBlur={(e) =>
            (e.currentTarget.style.borderColor = isLegalTheme
              ? '#D0D0D0'
              : 'rgba(255,255,255,0.1)')
          }
        />

        {/* Sketch / image upload */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          title="Upload sketch"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            background: pendingImage
              ? `${primaryColor}33`
              : isLegalTheme ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.06)',
            border: pendingImage
              ? `1px solid ${primaryColor}66`
              : isLegalTheme ? '1px solid #D0D0D0' : '0.5px solid rgba(255,255,255,0.1)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke={pendingImage ? primaryColor : isLegalTheme ? '#555' : 'rgba(255,255,255,0.4)'}
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
            <circle cx="8.5" cy="8.5" r="1.5"/>
            <polyline points="21 15 16 10 5 21"/>
          </svg>
        </button>

        {/* Voice input */}
        <VoiceInput
          onTranscript={(text) =>
            setInputValue(inputValue ? `${inputValue} ${text}` : text)
          }
          disabled={disabled}
          saathiColor={primaryColor}
          isLegalTheme={isLegalTheme}
        />

        {/* Send button */}
        <motion.button
          onClick={handleSend}
          disabled={disabled || !inputValue.trim()}
          whileTap={!disabled ? { scale: 0.92 } : {}}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-40"
          style={{ background: primaryColor }}
        >
          {isStreaming ? (
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          ) : (
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
          )}
        </motion.button>
      </div>

      {/* Status row */}
      <div className="flex items-center justify-between gap-4 px-5 pb-3">
        <p
          className="text-[10px]"
          style={{ color: isLegalTheme ? '#AAAAAA' : 'rgba(255,255,255,0.2)' }}
        >
          Enter to send · Shift+Enter for new line
        </p>
        <div className="flex items-center gap-3">
          {inputValue.length > SHOW_COUNT_THRESHOLD && (
            <span
              className="text-[10px] tabular-nums"
              style={{
                color:
                  inputValue.length > MAX_CHARS - 100
                    ? '#FCA5A5'
                    : isLegalTheme
                      ? '#AAAAAA'
                      : 'rgba(255,255,255,0.25)',
              }}
            >
              {inputValue.length.toLocaleString()} /{' '}
              {MAX_CHARS.toLocaleString()}
            </span>
          )}
          {!isCooling && quota.remaining <= 14 && quota.remaining > 0 && (
            <span
              className="text-[10px]"
              style={{
                color: isLegalTheme ? '#AAAAAA' : 'rgba(255,255,255,0.25)',
              }}
            >
              {quota.remaining} chats remaining today
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
