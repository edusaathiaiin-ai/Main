'use client'

import { ReactNode } from 'react'
import { RoomProvider } from './liveblocks.config'

/**
 * Wraps children in a Liveblocks room scoped to the session ID.
 * Room ID = session UUID — one room per live session.
 */
export function ClassroomRoomProvider({
  sessionId,
  userName,
  userRole,
  classroomMode,
  children,
}: {
  sessionId: string
  userName: string
  userRole: 'faculty' | 'student'
  classroomMode: 'standard' | 'interactive'
  children: ReactNode
}) {
  return (
    <RoomProvider
      id={`classroom-${sessionId}`}
      initialPresence={{
        cursor: null,
        name: userName,
        role: userRole,
        classroomMode,
      }}
      // Phase I-2 / Classroom #5 — progressive tab reveal. Empty array
      // at room creation; the classroom render layer always shows the
      // first plugin tab regardless, so "Draw is always present" holds
      // without baking a plugin-specific id in here.
      initialStorage={{
        unlockedTabs: [],
      }}
    >
      {children}
    </RoomProvider>
  )
}
