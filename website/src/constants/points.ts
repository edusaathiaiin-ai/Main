// ─── Saathi Points — constants and helpers ────────────────────────────────────

export const POINTS_PER_ACTION = {
  chat_session:    10,   // first chat of the day per Saathi
  checkin:         25,   // learning check-in completed
  flashcard_saved:  5,   // flashcard saved from chat
  board_question:  15,   // question posted to community board
  sketch_upload:   10,   // sketch uploaded and analysed
  faculty_session: 30,   // faculty 1:1 session booked
  shell_broken:   100,   // depth milestone (flame stage change)
  // streak_bonus: 50 — handled server-side in RPC
} as const

export type PointAction = keyof typeof POINTS_PER_ACTION

// ─── Unlock thresholds ────────────────────────────────────────────────────────
// threshold = points needed for the Nth additional Saathi

export const UNLOCK_THRESHOLDS = [
  { saathiNumber: 2, points: 500  },
  { saathiNumber: 3, points: 1200 },
  { saathiNumber: 4, points: 2500 },
  { saathiNumber: 5, points: 4000 },
  { saathiNumber: 6, points: 5500 },
] as const

// ─── Next threshold from current total ───────────────────────────────────────

export function getNextThreshold(totalPoints: number, enrolledCount: number): {
  points: number
  saathiNumber: number
} | null {
  const next = UNLOCK_THRESHOLDS.find((t) => t.saathiNumber > enrolledCount)
  return next ?? null
}

// ─── Progress to next unlock ─────────────────────────────────────────────────

export function getProgressToNext(
  totalPoints:   number,
  enrolledCount: number,
): {
  current:       number  // points at start of this tier
  target:        number  // points needed for next unlock
  progress:      number  // 0–1
  pointsNeeded:  number
} | null {
  const nextThreshold = UNLOCK_THRESHOLDS.find(
    (t) => t.saathiNumber > enrolledCount
  )
  if (!nextThreshold) return null

  const prevThreshold = UNLOCK_THRESHOLDS.find(
    (t) => t.saathiNumber === nextThreshold.saathiNumber - 1
  )
  const tierStart = prevThreshold?.points ?? 0
  const tierEnd   = nextThreshold.points

  const progress = Math.min(
    1,
    Math.max(0, (totalPoints - tierStart) / (tierEnd - tierStart))
  )

  return {
    current:      tierStart,
    target:       tierEnd,
    progress,
    pointsNeeded: Math.max(0, tierEnd - totalPoints),
  }
}

// ─── Point label helpers ──────────────────────────────────────────────────────

export function formatPoints(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return String(n)
}

export function getPointsLabel(action: PointAction, isPlus: boolean): string {
  const base = POINTS_PER_ACTION[action]
  const final = isPlus ? Math.round(base * 1.5) : base
  return `+${final} SP`
}

// ─── Action descriptions (shown in points log) ───────────────────────────────

export const ACTION_LABELS: Record<string, string> = {
  chat_session:    'Daily Saathi session',
  checkin:         'Learning check-in',
  flashcard_saved: 'Flashcard saved',
  board_question:  'Community question',
  sketch_upload:   'Sketch analysed',
  faculty_session: 'Faculty session booked',
  shell_broken:    'Depth milestone reached',
  streak_bonus:    '7-day streak bonus! 🔥',
  plus_bonus:      'Plus member bonus ✦',
  saathi_unlock:   'Saathi unlocked',
  admin_grant:     'Admin grant',
}
