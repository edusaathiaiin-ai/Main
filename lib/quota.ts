/**
 * lib/quota.ts
 *
 * Client-side quota tracking (optimistic / local).
 * Uses expo-secure-store so quota state survives app restarts.
 *
 * Per-plan limits:
 *   free:      5  chats / day, 48h cooling
 *   plus:      20 chats / day, 48h cooling
 *   pro:       50 chats / day, 24h cooling
 *   unlimited: effectively unlimited, 0h cooling (midnight IST reset only)
 *
 * coolingHours: 0 → no cooling period, quota resets at midnight IST.
 */

import * as SecureStore from 'expo-secure-store';
import { getPlan } from '@/constants/plans';
import type { PlanId } from '@/constants/plans';

type QuotaRecord = {
  date: string;
  used: number;
  coolingUntil: number | null;
};

type QuotaStore = Record<string, QuotaRecord>;

export type QuotaKeyParams = {
  userId: string;
  saathiId: string;
  botSlot: 1 | 2 | 3 | 4 | 5;
  /** Optional: pass planId so quota limits reflect user's actual plan */
  planId?: string | null;
};

export type QuotaState = {
  limit: number;
  used: number;
  remaining: number;
  coolingUntil: Date | null;
  isCooling: boolean;
};

const STORE_KEY = 'edusaathiai.quota.v2';
let memoryStore: QuotaStore = {};

// ── Date helpers ──────────────────────────────────────────────────────────────

/** Today's date in IST (UTC+5:30), returned as YYYY-MM-DD */
function todayIST(): string {
  const now = new Date();
  const ist = new Date(now.getTime() + 330 * 60 * 1000);
  return ist.toISOString().slice(0, 10);
}

/** Milliseconds until midnight IST */
function msUntilMidnightIST(): number {
  const now = new Date();
  const ist = new Date(now.getTime() + 330 * 60 * 1000);
  const midnight = new Date(ist);
  midnight.setUTCHours(18, 30, 0, 0); // 18:30 UTC = midnight IST
  if (midnight <= ist) midnight.setUTCDate(midnight.getUTCDate() + 1);
  return midnight.getTime() - now.getTime();
}

// ── Store helpers ─────────────────────────────────────────────────────────────

function buildQuotaKey(params: QuotaKeyParams): string {
  return [params.userId, params.saathiId, String(params.botSlot)].join(':');
}

async function readStore(): Promise<QuotaStore> {
  try {
    const raw = await SecureStore.getItemAsync(STORE_KEY);
    if (!raw) return memoryStore;
    const parsed = JSON.parse(raw) as QuotaStore;
    memoryStore = parsed;
    return parsed;
  } catch {
    return memoryStore;
  }
}

async function writeStore(next: QuotaStore): Promise<void> {
  memoryStore = next;
  try {
    await SecureStore.setItemAsync(STORE_KEY, JSON.stringify(next));
  } catch {
    // Ignore — in-memory fallback still works for the session
  }
}

// ── Plan-aware limit helpers ──────────────────────────────────────────────────

function getPlanLimits(planId: string | null | undefined): { dailyLimit: number; coolingMs: number } {
  const plan = getPlan(planId as PlanId | null);
  return {
    dailyLimit: plan.dailyChatLimit,
    coolingMs: plan.coolingHours > 0 ? plan.coolingHours * 60 * 60 * 1000 : 0,
  };
}

// ── Record normalisation ──────────────────────────────────────────────────────

function normalizeRecord(
  record: QuotaRecord | undefined,
  coolingMs: number
): QuotaRecord {
  const today = todayIST();
  const now = Date.now();

  // Cooling expired?
  const coolingUntil =
    record?.coolingUntil && record.coolingUntil > now ? record.coolingUntil : null;

  // New day → reset count (but preserve cooling if still active)
  if (!record || record.date !== today) {
    return { date: today, used: 0, coolingUntil };
  }

  // Cooling period ended → clear it
  if (record.coolingUntil && record.coolingUntil <= now) {
    return { ...record, coolingUntil: null };
  }

  return record;
}

function toQuotaState(record: QuotaRecord, dailyLimit: number): QuotaState {
  const used = Math.min(record.used, dailyLimit);
  const remaining = Math.max(0, dailyLimit - used);
  const coolingUntil = record.coolingUntil ? new Date(record.coolingUntil) : null;
  const isCooling = Boolean(coolingUntil && coolingUntil.getTime() > Date.now());

  return { limit: dailyLimit, used, remaining, coolingUntil, isCooling };
}

// ── Public API ────────────────────────────────────────────────────────────────

export async function getQuotaState(params: QuotaKeyParams): Promise<QuotaState> {
  const { dailyLimit, coolingMs } = getPlanLimits(params.planId);
  const store = await readStore();
  const key = buildQuotaKey(params);
  const record = normalizeRecord(store[key], coolingMs);

  if (store[key] !== record) {
    await writeStore({ ...store, [key]: record });
  }

  return toQuotaState(record, dailyLimit);
}

export async function consumeQuota(params: QuotaKeyParams): Promise<QuotaState> {
  const { dailyLimit, coolingMs } = getPlanLimits(params.planId);
  const store = await readStore();
  const key = buildQuotaKey(params);
  const current = normalizeRecord(store[key], coolingMs);

  if (current.used >= dailyLimit) {
    const capped = { ...current, used: dailyLimit };
    await writeStore({ ...store, [key]: capped });
    return toQuotaState(capped, dailyLimit);
  }

  const nextUsed = current.used + 1;
  const hitLimit = nextUsed >= dailyLimit;

  let newCoolingUntil = current.coolingUntil;
  if (hitLimit && coolingMs > 0) {
    // Set cooling period
    newCoolingUntil = Date.now() + coolingMs;
  } else if (hitLimit && coolingMs === 0) {
    // Unlimited plan — cooling resets at midnight IST, not via coolingUntil
    newCoolingUntil = Date.now() + msUntilMidnightIST();
  }

  const next: QuotaRecord = {
    date: current.date,
    used: nextUsed,
    coolingUntil: newCoolingUntil,
  };

  await writeStore({ ...store, [key]: next });
  return toQuotaState(next, dailyLimit);
}

// Legacy exports kept for backward compatibility
export const DAILY_CHAT_LIMIT = 20;
export const COOLING_HOURS = 48;
export const COOLING_MS = COOLING_HOURS * 60 * 60 * 1000;
