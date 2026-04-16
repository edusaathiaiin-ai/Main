'use client'

import { useState } from 'react'
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

  function handleSuggestionClick(topic: string) {
    createBoard(topic, '📒')
  }

  function handleCustomCreate() {
    if (!name.trim()) return
    createBoard(name, emoji)
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.4)',
              zIndex: 100,
            }}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 8 }}
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 'min(420px, calc(100vw - 32px))',
              maxHeight: 'calc(100vh - 64px)',
              overflowY: 'auto',
              background: 'var(--bg-surface, #fff)',
              border: '1px solid var(--border-subtle)',
              borderRadius: '16px',
              boxShadow: '0 24px 48px rgba(0, 0, 0, 0.15)',
              zIndex: 101,
              padding: '24px',
            }}
          >
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-primary)', margin: 0 }}>
                New Board
              </h2>
              <button
                onClick={onClose}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '18px', color: 'var(--text-ghost)', padding: '4px',
                }}
              >
                ✕
              </button>
            </div>

            {/* Suggestions */}
            {suggestions.length > 0 && (
              <div style={{ marginBottom: '24px' }}>
                <p style={{
                  fontSize: 'var(--text-xs)', fontWeight: 700,
                  letterSpacing: '0.08em', textTransform: 'uppercase',
                  color: 'var(--text-ghost)', margin: '0 0 10px',
                }}>
                  Quick start
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {suggestions.map((topic) => (
                    <button
                      key={topic}
                      onClick={() => handleSuggestionClick(topic)}
                      disabled={creating}
                      style={{
                        padding: '6px 14px',
                        borderRadius: '100px',
                        fontSize: 'var(--text-sm)',
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
            <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '0 0 20px' }} />

            {/* Custom */}
            <p style={{
              fontSize: 'var(--text-xs)', fontWeight: 700,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              color: 'var(--text-ghost)', margin: '0 0 10px',
            }}>
              Custom board
            </p>

            {/* Emoji picker */}
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '10px' }}>
              {EMOJI_OPTIONS.map((e) => (
                <button
                  key={e}
                  onClick={() => setEmoji(e)}
                  style={{
                    width: '32px', height: '32px',
                    borderRadius: '8px',
                    fontSize: '16px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: emoji === e ? `${saathiColor}20` : 'var(--bg-elevated)',
                    border: emoji === e ? `2px solid ${saathiColor}` : '1px solid var(--border-subtle)',
                    cursor: 'pointer',
                    transition: 'all 0.1s',
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
              autoFocus={suggestions.length === 0}
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: '10px',
                fontSize: 'var(--text-sm)',
                color: 'var(--text-primary)',
                background: 'var(--bg-elevated, #f5f5f5)',
                border: `1px solid var(--border-subtle)`,
                outline: 'none',
                marginBottom: '12px',
              }}
              onFocus={(e) => (e.currentTarget.style.borderColor = saathiColor)}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
              onKeyDown={(e) => { if (e.key === 'Enter') handleCustomCreate() }}
            />
            <p style={{ fontSize: 'var(--text-xs)', color: 'var(--text-ghost)', margin: '0 0 14px' }}>
              {40 - name.length} characters left
            </p>

            {/* Create button */}
            <button
              onClick={handleCustomCreate}
              disabled={!name.trim() || creating}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '10px',
                fontSize: 'var(--text-sm)',
                fontWeight: 600,
                color: '#fff',
                background: !name.trim() ? 'var(--text-ghost)' : saathiColor,
                border: 'none',
                cursor: !name.trim() || creating ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s',
                opacity: !name.trim() ? 0.5 : 1,
              }}
            >
              {creating ? 'Creating…' : `Create ${emoji} ${name.trim() || 'Board'}`}
            </button>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
