'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'
import {
  trackChatboardSwitched,
  trackChatboardArchived,
  trackChatboardRenamed,
} from '@/lib/analytics'
import { daysUntilExam, inferExamDate } from '@/lib/examCountdown'

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

export type BoardInfo = {
  id: string
  name: string
  emoji: string
  focus_statement: string | null
  board_type: string
}

type Props = {
  userId: string
  saathiSlug: string
  saathiColor: string
  activeBoardId: string | null
  onSelectBoard: (boardId: string | null, lastBotSlot: number, info: BoardInfo | null) => void
  onNewBoard: () => void
  refreshKey?: number
}

// ── Component ────────────────────────────────────────────────────────────────

export default function BoardNavigator({
  userId,
  saathiSlug,
  saathiColor,
  activeBoardId,
  onSelectBoard,
  onNewBoard,
  refreshKey,
}: Props) {
  const [boards, setBoards] = useState<Board[]>([])
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [menuId, setMenuId] = useState<string | null>(null)

  const supabase = createClient()

  // ── Fetch boards ─────────────────────────────────────────────────────────

  const initialActivateRef = useRef(false)

  const fetchBoards = useCallback(async () => {
    const { data } = await supabase
      .from('chatboards')
      .select('*')
      .eq('user_id', userId)
      .eq('saathi_slug', saathiSlug)
      .eq('is_archived', false)
      .order('is_pinned', { ascending: false })
      .order('position', { ascending: true })
    const fetched = (data ?? []) as Board[]
    setBoards(fetched)
    setLoading(false)

    // Auto-activate first pinned exam board on initial load
    if (!initialActivateRef.current && fetched.length > 0) {
      initialActivateRef.current = true
      const pinnedExam = fetched.find((b) => b.is_pinned && b.board_type === 'exam')
      if (pinnedExam) {
        onSelectBoard(pinnedExam.id, pinnedExam.last_bot_slot, {
          id: pinnedExam.id,
          name: pinnedExam.name,
          emoji: pinnedExam.emoji,
          focus_statement: pinnedExam.focus_statement,
          board_type: pinnedExam.board_type,
        })
      }
    }
  }, [userId, saathiSlug, supabase, onSelectBoard])

  useEffect(() => {
    fetchBoards()
  }, [fetchBoards, refreshKey])

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
    if (activeBoardId === board.id) onSelectBoard(null, 1, null)
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
      onSelectBoard(null, 1, null) // deselect → general chat
    } else {
      const prevBoard = boards.find((b) => b.id === activeBoardId)
      trackChatboardSwitched(
        (prevBoard?.board_type ?? 'general') as 'subject' | 'exam' | 'general',
        board.board_type as 'subject' | 'exam' | 'general'
      )
      onSelectBoard(board.id, board.last_bot_slot, {
        id: board.id,
        name: board.name,
        emoji: board.emoji,
        focus_statement: board.focus_statement,
        board_type: board.board_type,
      })
    }
  }

  // ── Derived lists ────────────────────────────────────────────────────────

  const pinned = boards.filter((b) => b.is_pinned)
  const unpinned = boards.filter((b) => !b.is_pinned)

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
      {/* ── Pinned boards (no label — sidebar has YOUR BOARDS header) ── */}
      {pinned.length > 0 && (
        <>
          {pinned.map((b) => (
            <BoardRow
              key={b.id}
              board={b}
              isActive={activeBoardId === b.id}
              isEditing={editingId === b.id}
              editName={editName}
              setEditName={setEditName}
              saathiColor={saathiColor}
              menuId={menuId}
              onSelect={() => handleSelect(b)}
              onMenuToggle={() => setMenuId(menuId === b.id ? null : b.id)}
              onStartRename={() => { setEditingId(b.id); setEditName(b.name); setMenuId(null) }}
              onRename={() => handleRename(b.id)}
              onTogglePin={() => handleTogglePin(b)}
              onArchive={() => handleArchive(b)}
              onOpenColumn={() => {
                window.dispatchEvent(new CustomEvent('board:open-column', {
                  detail: { id: b.id, name: b.name, emoji: b.emoji, focus_statement: b.focus_statement, board_type: b.board_type },
                }))
              }}
            />
          ))}
        </>
      )}

      {/* General — always first, always visible */}
      <button
        onClick={() => onSelectBoard(null, 1, null)}
        className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors"
        style={{
          background: activeBoardId === null
            ? `${saathiColor}12`
            : 'var(--bg-elevated, rgba(0,0,0,0.02))',
          borderLeft: activeBoardId === null ? `2px solid ${saathiColor}` : '2px solid transparent',
        }}
      >
        <span style={{ fontSize: '16px', lineHeight: 1 }}>💬</span>
        <span
          className="text-xs font-semibold"
          style={{ color: activeBoardId === null ? saathiColor : 'var(--text-secondary)' }}
        >
          General
        </span>
      </button>

      {/* Other unpinned boards */}
      {unpinned.map((b) => (
        <BoardRow
          key={b.id}
          board={b}
          isActive={activeBoardId === b.id}
          isEditing={editingId === b.id}
          editName={editName}
          setEditName={setEditName}
          saathiColor={saathiColor}
          menuId={menuId}
          onSelect={() => handleSelect(b)}
          onMenuToggle={() => setMenuId(menuId === b.id ? null : b.id)}
          onStartRename={() => { setEditingId(b.id); setEditName(b.name); setMenuId(null) }}
          onRename={() => handleRename(b.id)}
          onTogglePin={() => handleTogglePin(b)}
          onArchive={() => handleArchive(b)}
          onOpenColumn={() => {
            window.dispatchEvent(new CustomEvent('board:open-column', {
              detail: { id: b.id, name: b.name, emoji: b.emoji, focus_statement: b.focus_statement, board_type: b.board_type },
            }))
          }}
        />
      ))}

      {/* ── + New Board ──────────────────────────────────────────────── */}
      <button
        onClick={onNewBoard}
        className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-black/[0.03]"
        style={{ cursor: 'pointer' }}
      >
        <span style={{ fontSize: '16px', lineHeight: 1, color: saathiColor }}>+</span>
        <span className="text-xs font-medium" style={{ color: 'var(--text-tertiary)' }}>
          New Board
        </span>
      </button>

      {/* ── Suggest a Faculty ────────────────────────────────────────── */}
      <button
        onClick={() => window.dispatchEvent(new CustomEvent('nominate:open'))}
        className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors hover:bg-black/[0.03]"
        style={{ cursor: 'pointer' }}
      >
        <span style={{ fontSize: '16px', lineHeight: 1 }}>👨‍🏫</span>
        <div className="min-w-0">
          <span className="block truncate text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
            Suggest a Faculty
          </span>
          <span className="block text-[10px]" style={{ color: 'var(--text-ghost)' }}>
            Know someone great? Bring them on board.
          </span>
        </div>
      </button>

    </div>
  )
}

