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
    >
      {children}
    </RoomProvider>
  )
}
