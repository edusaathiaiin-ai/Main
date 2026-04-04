/**
 * website/src/lib/date.ts
 *
 * IST-aware date helpers.
 * India does not observe DST — UTC+5:30 is constant.
 * Use these helpers anywhere a date string must match the server's quota_date_ist column.
 */

/** Returns today's date in IST as "YYYY-MM-DD" */
export function todayIST(): string {
  const now = new Date()
  const ist = new Date(now.getTime() + 330 * 60 * 1000) // UTC+5:30
  return ist.toISOString().split('T')[0]
}

/** Formats any Date in IST as "YYYY-MM-DD" */
export function toDateIST(d: Date): string {
  const ist = new Date(d.getTime() + 330 * 60 * 1000)
  return ist.toISOString().split('T')[0]
}
