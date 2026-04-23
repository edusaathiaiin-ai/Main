// ─────────────────────────────────────────────────────────────────────────────
// sessionNatures.ts — single source of truth for the three session natures
// (curriculum / broader_context / story) that cut across Live, Classroom, and
// 1:1 surfaces.
//
// The DB column is `session_nature` (migration 135) — we keep the TS naming
// aligned. Do NOT rename this to SessionType; a different column called
// session_type already exists on faculty_sessions (booking-flow status —
// doubt / research / deepdive) and collapsing the names has caused real bugs.
// See CLAUDE.md + project_branches_collapse_to_saathis.md context for the
// "give names distinct meanings" rule.
// ─────────────────────────────────────────────────────────────────────────────

export type SessionNature = 'curriculum' | 'broader_context' | 'story'

export type SessionNatureMeta = {
  id: SessionNature
  emoji: string
  label: string
  description: string
  /** One-line note on how the AI TA behaves in this nature — surfaced in the
   *  selector so faculty understand the tradeoff they're picking. */
  taNote: string
  color: string
  badgeBg: string
}

export const SESSION_NATURES: Record<SessionNature, SessionNatureMeta> = {
  curriculum: {
    id: 'curriculum',
    emoji: '\u{1F4DA}',
    label: 'Curriculum',
    description:
      'Syllabus-aligned teaching — doubts, concepts, exam prep.',
    taNote: 'AI TA assists fully with tools and research.',
    color: '#94A3B8',
    badgeBg: 'rgba(148,163,184,0.12)',
  },
  broader_context: {
    id: 'broader_context',
    emoji: '\u{1F310}',
    label: 'Broader Context',
    description:
      'Go beyond the syllabus — connect to industry, history, society, policy.',
    taNote: 'AI TA expands into real-world bridges.',
    color: '#60A5FA',
    badgeBg: 'rgba(96,165,250,0.12)',
  },
  story: {
    id: 'story',
    emoji: '✦',
    label: 'Story Session',
    description:
      "Lived experience and narrative — the faculty's voice, not a lecture.",
    taNote: 'AI TA stays quiet. Faculty-led narrative.',
    color: '#F59E0B',
    badgeBg: 'rgba(245,158,11,0.12)',
  },
}

/** Iteration order matches the user-visible tier from default → most distinct.
 *  Use this wherever you map over natures — relying on Object.values order is
 *  fine in practice but this is explicit. */
export const SESSION_NATURE_LIST: SessionNatureMeta[] = [
  SESSION_NATURES.curriculum,
  SESSION_NATURES.broader_context,
  SESSION_NATURES.story,
]
