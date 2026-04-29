// ─────────────────────────────────────────────────────────────────────────────
// selectVideoProvider — pure routing decision, no side effects.
//
//   1:1 free        → google_meet  (faculty earns Whereby by charging)
//   1:1 paid        → whereby      (intimate iframe is part of what they paid for)
//   group, < 25     → whereby      (small group — iframe still feels right)
//   group, >= 25    → google_meet  (cost gap matters at scale)
//
// 'in_app' (100ms.live peer tiles) is a separate route picked at session
// creation via classroom_mode='in_app'; this selector never returns it.
//
// See project_whereby_iframe_video.md for the parked decision background.
// ─────────────────────────────────────────────────────────────────────────────

export type VideoProvider = 'whereby' | 'google_meet'
export type SessionType   = 'faculty_session' | 'live_session'

export const SMALL_GROUP_THRESHOLD = 25

export function selectVideoProvider(
  sessionType: SessionType,
  bookedStudentCount: number,
  priceInPaise: number = 0,   // default 0 = free
): VideoProvider {

  if (sessionType === 'faculty_session') {
    // Free 1:1 → Google Meet (faculty earns Whereby through paid sessions)
    // Paid 1:1 → Whereby (beautiful embedded experience)
    return priceInPaise === 0 ? 'google_meet' : 'whereby'
  }

  // Group sessions — threshold logic
  return bookedStudentCount < SMALL_GROUP_THRESHOLD ? 'whereby' : 'google_meet'
}
