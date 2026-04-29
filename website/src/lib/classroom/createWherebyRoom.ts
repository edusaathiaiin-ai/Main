// ─────────────────────────────────────────────────────────────────────────────
// createWherebyRoom — server-side wrapper around the Whereby Embedded API.
//
// Creates a one-off meeting room scoped to a single classroom session.
// Returns three things the caller persists onto live_sessions /
// faculty_sessions:
//
//   roomId       → whereby_room_id      (Whereby's internal handle)
//   roomUrl      → whereby_room_url     (student join URL — no controls)
//   hostRoomUrl  → whereby_host_url     (faculty join URL — moderator)
//
// Lazy creation: callers only invoke this when faculty actually clicks Join.
// The room URLs are then cached on the row so a refresh / second device
// reuses the same room instead of burning a new room per page load.
//
// endDate caps the room lifetime to scheduled_at + duration. Whereby
// auto-expires the room past that point — keeps the meeting list clean
// and prevents stragglers from rejoining hours after class.
//
// Server-side ONLY. WHEREBY_API_KEY is in Doppler prd; never bundle to
// the client. All calls go through /api/classroom/create-whereby-room.
// ─────────────────────────────────────────────────────────────────────────────

export async function createWherebyRoom(params: {
  sessionId: string
  title: string
  scheduledAt: string       // ISO string
  durationMinutes: number
}): Promise<{
  roomId:      string
  roomUrl:     string   // for students + faculty without controls
  hostRoomUrl: string   // for faculty — has moderator controls
}> {
  const endDate = new Date(
    new Date(params.scheduledAt).getTime()
    + params.durationMinutes * 60 * 1000
  ).toISOString()

  const res = await fetch('https://api.whereby.dev/v1/meetings', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.WHEREBY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      roomNamePrefix: 'edusaathiai',
      roomMode: 'group',
      endDate,
      fields: ['hostRoomUrl'],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Whereby room creation failed: ${err}`)
  }

  const data = await res.json()
  return {
    roomId:      data.meetingId,
    roomUrl:     data.roomUrl,
    hostRoomUrl: data.hostRoomUrl,
  }
}
