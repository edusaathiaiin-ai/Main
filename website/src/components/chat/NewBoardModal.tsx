'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import { SUBJECT_CHIPS } from '@/constants/subjectChips'
import { trackChatboardCreated } from '@/lib/analytics'

const EMOJI_OPTIONS = ['📒', '📊', '📋', '⚖️', '📈', '🎯', '🧪', '🔬', '📐', '💊', '🏛️', '💻']

type Props = {
  open: boolean
  onClose: () => void
  userId: string
  saathiSlug: string
  saathiColor: string
  onCreated: (boardId: string, boardName: string) => void
}

export function NewBoardModal({
  open,
  onClose,
  userId,
  saathiSlug,
  saathiColor,
  onCreated,
}: Props) {
  const [name, setName] = useState('')
  const [emoji, setEmoji] = useState('📒')
  const [creating, setCreating] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  // Drag state
  const [pos, setPos] = useState({ x: 290, y: 120 })
  const dragging = useRef(false)
  const dragOffset = useRef({ x: 0, y: 0 })

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    dragging.current = true
    dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [pos])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!dragging.current) return
    setPos({
      x: Math.max(0, e.clientX - dragOffset.current.x),
      y: Math.max(0, e.clientY - dragOffset.current.y),
    })
  }, [])

  const onPointerUp = useCallback(() => {
    dragging.current = false
  }, [])

  const suggestions = (SUBJECT_CHIPS[saathiSlug] ?? []).slice(0, 8)

  async function createBoard(boardName: string, boardEmoji: string) {
    if (creating) return
    setCreating(true)
    const supabase = createClient()
    const { count } = await supabase
      .from('chatboards')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('saathi_slug', saathiSlug)
      .eq('is_archived', false)
    const { data, error } = await supabase
      .from('chatboards')
      .insert({
        user_id: userId,
        saathi_slug: saathiSlug,
        name: boardName.trim().slice(0, 40),
        emoji: boardEmoji,
        board_type: 'subject',
        position: count ?? 0,
      })
      .select('id')
      .single()
    setCreating(false)
    if (!error && data) {
      trackChatboardCreated('subject', saathiSlug, false)
      setName('')
      setEmoji('📒')
      onCreated(data.id, boardName.trim())
      onClose()
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          style={{
            position: 'fixed',
            left: pos.x,
            top: pos.y,
            width: '340px',
            maxHeight: collapsed ? 'auto' : 'min(520px, calc(100vh - 140px))',
            background: 'var(--bg-surface, #fff)',
            border: '1px solid var(--border-subtle)',
            borderRadius: '14px',
            boxShadow: '0 16px 48px rgba(0, 0, 0, 0.15)',
            zIndex: 200,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Draggable header */}
          <div
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '10px 14px',
              cursor: 'grab',
              borderBottom: collapsed ? 'none' : '1px solid var(--border-subtle)',
              background: 'var(--bg-elevated)',
              borderRadius: '14px 14px 0 0',
              userSelect: 'none',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 'var(--text-sm)', fontWeight: 700, color: 'var(--text-primary)' }}>
              + New Board
            </span>
            <div style={{ display: 'flex', gap: '4px' }}>
              <button
                onClick={() => setCollapsed((c) => !c)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '14px', color: 'var(--text-ghost)', padding: '2px',
                }}
                title={collapsed ? 'Expand' : 'Collapse'}
              >
                {collapsed ? '▼' : '▲'}
              </button>
              <button
                onClick={onClose}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '16px', color: 'var(--text-ghost)', padding: '2px',
                }}
                title="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Body — hidden when collapsed */}
          {!collapsed && (
            <div style={{ padding: '16px', overflowY: 'auto', flex: 1 }}>
              {/* Suggestions */}
              {suggestions.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <p style={{
                    fontSize: 'var(--text-xs)', fontWeight: 700,
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    color: 'var(--text-ghost)', margin: '0 0 8px',
                  }}>
                    Quick start
                  </p>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {suggestions.map((topic) => (
                      <button
                        key={topic}
                        onClick={() => createBoard(topic, '📒')}
                        disabled={creating}
                        style={{
                          padding: '5px 12px',
                          borderRadius: '100px',
                          fontSize: 'var(--text-xs)',
                          fontWeight: 500,
                          color: saathiColor,
                          background: `${saathiColor}12`,
                          border: `1px solid ${saathiColor}30`,
                          cursor: creating ? 'not-allowed' : 'pointer',
                          transition: 'all 0.15s',
                        }}
                      >
                        {topic}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Divider */}
              <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '0 0 14px' }} />

              {/* Custom */}
              <p style={{
                fontSize: 'var(--text-xs)', fontWeight: 700,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                color: 'var(--text-ghost)', margin: '0 0 8px',
              }}>
                Custom board
              </p>

              {/* Emoji picker */}
              <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap', marginBottom: '8px' }}>
                {EMOJI_OPTIONS.map((e) => (
                  <button
                    key={e}
                    onClick={() => setEmoji(e)}
                    style={{
                      width: '28px', height: '28px',
                      borderRadius: '6px',
                      fontSize: '14px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: emoji === e ? `${saathiColor}20` : 'var(--bg-elevated)',
                      border: emoji === e ? `2px solid ${saathiColor}` : '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                    }}
                  >
                    {e}
                  </button>
                ))}
              </div>

              {/* Name input */}
              <input
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 40))}
                placeholder="Board name…"
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '8px',
                  fontSize: 'var(--text-sm)',
                  color: 'var(--text-primary)',
                  background: 'var(--bg-elevated, #f5f5f5)',
                  border: '1px solid var(--border-subtle)',
                  outline: 'none',
                  marginBottom: '6px',
                }}
                onFocus={(e) => (e.currentTarget.style.borderColor = saathiColor)}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
                onKeyDown={(e) => { if (e.key === 'Enter' && name.trim()) createBoard(name, emoji) }}
              />
              <p style={{ fontSize: '10px', color: 'var(--text-ghost)', margin: '0 0 10px' }}>
                {40 - name.length} characters left
              </p>

              {/* Create button */}
              <button
                onClick={() => name.trim() && createBoard(name, emoji)}
                disabled={!name.trim() || creating}
                style={{
                  width: '100%',
                  padding: '8px',
                  borderRadius: '8px',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 600,
                  color: '#fff',
                  background: !name.trim() ? 'var(--text-ghost)' : saathiColor,
                  border: 'none',
                  cursor: !name.trim() || creating ? 'not-allowed' : 'pointer',
                  opacity: !name.trim() ? 0.5 : 1,
                  transition: 'all 0.15s',
                }}
              >
                {creating ? 'Creating…' : `Create ${emoji} ${name.trim() || 'Board'}`}
              </button>
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
