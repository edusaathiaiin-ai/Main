/**
 * hooks/useSubscription.ts
 *
 * Reads subscription state from the user's profile and exposes helpers.
 *
 * Key logic:
 * - Founding member grace: account created BEFORE FOUNDING_PERIOD_END
 *   AND within 60 days of account creation → auto isPremium
 * - After FOUNDING_PERIOD_END, no new founding members (date lock).
 * - Existing founding members keep their full 60-day grace regardless.
 * - plan_id: 'free' unless upgraded
 * - isPremium is true when: founding grace OR plan is active non-free
 * - PAYMENTS_ACTIVE flag: if false, everyone is treated as premium (dev mode)
 */

import { useMemo } from 'react';
import { useRouter } from 'expo-router';

import { useAuth } from './useAuth';
import { isPaymentsActive } from '@/lib/razorpay';

const SIXTY_DAYS_MS = 60 * 24 * 60 * 60 * 1000;

/**
 * Founding period end date — configurable via env for flexibility.
 * After this date, no new accounts can become founding members.
 * Accounts created BEFORE this date still get the full 60-day grace.
 */
const FOUNDING_PERIOD_END = new Date(
  process.env.EXPO_PUBLIC_FOUNDING_PERIOD_END ?? '2026-09-01'
);

export type SubscriptionState = {
  isPremium: boolean;
  isPaused: boolean;
  isFoundingMember: boolean;
  planId: string;
  subscriptionStatus: string;
  expiresAt: Date | null;
  pauseUntil: Date | null;
  daysUntilExpiry: number | null;
  openPricing: () => void;
  openPause: () => void;
};

export function useSubscription(): SubscriptionState {
  const { profile } = useAuth();
  const router = useRouter();

  const state = useMemo((): SubscriptionState => {
    const openPricing = () => router.push('/(tabs)/pricing');
    const openPause = () => router.push('/(tabs)/pause');

    if (!profile) {
      return {
        isPremium: false,
        isPaused: false,
        isFoundingMember: false,
        planId: 'free',
        subscriptionStatus: 'inactive',
        expiresAt: null,
        pauseUntil: null,
        daysUntilExpiry: null,
        openPricing,
        openPause,
      };
    }

    // Payments inactive = no restriction (everyone gets premium in dev/launch)
    if (!isPaymentsActive()) {
      return {
        isPremium: true,
        isPaused: false,
        isFoundingMember: false,
        planId: profile.plan_id ?? 'free',
        subscriptionStatus: 'active',
        expiresAt: null,
        pauseUntil: null,
        daysUntilExpiry: null,
        openPricing,
        openPause,
      };
    }

    const planId: string = profile.plan_id ?? 'free';
    const subscriptionStatus: string = profile.subscription_status ?? 'inactive';
    const expiresAtRaw = profile.subscription_expires_at ?? null;
    const expiresAt = expiresAtRaw ? new Date(expiresAtRaw) : null;
    const createdAt = new Date(profile.created_at ?? Date.now());

    // Founding member: BOTH conditions must be true
    //  1. Account was created before the founding period cutoff date
    //  2. The account is still within its 60-day grace window
    // This prevents new users after Sept 1 2026 from ever qualifying.
    const daysSinceCreation = Date.now() - createdAt.getTime();
    const isFoundingMember =
      createdAt < FOUNDING_PERIOD_END &&
      daysSinceCreation < SIXTY_DAYS_MS;

    // Premium if: founding member OR active non-free plan that hasn't expired
    // IMPORTANT: expiresAt must be explicitly in the future — plan_id alone
    // means nothing if the subscription expired last month.
    const isPaidActive =
      planId !== 'free' &&
      subscriptionStatus === 'active' &&
      expiresAt !== null &&
      expiresAt.getTime() > Date.now();

    const isPaused = profile.subscription_status === 'paused';
    const pauseUntil = profile.pause_until ? new Date(profile.pause_until) : null;

    // When paused, treat as not-premium (free tier limits apply)
    const isPremium = !isPaused && (isFoundingMember || isPaidActive);

    const daysUntilExpiry = expiresAt
      ? Math.max(0, Math.ceil((expiresAt.getTime() - Date.now()) / (1000 * 60 * 60 * 24)))
      : null;

    return {
      isPremium,
      isPaused,
      isFoundingMember,
      planId,
      subscriptionStatus,
      expiresAt,
      pauseUntil,
      daysUntilExpiry,
      openPricing,
      openPause,
    };
  }, [profile, router]);

  return state;
}
