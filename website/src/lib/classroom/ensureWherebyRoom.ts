// ─────────────────────────────────────────────────────────────────────────────
// ensureWherebyRoom — idempotent Whereby-room provisioner.
//
// Returns the (roomUrl, hostRoomUrl) pair for a session, creating the room
// lazily on first call and reusing the cached URLs on every call after.
// Persists newly-created URLs onto the session row so refresh / second-
// device / Phase-2 re-runs all see the same room.
//
// Caller responsibilities:
//   - Pass scheduledAt + durationMinutes (lookups vary by table — for
//     live_sessions these live on live_lectures, not on the session row).
//   - Provide a service-role Supabase client (this helper writes the
//     cached URL columns and must bypass RLS).
//
// Throws if Whereby's REST API rejects the request. Callers wrap with the
// "fall back to google_meet on Whereby outage" rule from the matrix.
// ─────────────────────────────────────────────────────────────────────────────

import type { SupabaseClient } from '@supabase/supabase-js'
import { createWherebyRoom } from './createWherebyRoom'

export type WherebyRoomTable = 'live_sessions' | 'faculty_sessions'

export type EnsureWherebyRoomInput = {
  id:               string
  title:            string
  scheduledAt:      string
  durationMinutes:  number
  whereby_room_id:  string | null
  whereby_room_url: string | null
  whereby_host_url: string | null
}

export async function ensureWherebyRoom(
  session: EnsureWherebyRoomInput,
  tableType: WherebyRoomTable,
  admin: SupabaseClient,
): Promise<{ roomUrl: string; hostRoomUrl: string }> {
  // Cached path — already provisioned; reuse without burning a new room.
  if (session.whereby_room_id && session.whereby_room_url && session.whereby_host_url) {
    return {
      roomUrl:     session.whereby_room_url,
      hostRoomUrl: session.whereby_host_url,
    }
  }

  // Cold path — create the room and persist the URLs back to the row.
  const created = await createWherebyRoom({
    sessionId:       session.id,
    title:           session.title,
    scheduledAt:     session.scheduledAt,
    durationMinutes: session.durationMinutes,
  })

  await admin
    .from(tableType)
    .update({
      whereby_room_id:  created.roomId,
      whereby_room_url: created.roomUrl,
      whereby_host_url: created.hostRoomUrl,
    })
    .eq('id', session.id)

  return {
    roomUrl:     created.roomUrl,
    hostRoomUrl: created.hostRoomUrl,
  }
}
