// ─────────────────────────────────────────────────────────────────────────────
// subjectBoundary.ts — soft informational check when a faculty creates a
// Curriculum session for a Saathi outside their registered subject.
//
// Design rule locked with user (2026-04-23):
//   - Faculty autonomy is absolute. No admin approval, no block, no gate.
//   - Story + Broader Context sessions never trip any check — the whole
//     point of those natures is range beyond the syllabus.
//   - Curriculum sessions get a *soft informational line* when the Saathi
//     doesn't match the faculty's registered primary Saathi. Students decide.
//
// Pure function — no DB access, no side effects. Callers (session-create
// forms, 1:1 accept flow) render the returned warning string if non-null.
// ─────────────────────────────────────────────────────────────────────────────

import { SessionNature } from '@/constants/sessionNatures'

export type SubjectBoundaryResult = {
  /** Informational copy to render near the Saathi picker. `null` means no
   *  warning — the caller should render nothing (not an empty card). */
  warning: string | null
}

export function checkSubjectBoundary(
  sessionSaathiSlug: string,
  facultyPrimarySlug: string,
  sessionNature: SessionNature
): SubjectBoundaryResult {
  // Story + Broader Context — no check at all. Range is the feature.
  if (sessionNature === 'story' || sessionNature === 'broader_context') {
    return { warning: null }
  }

  // Curriculum — soft informational note only. Never a block.
  if (sessionSaathiSlug !== facultyPrimarySlug) {
    return {
      warning:
        'This topic is outside your registered subject area. If your expertise covers it — go ahead. Students will decide.',
    }
  }

  return { warning: null }
}
