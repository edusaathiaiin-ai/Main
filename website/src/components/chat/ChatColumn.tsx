'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { streamChat } from '@/lib/ai'
import { createClient } from '@/lib/supabase/client'
import { MessageBubble } from './MessageBubble'
import { SUBJECT_CHIPS } from '@/constants/subjectChips'
import type { BoardInfo } from './BoardNavigator'
import type { ChatMessage, Saathi } from '@/types'

type Props = {
  board: BoardInfo
  saathi: Saathi
  saathiSlug: string
  userId: string
  accessToken: string
  verticalId: string
  activeBotSlot: number
  isActive: boolean
  canClose: boolean
  onFocus: () => void
  onClose: () => void
  onEmailDigest: (boardId: string | null, boardName: string) => void
}

function getStarters(saathiSlug: string, boardName: string, saathiName: string): string[] {
  const topics = SUBJECT_CHIPS[saathiSlug] ?? []
  if (boardName === 'General') {
    return [
      `What should I study first in ${saathiName.replace('Saathi', '')}?`,
      ...topics.slice(0, 3).map((t) => `Explain ${t} in simple terms`),
    ]
  }
  return [
    `What are the key concepts in ${boardName}?`,
    `Give me structured study notes on ${boardName}`,
    `Most important exam questions on ${boardName}`,
    `Explain ${boardName} with real-world examples`,
  ]
}

