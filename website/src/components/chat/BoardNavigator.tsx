'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import {
  trackChatboardCreated,
  trackChatboardSwitched,
  trackChatboardArchived,
  trackChatboardRenamed,
} from '@/lib/analytics'

// ── Types ────────────────────────────────────────────────────────────────────

type Board = {
  id: string
  name: string
  emoji: string
  focus_statement: string | null
  board_type: string
  exam_target_id: string | null
  last_bot_slot: number
  is_pinned: boolean
  message_count: number
  last_message_at: string | null
  position: number
  created_at: string
}

type Props = {
  userId: string
  saathiSlug: string
  saathiColor: string
  activeBoardId: string | null
  onSelectBoard: (boardId: string | null, lastBotSlot: number) => void
}

// ── Component ────────────────────────────────────────────────────────────────

export default function BoardNavigator({
  userId,
  saathiSlug,
  saathiColor,
  activeBoardId,
  onSelectBoard,
}: Props) {
  const [boards, setBoards] = useState<Board[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [menuId, setMenuId] = useState<string | null>(null)

  const supabase = createClient()

  // ── Fetch boards ─────────────────────────────────────────────────────────

  const fetchBoards = useCallback(async () => {
    const { data } = await supabase
      .from('chatboards')
      .select('*')
      .eq('user_id', userId)
      .eq('saathi_slug', saathiSlug)
      .eq('is_archived', false)
      .order('is_pinned', { ascending: false })
      .order('position', { ascending: true })
    setBoards((data ?? []) as Board[])
    setLoading(false)
  }, [userId, saathiSlug, supabase])

  useEffect(() => {
    fetchBoards()
  }, [fetchBoards])

  // ── Create board ─────────────────────────────────────────────────────────

  async function handleCreate() {
    const trimmed = newName.trim()
    if (!trimmed || creating) return
    setCreating(true)
    const { data, error } = await supabase.from('chatboards').insert({
      user_id: userId,
      saathi_slug: saathiSlug,
      name: trimmed,
      emoji: '📒',
      board_type: 'subject',
      position: boards.length,
    }).select('id').single()
    setCreating(false)
    if (!error && data) {
      trackChatboardCreated('subject', saathiSlug, false)
      setNewName('')
      setShowCreate(false)
      await fetchBoards()
      onSelectBoard(data.id, 1)
    }
  }

  // ── Rename board ─────────────────────────────────────────────────────────

  async function handleRename(boardId: string) {
    const trimmed = editName.trim()
    if (!trimmed) return
    await supabase
      .from('chatboards')
      .update({ name: trimmed })
      .eq('id', boardId)
      .eq('user_id', userId)
    trackChatboardRenamed(saathiSlug)
    setEditingId(null)
    fetchBoards()
  }

  // ── Archive board ────────────────────────────────────────────────────────

  async function handleArchive(board: Board) {
    await supabase
      .from('chatboards')
      .update({ is_archived: true })
      .eq('id', board.id)
      .eq('user_id', userId)
    const ageMs = Date.now() - new Date(board.created_at).getTime()
    trackChatboardArchived(board.message_count, Math.round(ageMs / 86400000))
    if (activeBoardId === board.id) onSelectBoard(null, 1)
    setMenuId(null)
    fetchBoards()
  }

  // ── Pin / unpin ──────────────────────────────────────────────────────────

  async function handleTogglePin(board: Board) {
    await supabase
      .from('chatboards')
      .update({ is_pinned: !board.is_pinned })
      .eq('id', board.id)
      .eq('user_id', userId)
    setMenuId(null)
    fetchBoards()
  }

  // ── Select board ─────────────────────────────────────────────────────────

  function handleSelect(board: Board) {
    if (activeBoardId === board.id) {
      onSelectBoard(null, 1) // deselect → general chat
    } else {
      const prevBoard = boards.find((b) => b.id === activeBoardId)
      trackChatboardSwitched(
        (prevBoard?.board_type ?? 'general') as 'subject' | 'exam' | 'general',
        board.board_type as 'subject' | 'exam' | 'general'
      )
      onSelectBoard(board.id, board.last_bot_slot)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div
        className="px-3 py-2"
        style={{ borderBottom: '0.5px solid var(--border-subtle, rgba(0,0,0,0.06))' }}
      >
        <p className="text-xs" style={{ color: 'var(--text-ghost)' }}>Loading boards…</p>
      </div>
    )
  }

  return (
    <div
      style={{ borderBottom: '0.5px solid var(--border-subtle, rgba(0,0,0,0.06))' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-3 py-2"
      >
        <p
          className="text-[10px] font-bold uppercase tracking-widest"
          style={{ color: 'var(--text-ghost)' }}
        >
          Boards
        </p>
        <button
          onClick={() => setShowCreate((v) => !v)}
          className="rounded px-1.5 py-0.5 text-xs font-semibold transition-colors"
          style={{ color: saathiColor }}
          title="New board"
        >
          +
        </button>
      </div>

      {/* Create form */}
      <AnimatePresence>
        {showCreate && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-3 pb-2"
          >
            <form
              onSubmit={(e) => { e.preventDefault(); handleCreate() }}
              className="flex gap-1.5"
            >
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value.slice(0, 60))}
                placeholder="Board name…"
                autoFocus
                className="flex-1 rounded-lg px-2.5 py-1.5 text-xs outline-none"
                style={{
                  background: 'var(--bg-surface, #fff)',
                  border: `1px solid ${saathiColor}40`,
                  color: 'var(--text-primary)',
                }}
              />
              <button
                type="submit"
                disabled={!newName.trim() || creating}
                className="rounded-lg px-2.5 py-1.5 text-xs font-semibold disabled:opacity-40"
                style={{ background: saathiColor, color: '#fff' }}
              >
                {creating ? '…' : 'Create'}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* "General" — always first, no board */}
      <button
        onClick={() => onSelectBoard(null, 1)}
        className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors"
        style={{
          background: activeBoardId === null ? `${saathiColor}12` : 'transparent',
          borderLeft: activeBoardId === null ? `2px solid ${saathiColor}` : '2px solid transparent',
        }}
      >
        <span className="text-sm">💬</span>
        <span
          className="text-xs font-semibold"
          style={{ color: activeBoardId === null ? saathiColor : 'var(--text-secondary)' }}
        >
          General
        </span>
      </button>

      {/* Board list */}
      {boards.map((b) => {
        const isActive = activeBoardId === b.id
        const isEditing = editingId === b.id

        return (
          <div key={b.id} className="relative">
            <button
              onClick={() => !isEditing && handleSelect(b)}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors"
              style={{
                background: isActive ? `${saathiColor}12` : 'transparent',
                borderLeft: isActive ? `2px solid ${saathiColor}` : '2px solid transparent',
              }}
            >
              <span className="text-sm">{b.emoji}</span>
              <div className="min-w-0 flex-1">
                {isEditing ? (
                  <form
                    onSubmit={(e) => { e.preventDefault(); handleRename(b.id) }}
                    onClick={(e) => e.stopPropagation()}
                  >
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value.slice(0, 60))}
                      onBlur={() => handleRename(b.id)}
                      autoFocus
                      className="w-full rounded px-1.5 py-0.5 text-xs outline-none"
                      style={{
                        background: 'var(--bg-surface, #fff)',
                        border: `1px solid ${saathiColor}40`,
                        color: 'var(--text-primary)',
                      }}
                    />
                  </form>
                ) : (
                  <span
                    className="block truncate text-xs font-semibold"
                    style={{ color: isActive ? saathiColor : 'var(--text-secondary)' }}
                  >
                    {b.is_pinned && '📌 '}{b.name}
                  </span>
                )}
                {b.focus_statement && !isEditing && (
                  <span
                    className="block truncate text-[10px]"
                    style={{ color: 'var(--text-ghost)' }}
                  >
                    {b.focus_statement}
                  </span>
                )}
              </div>

              {/* Context menu trigger */}
              {!isEditing && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setMenuId(menuId === b.id ? null : b.id)
                  }}
                  className="shrink-0 rounded px-1 py-0.5 text-xs opacity-0 transition-opacity group-hover:opacity-100"
                  style={{
                    color: 'var(--text-ghost)',
                    opacity: menuId === b.id || isActive ? 1 : undefined,
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
                  onMouseLeave={(e) => {
                    if (menuId !== b.id) e.currentTarget.style.opacity = '0'
                  }}
                >
                  ⋮
                </button>
              )}
            </button>

            {/* Context menu */}
            <AnimatePresence>
              {menuId === b.id && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="absolute right-2 top-full z-50 rounded-lg py-1 shadow-lg"
                  style={{
                    background: 'var(--bg-surface, #fff)',
                    border: '1px solid var(--border-subtle, rgba(0,0,0,0.08))',
                    minWidth: '140px',
                  }}
                >
                  <MenuBtn
                    onClick={() => {
                      setEditingId(b.id)
                      setEditName(b.name)
                      setMenuId(null)
                    }}
                  >
                    ✏️ Rename
                  </MenuBtn>
                  <MenuBtn onClick={() => handleTogglePin(b)}>
                    {b.is_pinned ? '📌 Unpin' : '📌 Pin'}
                  </MenuBtn>
                  {b.board_type !== 'general' && (
                    <MenuBtn
                      onClick={() => handleArchive(b)}
                      style={{ color: '#EF4444' }}
                    >
                      🗑️ Archive
                    </MenuBtn>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}

      {/* Empty state */}
      {boards.length === 0 && (
        <p
          className="px-3 py-2 text-[10px]"
          style={{ color: 'var(--text-ghost)' }}
        >
          No boards yet — create one to organise your study sessions.
        </p>
      )}
    </div>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function MenuBtn({
  children,
  onClick,
  style,
}: {
  children: React.ReactNode
  onClick: () => void
  style?: React.CSSProperties
}) {
  return (
    <button
      onClick={onClick}
      className="block w-full px-3 py-1.5 text-left text-xs transition-colors hover:bg-black/[0.04]"
      style={{ color: 'var(--text-secondary)', ...style }}
    >
      {children}
    </button>
  )
}
