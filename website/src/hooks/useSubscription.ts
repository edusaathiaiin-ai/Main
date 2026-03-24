'use client';

import { useAuthStore } from '@/stores/authStore';
import { getPlan } from '@/constants/plans';
import type { Plan } from '@/constants/plans';

export function useSubscription(): {
  plan: Plan;
  planId: string;
  isActive: boolean;
  isPaused: boolean;
  expiresAt: string | null;
} {
  const { profile } = useAuthStore();

  const rawPlanId = profile?.plan_id ?? 'free';
  const status = profile?.subscription_status ?? 'inactive';
  const isPaused = status === 'paused';
  const effectivePlanId = isPaused ? 'free' : rawPlanId;
  const plan = getPlan(effectivePlanId);
  const isActive = status === 'active' || rawPlanId === 'free';

  return {
    plan,
    planId: effectivePlanId,
    isActive,
    isPaused,
    expiresAt: profile?.subscription_expires_at ?? null,
  };
}
