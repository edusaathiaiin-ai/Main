import { createClient } from '@liveblocks/client'
import { createRoomContext } from '@liveblocks/react'

const client = createClient({
  publicApiKey: process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY!,
})

// Presence: cursor position + user info + classroom mode
type Presence = {
  cursor: { x: number; y: number } | null
  name: string
  role: 'faculty' | 'student'
  classroomMode: 'standard' | 'interactive'
}

// Storage: tldraw document synced via Yjs (no Liveblocks storage needed)
type Storage = Record<string, never>

// Events: broadcast questions, homework, etc.
type RoomEvent =
  | { type: 'question'; id: string; studentName: string; text: string; timestamp: string }
  | { type: 'question_seen'; id: string }
  | { type: 'question_addressed'; id: string }

export const {
  RoomProvider,
  useRoom,
  useMyPresence,
  useOthers,
  useSelf,
  useBroadcastEvent,
  useEventListener,
} = createRoomContext<Presence, Storage, never, RoomEvent>(client)
