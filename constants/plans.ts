/**
 * constants/plans.ts
 *
 * Canonical plan definitions for EdUsaathiAI.
 * 4 tiers: free, plus, pro, unlimited.
 *
 * IMPORTANT: plan_id values here must match profiles.plan_id in Supabase.
 * dailyChatLimit and coolingHours are enforced BOTH in the Edge Function
 * (server-side) and in useQuota (client-side optimistic).
 * coolingHours: 0 means NO cooling — quota resets at midnight IST daily.
 */

export type PlanId = 'free' | 'plus' | 'pro' | 'unlimited';

export type Plan = {
  id: PlanId;
  name: string;
  priceMonthly: number;
  priceAnnual: number | null;    // null = no annual option
  billing: 'free' | 'monthly' | 'annual';
  dailyChatLimit: number;
  coolingHours: number;          // 0 = never cool, reset midnight IST
  allowedBotSlots: number[];
  maxSaathis: number;
  checkinsPerMonth: number | null; // null = unlimited
  canExportNotes: boolean;
  canPause: boolean;
  refundPolicy: 'na' | 'prorata' | 'none';
  priorityResponse?: boolean;
  fastestResponse?: boolean;
  badge?: string;
};

export const PLAN_CONFIG: Record<PlanId, Plan> = {
  free: {
    id: 'free',
    name: 'Saathi Free',
    priceMonthly: 0,
    priceAnnual: 0,
    billing: 'free',
    dailyChatLimit: 5,
    coolingHours: 48,
    allowedBotSlots: [1, 5],
    maxSaathis: 1,
    checkinsPerMonth: 1,
    canExportNotes: false,
    canPause: false,
    refundPolicy: 'na',
  },
  plus: {
    id: 'plus',
    name: 'Saathi Plus',
    priceMonthly: 199,
    priceAnnual: 1499,
    billing: 'monthly',
    dailyChatLimit: 20,
    coolingHours: 48,
    allowedBotSlots: [1, 2, 3, 4, 5],
    maxSaathis: 20,
    checkinsPerMonth: null,
    canExportNotes: true,
    canPause: true,
    refundPolicy: 'prorata',
  },
  pro: {
    id: 'pro',
    name: 'Saathi Pro',
    priceMonthly: 499,
    priceAnnual: 3999,
    billing: 'monthly',
    dailyChatLimit: 50,
    coolingHours: 24,
    allowedBotSlots: [1, 2, 3, 4, 5],
    maxSaathis: 20,
    checkinsPerMonth: null,
    canExportNotes: true,
    canPause: true,
    refundPolicy: 'prorata',
    priorityResponse: true,
    badge: '🚀 Pro',
  },
  unlimited: {
    id: 'unlimited',
    name: 'Saathi Unlimited',
    priceMonthly: 4999,
    priceAnnual: null,
    billing: 'monthly',
    dailyChatLimit: 9999,          // effectively unlimited
    coolingHours: 0,               // ZERO cooling — resets midnight IST
    allowedBotSlots: [1, 2, 3, 4, 5],
    maxSaathis: 20,
    checkinsPerMonth: null,
    canExportNotes: true,
    canPause: true,
    refundPolicy: 'none',
    priorityResponse: true,
    fastestResponse: true,
    badge: '🔥 Unlimited',
  },
};

/** Ordered list of plans for display in pricing UI */
export const PLANS: Plan[] = [
  PLAN_CONFIG.free,
  PLAN_CONFIG.plus,
  PLAN_CONFIG.pro,
  PLAN_CONFIG.unlimited,
];

export const PAID_PLANS: Plan[] = PLANS.filter((p) => p.id !== 'free');

/** Look up plan from a raw plan_id string (falls back to free) */
/** Extract the tier from a DB plan_id like 'plus-monthly' → 'plus' */
export function getPlanTier(planId: string | null | undefined): PlanId {
  if (!planId || planId === 'free') return 'free';
  if (planId.startsWith('plus')) return 'plus';
  if (planId.startsWith('pro')) return 'pro';
  if (planId.startsWith('unlimited')) return 'unlimited';
  return 'free';
}

export function getPlan(planId: string | null | undefined): Plan {
  const direct = PLAN_CONFIG[(planId ?? 'free') as PlanId];
  if (direct) return direct;
  return PLAN_CONFIG[getPlanTier(planId)] ?? PLAN_CONFIG.free;
}

// ── Free trial config — first 7 days after signup ──────────────────────────
export const FREE_TRIAL_DAYS = 7;
export const FREE_TRIAL_DAILY_LIMIT = 10;
export const FREE_TRIAL_ALLOWED_SLOTS = [1, 2, 3, 4, 5];

/** Returns true if the account is within the 7-day free trial window */
export function isInFreeTrial(createdAt: string | null | undefined): boolean {
  if (!createdAt) return false;
  const created = new Date(createdAt).getTime();
  const now = Date.now();
  return now - created < FREE_TRIAL_DAYS * 24 * 60 * 60 * 1000;
}

/** Razorpay plan IDs accepted by razorpay-order Edge Function */
export type RazorpayPlanId = 'plus' | 'pro' | 'unlimited';
