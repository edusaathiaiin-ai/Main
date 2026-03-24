/**
 * lib/quota.ts
 *
 * Client-side quota state helpers for the web app.
 * Reads from /api/quota (server action) rather than SecureStore (mobile).
 * The Edge Function enforces hard limits; this is optimistic client cache.
 */

import { getPlan, type PlanId } from '@/constants/plans';
import type { QuotaState } from '@/types';

export type QuotaKeyParams = {
  userId: string;
  saathiId: string;
  botSlot: 1 | 2 | 3 | 4 | 5;
  planId?: string | null;
};

// ── Date helpers ──────────────────────────────────────────────────────────────

/** Today's date in IST (UTC+5:30), returned as YYYY-MM-DD */
export function todayIST(): string {
  const now = new Date();
  const ist = new Date(now.getTime() + 330 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}

/** Milliseconds until midnight IST */
export function msUntilMidnightIST(): number {
  const now = new Date();
  const ist = new Date(now.getTime() + 330 * 60 * 1000);
  const midnight = new Date(ist);
  midnight.setUTCHours(18, 30, 0, 0);
  if (midnight <= ist) midnight.setUTCDate(midnight.getUTCDate() + 1);
  return midnight.getTime() - now.getTime();
}

// ── Plan helpers ──────────────────────────────────────────────────────────────

export function getPlanLimits(planId: string | null | undefined): {
  dailyLimit: number;
  coolingMs: number;
} {
  const plan = getPlan(planId as PlanId | null);
  return {
    dailyLimit: plan.dailyChatLimit,
    coolingMs: plan.coolingHours > 0 ? plan.coolingHours * 60 * 60 * 1000 : 0,
  };
}

// ── Quota state builder ───────────────────────────────────────────────────────

export function buildQuotaState(
  messageCount: number,
  coolingUntil: string | null,
  planId: string | null | undefined
): QuotaState {
  const { dailyLimit } = getPlanLimits(planId);
  const used = Math.min(messageCount, dailyLimit);
  const remaining = Math.max(0, dailyLimit - used);
  const coolingDate = coolingUntil ? new Date(coolingUntil) : null;
  const isCooling = Boolean(coolingDate && coolingDate.getTime() > Date.now());

  return {
    limit: dailyLimit,
    used,
    remaining,
    coolingUntil: isCooling ? coolingDate : null,
    isCooling,
  };
}

// Legacy exports for backward compatibility
export const DAILY_CHAT_LIMIT = 20;
export const COOLING_HOURS = 48;
export const COOLING_MS = COOLING_HOURS * 60 * 60 * 1000;
