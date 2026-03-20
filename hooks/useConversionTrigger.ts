/**
 * hooks/useConversionTrigger.ts
 *
 * Manages when and how often each conversion popup appears.
 * All checks are gated by EXPO_PUBLIC_PAYMENTS_ACTIVE.
 */

import { useCallback } from 'react';
import * as Sentry from '@sentry/react-native';

import { supabase } from '@/lib/supabase';
import type { TriggerType } from '@/constants/copy';

const PAYMENTS_ACTIVE = process.env.EXPO_PUBLIC_PAYMENTS_ACTIVE === 'true';

/** Max dismissals before a trigger goes permanently quiet (except day_45) */
const MAX_DISMISSALS = 3;

/** day_45: re-show after 5 days if dismissed once */
const DAY_45_RESHOW_DAYS = 5;

/** Default: after 3 dismissals, re-show after 30 days */
const DEFAULT_RESHOW_DAYS = 30;

type ConversionRow = {
  shown_at: string;
  dismissed_count: number;
  last_dismissed_at: string | null;
  acted_on: boolean;
};

type TriggerResult = {
  shouldShow: boolean;
  markShown: () => Promise<void>;
  markDismissed: () => Promise<void>;
  markActedOn: () => Promise<void>;
};

export function useConversionTrigger(userId: string | null, triggerType: TriggerType): TriggerResult {
  const noop = useCallback(async () => {}, []);

  const noShow: TriggerResult = {
    shouldShow: false,
    markShown: noop,
    markDismissed: noop,
    markActedOn: noop,
  };

  // ── Gate: payments not active → never show ────────────────────────────────
  if (!PAYMENTS_ACTIVE || !userId) return noShow;

  const checkAndComputeShouldShow = useCallback(async (): Promise<boolean> => {
    try {
      const { data, error } = await supabase
        .from('conversion_shown')
        .select('shown_at, dismissed_count, last_dismissed_at, acted_on')
        .eq('user_id', userId)
        .eq('trigger_type', triggerType)
        .maybeSingle();

      if (error) {
        Sentry.captureException(error, { tags: { action: 'conversion_check' } });
        return false;
      }

      // Never shown before — show it
      if (!data) return true;

      const row = data as ConversionRow;

      // Already acted on → never show again
      if (row.acted_on) return false;

      const dismissals = row.dismissed_count;

      // Determine reshow threshold
      if (triggerType === 'day_45') {
        // day_45: reshow after 5 days from last dismissal
        if (!row.last_dismissed_at) return true;
        const daysSince =
          (Date.now() - new Date(row.last_dismissed_at).getTime()) / (1000 * 60 * 60 * 24);
        return daysSince >= DAY_45_RESHOW_DAYS;
      }

      // All other triggers: max 3 dismissals, then 30-day cooldown
      if (dismissals < MAX_DISMISSALS) return true;

      if (!row.last_dismissed_at) return false;
      const daysSince =
        (Date.now() - new Date(row.last_dismissed_at).getTime()) / (1000 * 60 * 60 * 24);
      return daysSince >= DEFAULT_RESHOW_DAYS;
    } catch (err) {
      Sentry.captureException(err, { tags: { action: 'conversion_check' } });
      return false;
    }
  }, [userId, triggerType]);

  // ── Mutation helpers ──────────────────────────────────────────────────────

  const markShown = useCallback(async () => {
    try {
      await supabase.from('conversion_shown').upsert(
        { user_id: userId, trigger_type: triggerType, shown_at: new Date().toISOString() },
        { onConflict: 'user_id,trigger_type' }
      );
    } catch (err) {
      Sentry.captureException(err, { tags: { action: 'conversion_mark_shown' } });
    }
  }, [userId, triggerType]);

  const markDismissed = useCallback(async () => {
    try {
      // Increment dismissed_count and update last_dismissed_at via RPC approach
      const { data: existing } = await supabase
        .from('conversion_shown')
        .select('dismissed_count')
        .eq('user_id', userId)
        .eq('trigger_type', triggerType)
        .maybeSingle();

      const currentCount = (existing as { dismissed_count: number } | null)?.dismissed_count ?? 0;

      await supabase.from('conversion_shown').upsert(
        {
          user_id: userId,
          trigger_type: triggerType,
          dismissed_count: currentCount + 1,
          last_dismissed_at: new Date().toISOString(),
        },
        { onConflict: 'user_id,trigger_type' }
      );
    } catch (err) {
      Sentry.captureException(err, { tags: { action: 'conversion_mark_dismissed' } });
    }
  }, [userId, triggerType]);

  const markActedOn = useCallback(async () => {
    try {
      await supabase.from('conversion_shown').upsert(
        { user_id: userId, trigger_type: triggerType, acted_on: true },
        { onConflict: 'user_id,trigger_type' }
      );
    } catch (err) {
      Sentry.captureException(err, { tags: { action: 'conversion_mark_acted_on' } });
    }
  }, [userId, triggerType]);

  // ── Expose shouldShow as a function for async resolution ──────────────────
  // Callers use checkShouldShow() and pass result to state.
  return {
    // @ts-expect-error — checkAndComputeShouldShow is async; callers use it directly
    shouldShow: checkAndComputeShouldShow,
    markShown,
    markDismissed,
    markActedOn,
  };
}

