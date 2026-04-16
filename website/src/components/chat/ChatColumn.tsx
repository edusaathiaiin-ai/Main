'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { streamChat } from '@/lib/ai'
import { createClient } from '@/lib/supabase/client'
import { MessageBubble } from './MessageBubble'
import { SendToPhone } from './SendToPhone'
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

function getStarterQuestions(saathiSlug: string, boardName: string): string[] {
  const topics = SUBJECT_CHIPS[saathiSlug] ?? []
  if (boardName === 'General') {
    return topics.slice(0, 4).map((t) => `Explain ${t} basics`)
  }
  return [
    `What are the key concepts in ${boardName}?`,
    `Give me study notes on ${boardName}`,
    `Common exam questions on ${boardName}`,
    `Explain ${boardName} with examples`,
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

  const starters = getStarterQuestions(saathiSlug, board.name)

  const sendMessage = useCallback(async (text?: string) => {
    const msg = (text ?? input).trim()
    if (!msg || isStreaming) return

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: msg,
      createdAt: new Date().toISOString(),
    }
    setMessages((prev) => [...prev, userMsg])
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
        setMessages((prev) => [
          ...prev,
          {
            id: `asst-${Date.now()}`,
            role: 'assistant',
            content: fullText,
            createdAt: new Date().toISOString(),
          },
        ])
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : 'Something went wrong'
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `⚠️ ${errMsg}`,
          createdAt: new Date().toISOString(),
        },
      ])
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
        height: '100%',
        minWidth: '280px',
        borderRadius: '16px',
        border: isActive ? `2px solid ${saathi.primary}40` : '1.5px solid var(--border-subtle)',
        background: 'var(--bg-surface, #fff)',
        boxShadow: isActive ? `0 4px 24px ${saathi.primary}12` : '0 2px 8px rgba(0,0,0,0.04)',
        overflow: 'hidden',
        transition: 'border-color 0.2s, box-shadow 0.2s',
      }}
    >
      {/* Column header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 14px',
          borderBottom: '1px solid var(--border-subtle)',
          background: isActive ? `${saathi.primary}08` : 'var(--bg-elevated)',
          flexShrink: 0,
        }}
      >
        <span style={{ fontSize: '18px' }}>{board.emoji}</span>
        <span
          style={{
            fontWeight: 700,
            fontSize: 'var(--text-sm)',
            color: isActive ? saathi.primary : 'var(--text-primary)',
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {board.name}
        </span>
        <button
          onClick={(e) => { e.stopPropagation(); onEmailDigest(board.id, board.name) }}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '14px', color: 'var(--text-ghost)', padding: '2px' }}
          title={`Email ${board.name} chat`}
        >
          📧
        </button>
        {canClose && (
          <button
            onClick={(e) => { e.stopPropagation(); onClose() }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px', color: 'var(--text-ghost)', padding: '2px' }}
            title="Close column"
          >
            ✕
          </button>
        )}
      </div>

      {/* Messages — independently scrollable */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
        {/* Starter questions — show when no messages */}
        {messages.length === 0 && !isStreaming && (
          <div style={{ padding: '8px 0 16px' }}>
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-ghost)', margin: '0 0 8px', fontWeight: 600 }}>
              Start with:
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {starters.map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  style={{
                    textAlign: 'left',
                    padding: '8px 12px',
                    borderRadius: '10px',
                    fontSize: 'var(--text-xs)',
                    color: saathi.primary,
                    background: `${saathi.primary}08`,
                    border: `1px solid ${saathi.primary}20`,
                    cursor: 'pointer',
                    transition: 'all 0.15s',
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

      {/* Input area with mic + send */}
      <div style={{ borderTop: '1px solid var(--border-subtle)', padding: '8px 12px', flexShrink: 0 }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
          }}
          placeholder={`Ask ${board.name}…`}
          rows={2}
          disabled={isStreaming}
          style={{
            width: '100%', resize: 'none', padding: '8px 10px', borderRadius: '8px',
            fontSize: 'var(--text-sm)', color: 'var(--text-primary)',
            background: 'var(--bg-elevated, #f5f5f5)',
            border: `1px solid ${isActive ? `${saathi.primary}40` : 'var(--border-subtle)'}`,
            outline: 'none', fontFamily: 'inherit',
          }}
          onFocus={(e) => { e.currentTarget.style.borderColor = saathi.primary; onFocus() }}
          onBlur={(e) => { e.currentTarget.style.borderColor = 'var(--border-subtle)' }}
        />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '4px' }}>
          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--text-ghost)' }}>
            Enter to send
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isStreaming}
              style={{
                background: input.trim() && !isStreaming ? saathi.primary : 'var(--text-ghost)',
                color: '#fff', border: 'none', borderRadius: '6px',
                padding: '4px 12px', fontSize: 'var(--text-xs)', fontWeight: 600,
                cursor: !input.trim() || isStreaming ? 'not-allowed' : 'pointer',
                opacity: !input.trim() || isStreaming ? 0.4 : 1,
              }}
            >
              {isStreaming ? '…' : 'Send'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

// Locked column placeholder — shows upgrade CTA
export function LockedColumn({ saathi, planId }: { saathi: Saathi; planId: string | null }) {
  const label = !planId || planId === 'free' || planId === 'trial'
    ? 'Upgrade to Plus for 2 columns'
    : 'Upgrade to Pro for 3 columns'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        minWidth: '280px',
        borderRadius: '16px',
        border: '1.5px dashed var(--border-subtle)',
        background: 'var(--bg-elevated, #fafafa)',
        gap: '12px',
        padding: '24px',
      }}
    >
      <span style={{ fontSize: '32px', opacity: 0.3 }}>⊞</span>
      <p style={{ fontSize: 'var(--text-sm)', color: 'var(--text-ghost)', textAlign: 'center', margin: 0 }}>
        {label}
      </p>
      <a
        href="/pricing"
        style={{
          fontSize: 'var(--text-xs)', fontWeight: 600,
          color: saathi.primary, textDecoration: 'none',
          padding: '6px 16px', borderRadius: '8px',
          border: `1px solid ${saathi.primary}40`,
          background: `${saathi.primary}08`,
        }}
      >
        Upgrade →
      </a>
    </div>
  )
}
