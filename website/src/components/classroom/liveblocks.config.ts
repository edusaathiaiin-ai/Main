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

export const {
  RoomProvider,
  useRoom,
  useMyPresence,
  useOthers,
  useSelf,
} = createRoomContext<Presence, Storage>(client)