/**
 * Standalone async function — use this in useEffect calls.
 * Returns true if the popup should be shown right now.
 */
export async function checkConversionShouldShow(
  userId: string,
  triggerType: TriggerType
): Promise<boolean> {
  if (!PAYMENTS_ACTIVE) return false;

  try {
    const { data, error } = await supabase
      .from('conversion_shown')
      .select('shown_at, dismissed_count, last_dismissed_at, acted_on')
      .eq('user_id', userId)
      .eq('trigger_type', triggerType)
      .maybeSingle();

    if (error) {
      Sentry.captureException(error, { tags: { action: 'conversion_check_standalone' } });
      return false;
    }

    if (!data) return true;

    const row = data as ConversionRow;
    if (row.acted_on) return false;

    const dismissals = row.dismissed_count;

    if (triggerType === 'day_45') {
      if (!row.last_dismissed_at) return true;
      const daysSince =
        (Date.now() - new Date(row.last_dismissed_at).getTime()) / (1000 * 60 * 60 * 24);
      return daysSince >= DAY_45_RESHOW_DAYS;
    }

    if (dismissals < MAX_DISMISSALS) return true;
    if (!row.last_dismissed_at) return false;
    const daysSince =
      (Date.now() - new Date(row.last_dismissed_at).getTime()) / (1000 * 60 * 60 * 24);
    return daysSince >= DEFAULT_RESHOW_DAYS;
  } catch (err) {
    Sentry.captureException(err, { tags: { action: 'conversion_check_standalone' } });
    return false;
  }
}

export async function markConversionShown(userId: string, triggerType: TriggerType): Promise<void> {
  if (!PAYMENTS_ACTIVE) return;
  try {
    await supabase.from('conversion_shown').upsert(
      { user_id: userId, trigger_type: triggerType, shown_at: new Date().toISOString() },
      { onConflict: 'user_id,trigger_type' }
    );
  } catch (err) {
    Sentry.captureException(err, { tags: { action: 'conversion_mark_shown' } });
  }
}

export async function markConversionDismissed(userId: string, triggerType: TriggerType): Promise<void> {
  if (!PAYMENTS_ACTIVE) return;
  try {
    const { data: existing } = await supabase
      .from('conversion_shown')
      .select('dismissed_count')
      .eq('user_id', userId)
      .eq('trigger_type', triggerType)
      .maybeSingle();

    const currentCount = (existing as { dismissed_count: number } | null)?.dismissed_count ?? 0;

    await supabase.from('conversion_shown').upsert(
      {
        user_id: userId,
        trigger_type: triggerType,
        dismissed_count: currentCount + 1,
        last_dismissed_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,trigger_type' }
    );
  } catch (err) {
    Sentry.captureException(err, { tags: { action: 'conversion_mark_dismissed' } });
  }
}

export async function markConversionActedOn(userId: string, triggerType: TriggerType): Promise<void> {
  if (!PAYMENTS_ACTIVE) return;
  try {
    await supabase.from('conversion_shown').upsert(
      { user_id: userId, trigger_type: triggerType, acted_on: true },
      { onConflict: 'user_id,trigger_type' }
    );
  } catch (err) {
    Sentry.captureException(err, { tags: { action: 'conversion_mark_acted_on' } });
  }
}

/** Fetch the list of nudge IDs already shown to this user for a trigger */
export async function fetchShownNudgeIds(
  userId: string,
  triggerType: TriggerType
): Promise<{ shownNudgeIds: number[]; lastNudgeId: number | null }> {
  try {
    const { data, error } = await supabase
      .from('conversion_shown')
      .select('shown_nudge_ids, nudge_id')
      .eq('user_id', userId)
      .eq('trigger_type', triggerType)
      .maybeSingle();

    if (error || !data) return { shownNudgeIds: [], lastNudgeId: null };

    const row = data as { shown_nudge_ids: number[] | null; nudge_id: number | null };
    return {
      shownNudgeIds: row.shown_nudge_ids ?? [],
      lastNudgeId: row.nudge_id ?? null,
    };
  } catch {
    return { shownNudgeIds: [], lastNudgeId: null };
  }
}

/** Persist the nudge_id that was just shown, appending to shown_nudge_ids array */
export async function markNudgeShown(
  userId: string,
  triggerType: TriggerType,
  nudgeId: number,
  currentShownIds: number[]
): Promise<void> {
  if (!PAYMENTS_ACTIVE) return;
  try {
    // Append nudgeId to history; reset when all 20 nudges shown
    const TOTAL_NUDGES = 20;
    const updated = currentShownIds.includes(nudgeId)
      ? currentShownIds
      : [...currentShownIds, nudgeId];
    const finalIds = updated.length >= TOTAL_NUDGES ? [] : updated;

    await supabase.from('conversion_shown').upsert(
      {
        user_id: userId,
        trigger_type: triggerType,
        nudge_id: nudgeId,
        shown_nudge_ids: finalIds,
        shown_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,trigger_type' }
    );
  } catch (err) {
    Sentry.captureException(err, { tags: { action: 'nudge_mark_shown' } });
  }
}