// ── Sub-components ───────────────────────────────────────────────────────────

function BoardRow({
  board: b,
  isActive,
  isEditing,
  editName,
  setEditName,
  saathiColor,
  menuId,
  onSelect,
  onMenuToggle,
  onStartRename,
  onRename,
  onTogglePin,
  onArchive,
  onOpenColumn,
}: {
  board: { id: string; name: string; emoji: string; focus_statement: string | null; board_type: string; is_pinned: boolean; exam_target_id: string | null }
  isActive: boolean
  isEditing: boolean
  editName: string
  setEditName: (v: string) => void
  saathiColor: string
  menuId: string | null
  onSelect: () => void
  onMenuToggle: () => void
  onStartRename: () => void
  onRename: () => void
  onTogglePin: () => void
  onArchive: () => void
  onOpenColumn: () => void
}) {
  // Exam countdown — resolve from registry
  const examDate = b.exam_target_id ? inferExamDate(b.exam_target_id) : null
  const examDaysLeft = examDate ? daysUntilExam(examDate) : null

  return (
    <div className="group relative">
      <button
        onClick={() => !isEditing && onSelect()}
        className="flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors"
        style={{
          background: isActive
            ? `${saathiColor}12`
            : 'var(--bg-elevated, rgba(0,0,0,0.02))',
          borderLeft: isActive ? `2px solid ${saathiColor}` : '2px solid transparent',
        }}
      >
        <span style={{ fontSize: '16px', lineHeight: 1 }}>{b.emoji}</span>
        <div className="min-w-0 flex-1">
          {isEditing ? (
            <form
              onSubmit={(e) => { e.preventDefault(); onRename() }}
              onClick={(e) => e.stopPropagation()}
            >
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value.slice(0, 60))}
                onBlur={onRename}
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
              {b.name}
            </span>
          )}
          {/* Exam countdown — e.g. "47 days left" */}
          {examDaysLeft !== null && examDaysLeft >= 0 && !isEditing && (
            <span
              className="block text-[10px]"
              style={{ color: examDaysLeft <= 7 ? '#EF4444' : 'var(--text-ghost)' }}
            >
              {examDaysLeft === 0 ? 'Today!' : `${examDaysLeft} day${examDaysLeft === 1 ? '' : 's'} left`}
            </span>
          )}
        </div>

        {/* ⊞ open in column — visible on hover, desktop only */}
        {!isEditing && (
          <button
            onClick={(e) => { e.stopPropagation(); onOpenColumn() }}
            className="hidden shrink-0 rounded px-1 py-0.5 text-xs transition-opacity group-hover:opacity-100 md:block"
            style={{
              color: 'var(--text-ghost)',
              opacity: 0,
            }}
            title="Open in new column"
          >
            ⊞
          </button>
        )}

        {/* ⋮ menu trigger — visible on hover or when menu open */}
        {!isEditing && (
          <button
            onClick={(e) => { e.stopPropagation(); onMenuToggle() }}
            className="shrink-0 rounded px-1 py-0.5 text-xs transition-opacity group-hover:opacity-100"
            style={{
              color: 'var(--text-ghost)',
              opacity: menuId === b.id || isActive ? 1 : 0,
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
            <MenuBtn onClick={onStartRename}>✏️ Rename</MenuBtn>
            <MenuBtn onClick={onTogglePin}>
              {b.is_pinned ? '📌 Unpin' : '📌 Pin'}
            </MenuBtn>
            {b.board_type !== 'general' && (
              <MenuBtn onClick={onArchive} style={{ color: '#EF4444' }}>
                🗑️ Archive
              </MenuBtn>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

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
