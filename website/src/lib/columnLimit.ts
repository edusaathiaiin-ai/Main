export const COLUMN_LIMIT: Record<string, number> = {
  free: 1,
  trial: 1,
  'plus-monthly': 2,
  'plus-annual': 2,
  'pro-monthly': 3,
  'pro-annual': 3,
  unlimited: 3,
}

export function getColumnLimit(planId: string | null | undefined): number {
  if (!planId) return 1
  return COLUMN_LIMIT[planId] ?? 1
}