export function ChatColumn({
  board,
  saathi,
  saathiSlug,
  userId,
  accessToken,
  verticalId,
  activeBotSlot,
  isActive,
  canClose,
  onFocus,
  onClose,
  onEmailDigest,
}: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  const starters = getStarters(saathiSlug, board.name, saathi.name)

  const sendMessage = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || isStreaming) return

    setMessages((prev) => [...prev, {
      id: `user-${Date.now()}`,
      role: 'user',
      content: msg,
      createdAt: new Date().toISOString(),
    }])
    setInput('')
    setIsStreaming(true)
    setStreamingText('')

    try {
      const history = messages.slice(-20).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      }))

      let fullText = ''
      for await (const delta of streamChat({
        saathiId: saathiSlug,
        botSlot: activeBotSlot,
        message: msg,
        history,
        accessToken,
        ...(board.id ? { chatboardId: board.id } : {}),
      })) {
        fullText += delta
        setStreamingText(fullText)
      }

      if (fullText) {
        setMessages((prev) => [...prev, {
          id: `asst-${Date.now()}`,
          role: 'assistant',
          content: fullText,
          createdAt: new Date().toISOString(),
        }])
      }
    } catch (err) {
      setMessages((prev) => [...prev, {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `⚠️ ${err instanceof Error ? err.message : 'Something went wrong'}`,
        createdAt: new Date().toISOString(),
      }])
    } finally {
      setIsStreaming(false)
      setStreamingText('')
    }
  }, [input, isStreaming, messages, saathiSlug, activeBotSlot, accessToken, board.id])

  async function handleFlag(messageId: string) {
    const supabase = createClient()
    await supabase.from('moderation_flags').insert({
      target_id: messageId,
      target_type: 'chat_message',
      reporter_user_id: userId,
      reason: 'user_flag',
    })
  }

  return (
    <div
      onClick={onFocus}
      style={{
        display: 'flex',
        flexDirection: 'column',
        width: '100%',
        height: '100%',
        borderRadius: '14px',
        border: isActive ? `2px solid ${saathi.primary}50` : '1px solid var(--border-subtle)',
        background: 'var(--bg-surface, #fff)',
        boxShadow: isActive ? `0 2px 16px ${saathi.primary}10` : '0 1px 4px rgba(0,0,0,0.04)',
        overflow: 'hidden',
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}
    >
      {/* ── Column header — Saathi branding ── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '12px 16px',
          borderBottom: '1px solid var(--border-subtle)',
          background: `${saathi.primary}06`,
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: '24px' }}>{saathi.emoji}</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
              {saathi.name}
            </span>
            <span style={{
              fontSize: '11px', fontWeight: 600, color: saathi.primary,
              padding: '1px 8px', borderRadius: '100px',
              background: `${saathi.primary}12`, border: `1px solid ${saathi.primary}25`,
            }}>
              {board.emoji} {board.name}
            </span>
          </div>
          <p style={{ fontSize: '11px', color: 'var(--text-ghost)', margin: '2px 0 0', lineHeight: 1.3 }}>
            {saathi.tagline}
          </p>
        </div>
        <button
          onClick={(e) => { e.stopPropagation(); onEmailDigest(board.id, board.name) }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: 'var(--text-ghost)', padding: '4px' }}
          title={`Email ${board.name} chat`}
        >
          📧
        </button>
        {canClose && (
          <button
            onClick={(e) => { e.stopPropagation(); onClose() }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: 'var(--text-ghost)', padding: '4px' }}
            title="Close column"
          >
            ✕
          </button>
        )}
      </div>

      {/* ── Messages ── */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>
        {/* Starter questions */}
        {messages.length === 0 && !isStreaming && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: '24px' }}>
            <span style={{ fontSize: '40px', marginBottom: '12px' }}>{saathi.emoji}</span>
            <p style={{ fontSize: '15px', fontWeight: 600, color: 'var(--text-primary)', margin: '0 0 4px', textAlign: 'center' }}>
              {board.name}
            </p>
            <p style={{ fontSize: '12px', color: 'var(--text-ghost)', margin: '0 0 20px', textAlign: 'center' }}>
              {saathi.tagline}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%', maxWidth: '320px' }}>
              {starters.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  style={{
                    textAlign: 'left',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                    background: 'var(--bg-elevated, #f7f7f5)',
                    border: '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'all 0.15s',
                    lineHeight: 1.4,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = saathi.primary
                    e.currentTarget.style.color = saathi.primary
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = 'var(--border-subtle)'
                    e.currentTarget.style.color = 'var(--text-secondary)'
                  }}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => (
          <MessageBubble
            key={msg.id}
            message={msg}
            isStreaming={false}
            verticalId={verticalId}
            verticalSlug={saathiSlug}
            verticalName={saathi.name}
            botSlot={activeBotSlot}
            primaryColor={saathi.primary}
            onFlag={msg.role === 'assistant' ? handleFlag : undefined}
          />
        ))}
        {isStreaming && streamingText && (
          <MessageBubble
            message={{ id: 'streaming', role: 'assistant', content: streamingText, createdAt: new Date().toISOString() }}
            isStreaming={true}
            verticalId={verticalId}
            verticalSlug={saathiSlug}
            verticalName={saathi.name}
            botSlot={activeBotSlot}
            primaryColor={saathi.primary}
          />
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* ── Input ── */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '10px 14px', flexShrink: 0 }}>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-end' }}>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
            }}
            placeholder={`Ask ${board.name}…`}
            rows={1}
            disabled={isStreaming}
            style={{
              flex: 1, resize: 'none', padding: '8px 12px', borderRadius: '10px',
              fontSize: '14px', color: 'var(--text-primary)',
              background: 'var(--bg-elevated, #f5f5f5)',
              border: '1px solid var(--border-subtle)',
              outline: 'none', fontFamily: 'inherit',
              minHeight: '36px', maxHeight: '80px',
            }}
            onFocus={(e) => { e.currentTarget.style.borderColor = saathi.primary; onFocus() }}
            onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)' }}
          />
          <button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isStreaming}
            style={{
              height: '36px', padding: '0 14px', borderRadius: '10px',
              fontSize: '13px', fontWeight: 600,
              color: '#fff', border: 'none',
              background: input.trim() && !isStreaming ? saathi.primary : 'var(--text-ghost)',
              cursor: !input.trim() || isStreaming ? 'not-allowed' : 'pointer',
              opacity: !input.trim() || isStreaming ? 0.4 : 1,
              flexShrink: 0,
            }}
          >
            {isStreaming ? '…' : '↑'}
          </button>
        </div>
      </div>
    </div>
  )
}
