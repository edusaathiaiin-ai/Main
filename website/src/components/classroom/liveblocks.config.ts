import { createClient } from '@liveblocks/client'
import { createRoomContext } from '@liveblocks/react'

/**
 * Liveblocks client + room context for the classroom surface.
 *
 * ── Why this file is defensive ────────────────────────────────────────
 *
 * The previous version passed `process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY!`
 * directly into createClient. The non-null assertion was a TypeScript-only
 * hint — at runtime, an undefined value made createClient throw at module
 * load, taking down the entire /classroom/[id] route bundle. The browser
 * showed Chrome's generic "This page couldn't load" error with no React
 * boundary catching it.
 *
 * That happened on 2026-04-25 in production: the env var existed in
 * Vercel but was scoped only to the deprecated `classroom` git branch.
 * The Production target had no value, so the build baked in `undefined`
 * and every classroom visit died at module load. (Fixed by widening the
 * Vercel scope to Production + Preview + Development.)
 *
 * Lesson: a missing third-party key should DEGRADE the surface, not
 * delete it. So this config now:
 *
 *   1. Reads the env var via String() with a string fallback. If
 *      missing, uses 'pk_unset_single_user_mode' — Liveblocks will
 *      fail the connection (401) but createClient itself returns
 *      cleanly. Module loads. Page renders.
 *
 *   2. Exports `liveblocksAvailable` (boolean). The classroom
 *      page can read this to render a "Multiplayer offline" banner
 *      so faculty know the canvas isn't syncing to students.
 *
 *   3. Logs a clear console warning in the browser when the key is
 *      missing — observability without a runtime crash.
 *
 * What works in single-user mode (key missing):
 *   - All Saathi-specific tool panels (RCSB, PubMed, Wolfram, etc.)
 *   - Faculty's local tldraw canvas (just no sync to students)
 *   - Note builder, AI command bar, formula bar
 *   - Question queue (writes to Postgres directly, not via broadcast —
 *     events sync but with a small delay through poll-on-mount)
 *
 * What breaks in single-user mode:
 *   - Real-time canvas sync between faculty and students (Yjs over
 *     Liveblocks)
 *   - Live presence (who's joined, cursor positions)
 *   - Room broadcast events (mode switches, instant question
 *     notifications)
 */

const PUBLIC_KEY = process.env.NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY

/**
 * True iff a public key was injected at build time. Components that
 * depend on real-time sync should check this and render a graceful
 * fallback when it's false (e.g. a "Multiplayer offline" notice).
 */
export const liveblocksAvailable = Boolean(PUBLIC_KEY && PUBLIC_KEY.length > 0)

if (!liveblocksAvailable && typeof window !== 'undefined') {
  // eslint-disable-next-line no-console
  console.warn(
    '[liveblocks] NEXT_PUBLIC_LIVEBLOCKS_PUBLIC_KEY is not set. ' +
    'The classroom is loading in single-user mode — canvas sync, ' +
    'presence, and broadcast events are disabled. Set the env var ' +
    'in Vercel (or your local Doppler) to enable multiplayer.',
  )
}

const client = createClient({
  // Stub key keeps createClient from throwing at module load. Real
  // connection attempts will return 401 from Liveblocks's auth and
  // the Room will sit in a permanently-disconnected state — hooks
  // return safe defaults, the page stays interactive.
  publicApiKey: PUBLIC_KEY ?? 'pk_unset_single_user_mode',
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
