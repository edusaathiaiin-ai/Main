'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { streamChat } from '@/lib/ai'
import { createClient } from '@/lib/supabase/client'
import { MessageBubble } from './MessageBubble'
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
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, streamingText])

  // Welcome message for fresh boards
  useEffect(() => {
    if (messages.length === 0 && board.id) {
      setMessages([{
        id: `welcome-${board.id}`,
        role: 'assistant',
        content: `${board.emoji} **${board.name}** is ready. What shall we cover here?`,
        createdAt: new Date().toISOString(),
      }])
    }
  }, [board.id]) // eslint-disable-line react-hooks/exhaustive-deps

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || isStreaming) return

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
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
        message: text,
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

  // Flag handler
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
        borderRight: '1px solid var(--border-subtle)',
        background: isActive ? 'var(--bg-base)' : 'var(--bg-subtle, #fafafa)',
        minWidth: '280px',
        transition: 'background 0.2s',
      }}
    >
      {/* Column header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '8px 12px',
          borderBottom: '1px solid var(--border-subtle)',
          background: isActive ? 'var(--bg-elevated)' : 'transparent',
        }}
      >
        <span style={{ fontSize: '14px' }}>{board.emoji}</span>
        <span
          style={{
            fontWeight: 600,
            fontSize: 'var(--text-sm)',
            color: isActive ? 'var(--saathi-primary)' : 'var(--text-secondary)',
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {board.name}
        </span>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onEmailDigest(board.id, board.name)
          }}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '12px',
            color: 'var(--text-ghost)',
            padding: '2px',
          }}
          title={`Email ${board.name} chat`}
        >
          📧
        </button>
        {canClose && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onClose()
            }}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              fontSize: '14px',
              color: 'var(--text-ghost)',
              padding: '2px',
            }}
            title="Close column"
          >
            ✕
          </button>
        )}
      </div>

      {/* Messages — independently scrollable */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '12px',
        }}
      >
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
            message={{
              id: 'streaming',
              role: 'assistant',
              content: streamingText,
              createdAt: new Date().toISOString(),
            }}
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

      {/* Input area */}
      <div
        style={{
          borderTop: '1px solid var(--border-subtle)',
          padding: '8px 12px',
        }}
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              sendMessage()
            }
          }}
          placeholder={`Ask ${board.name}…`}
          rows={2}
          disabled={isStreaming}
          style={{
            width: '100%',
            resize: 'none',
            padding: '8px 10px',
            borderRadius: '8px',
            fontSize: 'var(--text-sm)',
            color: 'var(--text-primary)',
            background: 'var(--bg-elevated, #f5f5f5)',
            border: `1px solid ${isActive ? 'var(--saathi-border)' : 'var(--border-subtle)'}`,
            outline: 'none',
            fontFamily: 'inherit',
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = saathi.primary
            onFocus()
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = 'var(--border-subtle)'
          }}
        />
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginTop: '4px',
          }}
        >
          <span
            style={{
              fontSize: 'var(--text-xs)',
              color: 'var(--text-ghost)',
            }}
          >
            Enter to send
          </span>
          <button
            onClick={sendMessage}
            disabled={!input.trim() || isStreaming}
            style={{
              background: input.trim() && !isStreaming ? saathi.primary : 'var(--text-ghost)',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              padding: '4px 12px',
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              cursor: !input.trim() || isStreaming ? 'not-allowed' : 'pointer',
              opacity: !input.trim() || isStreaming ? 0.4 : 1,
              transition: 'all 0.15s',
            }}
          >
            {isStreaming ? '…' : 'Send'}
          </button>
        </div>
      </div>
    </div>
  )
}
