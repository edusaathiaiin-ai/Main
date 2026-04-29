// Deno-side mirror of website/src/lib/classroom/selectVideoProvider.ts
//
// Source of truth for the matrix is website/CLAUDE.md ("Classroom — Video
// Provider Selection Matrix"). Edge functions cannot import from the
// website tree, so the same logic lives here. Keep the two files in lock-
// step — if you change one, change the other.

export type VideoProvider = 'whereby' | 'google_meet'
export type SessionType   = 'faculty_session' | 'live_session'

export const SMALL_GROUP_THRESHOLD = 25

export function selectVideoProvider(
  sessionType: SessionType,
  bookedStudentCount: number,
  priceInPaise: number = 0,
): VideoProvider {
  if (sessionType === 'faculty_session') {
    return priceInPaise === 0 ? 'google_meet' : 'whereby'
  }
  return bookedStudentCount < SMALL_GROUP_THRESHOLD ? 'whereby' : 'google_meet'
}
