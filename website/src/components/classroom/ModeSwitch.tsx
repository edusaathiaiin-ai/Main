'use client'

import { useEffect, useRef } from 'react'
import { useMyPresence, useOthers } from './liveblocks.config'

type Props = {
  isFaculty: boolean
  classroomMode: 'standard' | 'interactive'
  onModeChange: (mode: 'standard' | 'interactive') => void
  accentColor: string
}

/**
 * Faculty-only toggle button — rendered outside Liveblocks context.
 * Pure UI, no hooks. Presence sync handled by ModeSyncBridge inside the provider.
 */
export function ModeSwitch({ isFaculty, classroomMode, onModeChange, accentColor }: Props) {
  if (!isFaculty) return null

  const isInteractive = classroomMode === 'interactive'

  return (
    <button
      onClick={() => onModeChange(isInteractive ? 'standard' : 'interactive')}
      className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all"
      style={{
        background: isInteractive ? `${accentColor}15` : 'var(--bg-elevated)',
        border: `1.5px solid ${isInteractive ? accentColor : 'var(--border-subtle)'}`,
        color: isInteractive ? accentColor : 'var(--text-tertiary)',
        cursor: 'pointer',
      }}
      title={isInteractive ? 'Switch to Standard (video only)' : 'Switch to Interactive (video + tools)'}
    >
      <span style={{ fontSize: '12px' }}>{isInteractive ? '🧪' : '📹'}</span>
      {isInteractive ? 'Interactive' : 'Standard'}
    </button>
  )
}

/**
 * Renders inside ClassroomRoomProvider. Two jobs:
 * 1. Faculty: broadcasts classroomMode changes via presence
 * 2. Student: follows faculty's presence mode automatically
 */
export function ModeSyncBridge({
  isFaculty,
  classroomMode,
  onModeChange,
}: {
  isFaculty: boolean
  classroomMode: 'standard' | 'interactive'
  onModeChange: (mode: 'standard' | 'interactive') => void
}) {
  const [, updatePresence] = useMyPresence()
  const others = useOthers()
  const onModeChangeRef = useRef(onModeChange)
  onModeChangeRef.current = onModeChange

  // Faculty: broadcast mode changes to presence
  useEffect(() => {
    if (isFaculty) {
      updatePresence({ classroomMode })
    }
  }, [isFaculty, classroomMode, updatePresence])

  // Student: follow faculty's mode
  const facultyUser = others.find(o => o.presence.role === 'faculty')
  const facultyMode = facultyUser?.presence.classroomMode

  useEffect(() => {
    if (!isFaculty && facultyMode) {
      onModeChangeRef.current(facultyMode)
    }
  }, [isFaculty, facultyMode])

  return null
}
