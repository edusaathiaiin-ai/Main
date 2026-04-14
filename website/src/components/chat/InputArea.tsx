'use client'

import { useRef, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
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
  const [isReceivingPrompt, setIsReceivingPrompt] = useState(false)
  const [showHint, setShowHint]                   = useState(false)
  const isCooling = quota.isCooling
  const isOut = quota.remaining === 0 && !isCooling

  // Auto-resize textarea (max 5 lines ≈ 120px)
  useEffect(() => {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 120) + 'px'
  }, [inputValue])

  // ── Horizon → Chat handoff ─────────────────────────────────────────────
  // HorizonCard dispatches `horizon:prompt` after its click animation
  // settles. We type the prompt in (≈400ms total), focus the textarea,
  // glow the send button, and show a 3-second hint. This is the
  // "you chose a dream — now let's begin" moment.
  useEffect(() => {
    function onHorizonPrompt(e: Event) {
      const text = (e as CustomEvent).detail?.prompt as string | undefined
      if (!text || isCooling || isOut) return

      setIsReceivingPrompt(true)
      setShowHint(false)
      setInputValue('')

      const totalMs = 400
      const stepMs  = Math.max(8, Math.floor(totalMs / Math.max(text.length, 1)))
      let i = 0

      const interval = window.setInterval(() => {
        i += 1
        setInputValue(text.slice(0, i))
        if (i >= text.length) {
          window.clearInterval(interval)
          setIsReceivingPrompt(false)
          const el = textareaRef.current
          if (el) {
            el.focus()
            try { el.setSelectionRange(text.length, text.length) } catch { /* ignore */ }
          }
          setShowHint(true)
          window.setTimeout(() => setShowHint(false), 3000)
        }
      }, stepMs)
    }

    window.addEventListener('horizon:prompt', onHorizonPrompt)
    return () => window.removeEventListener('horizon:prompt', onHorizonPrompt)
    // setInputValue is stable from parent; intentionally omitted.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isCooling, isOut])

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
        borderTop:  '1px solid var(--border-subtle)',
        background: 'var(--bg-surface)',
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
          <p style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>
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
          className="flex-1 resize-none rounded-xl px-4 py-3 text-sm outline-none"
          style={{
            background: 'var(--bg-surface)',
            border:     isReceivingPrompt
              ? '1.5px solid var(--saathi-primary)'
              : '1.5px solid var(--border-medium)',
            boxShadow:  isReceivingPrompt
              ? '0 0 0 4px rgba(184,134,11,0.18)'
              : 'none',
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-body)',
            lineHeight: '1.5',
            maxHeight: 120,
            opacity: disabled ? 0.5 : 1,
            transition: 'border-color 280ms ease, box-shadow 280ms ease',
          }}
          onFocus={(e) => {
            if (!isReceivingPrompt) e.currentTarget.style.borderColor = 'var(--saathi-primary)'
          }}
          onBlur={(e) => {
            if (!isReceivingPrompt) e.currentTarget.style.borderColor = 'var(--border-medium)'
          }}
        />

        {/* Sketch / image upload */}
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled}
          title="Upload sketch"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-40"
          style={{
            background: pendingImage ? 'var(--saathi-light)' : 'var(--bg-elevated)',
            border: pendingImage
              ? '1px solid var(--saathi-border)'
              : '1px solid var(--border-subtle)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke={pendingImage ? 'var(--saathi-primary)' : 'var(--text-tertiary)'}
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
          animate={
            showHint
              ? {
                  boxShadow: [
                    `0 0 0 0   ${primaryColor}00`,
                    `0 0 14px 4px ${primaryColor}80`,
                    `0 0 0 0   ${primaryColor}00`,
                  ],
                }
              : { boxShadow: `0 0 0 0 ${primaryColor}00` }
          }
          transition={
            showHint
              ? { duration: 1.4, repeat: Infinity, ease: 'easeInOut' }
              : { duration: 0.25 }
          }
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl disabled:cursor-not-allowed disabled:opacity-40"
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

      {/* Horizon hint — fades in below input for 3s after a Horizon prompt lands */}
      <AnimatePresence>
        {showHint && (
          <motion.p
            initial={{ opacity: 0, y: -2 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -2 }}
            transition={{ duration: 0.25 }}
            className="px-5 pt-1 text-[11px]"
            style={{ color: 'var(--saathi-primary)', fontWeight: 500 }}
          >
            Your Saathi is ready — press Enter to begin ✦
          </motion.p>
        )}
      </AnimatePresence>

      {/* Status row */}
      <div className="flex items-center justify-between gap-4 px-5 pb-3">
        <p
          className="text-[10px]"
          style={{ color: 'var(--text-ghost)' }}
        >
          Enter to send · Shift+Enter for new line
        </p>
        <div className="flex items-center gap-3">
          {inputValue.length > SHOW_COUNT_THRESHOLD && (
            <span
              className="text-[10px] tabular-nums"
              style={{
                color: inputValue.length > MAX_CHARS - 100
                  ? 'var(--error)'
                  : 'var(--text-ghost)',
              }}
            >
              {inputValue.length.toLocaleString()} /{' '}
              {MAX_CHARS.toLocaleString()}
            </span>
          )}
          {!isCooling && quota.remaining <= 14 && quota.remaining > 0 && (
            <span
              className="text-[10px]"
              style={{ color: 'var(--text-ghost)' }}
            >
              {quota.remaining} chats remaining today
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
