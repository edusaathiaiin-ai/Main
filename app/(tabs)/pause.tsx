/**
 * app/(tabs)/pause.tsx
 *
 * Subscription Pause Screen.
 * Shown when a Plus user taps "Pause" from profile,
 * or as an interception when they tap "Cancel subscription".
 *
 * Flow:
 *   1. User picks a duration (7 / 14 / 30 / 60 days)
 *   2. Taps "Pause for X days" → calls pause-subscription Edge Function
 *   3. Success → confirmation + back to home
 *   OR
 *   4. Taps "Cancel instead" → cancel interception flow (reason picker → downgrade offer)
 */

import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Sentry from '@sentry/react-native';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import { isPaymentsActive } from '@/lib/razorpay';

const SUPABASE_URL     = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '';

const NAVY       = '#0B1F3A';
const GOLD       = '#C9993A';
const CREAM      = '#FAF6F0';
const MUTED_RED  = '#991B1B';

type PauseDays = 7 | 14 | 30 | 60;

const PAUSE_OPTIONS: { days: PauseDays; label: string; sub: string }[] = [
  { days: 7,  label: '7 days',  sub: 'Short break' },
  { days: 14, label: '14 days', sub: 'Two weeks off' },
  { days: 30, label: '30 days', sub: 'One month' },
  { days: 60, label: '60 days', sub: 'Two months' },
];

const CANCEL_REASONS = [
  'Too expensive',
  'Exams are over',
  'Taking a break',
  'Other',
] as const;
type CancelReason = (typeof CANCEL_REASONS)[number];

type ScreenPhase =
  | 'pause_picker'      // Step 1: choose pause duration
  | 'cancel_reason'     // Step 2: cancel reason picker
  | 'annual_offer'      // Step 3: downgrade to annual offer
  | 'goodbye';          // Step 4: graceful goodbye

export default function PauseScreen() {
  const { user, profile } = useAuth();
  const { isPremium, daysUntilExpiry } = useSubscription();
  const router = useRouter();

  const [phase, setPhase] = useState<ScreenPhase>('pause_picker');
  const [selectedDays, setSelectedDays] = useState<PauseDays>(14);
  const [cancelReason, setCancelReason] = useState<CancelReason | null>(null);
  const [loading, setLoading] = useState(false);
  const [pauseSuccess, setPauseSuccess] = useState(false);

  const displayName = profile?.full_name?.split(' ')[0] ?? 'Friend';
  const pauses_used = profile?.pause_count_this_year ?? 0;
  const pauses_remaining = Math.max(0, 2 - pauses_used);

  // ── Pause action ──────────────────────────────────────────────────────────

  const handlePause = async () => {
    if (!user || !isPaymentsActive()) {
      Alert.alert('Not available', 'Payments are not active yet.');
      return;
    }
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      const res = await fetch(`${SUPABASE_URL}/functions/v1/pause-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ pauseDays: selectedDays }),
      });

      const result = await res.json() as { ok?: boolean; error?: string };

      if (!res.ok || !result.ok) {
        throw new Error(result.error ?? 'Pause failed');
      }

      setPauseSuccess(true);
    } catch (err) {
      Sentry.captureException(err, { tags: { action: 'pause_subscription' } });
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      Alert.alert('Could not pause', msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Cancel action ─────────────────────────────────────────────────────────

  const handleCancelConfirm = async () => {
    if (!user || !cancelReason) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('Not authenticated');

      // Store reason first
      await supabase
        .from('profiles')
        .update({ cancellation_reason: cancelReason })
        .eq('id', user.id);

      // Call Razorpay cancel Edge Function — this calls subscription.cancel
      const res = await fetch(`${SUPABASE_URL}/functions/v1/cancel-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
          apikey: SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ reason: cancelReason }),
      });
      const result = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok || !result.ok) throw new Error(result.error ?? 'Cancel failed');

      setPhase('goodbye');
    } catch (err) {
      Sentry.captureException(err, { tags: { action: 'cancel_subscription' } });
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      Alert.alert('Could not cancel', msg);
    } finally {
      setLoading(false);
    }
  };

  // ── Pause success screen ──────────────────────────────────────────────────
  if (pauseSuccess) {
    const resumeDate = new Date(
      Date.now() + selectedDays * 24 * 60 * 60 * 1000
    ).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });

    return (
      <View style={{ flex: 1, backgroundColor: CREAM, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>😌</Text>
        <Text style={{ fontFamily: 'PlayfairDisplay-Bold', fontSize: 22, color: NAVY, textAlign: 'center', marginBottom: 10 }}>
          Saathi is waiting for you.
        </Text>
        <Text style={{ fontFamily: 'DMSans-Regular', fontSize: 14, color: NAVY + '99', textAlign: 'center', lineHeight: 22, marginBottom: 32 }}>
          Your subscription is paused until{' '}
          <Text style={{ fontFamily: 'DMSans-Bold', color: NAVY }}>{resumeDate}</Text>.{'\n'}
          Everything your Saathi learned about you — every session, every goal — is preserved.
        </Text>
        <Pressable
          onPress={() => router.replace('/(tabs)/home')}
          style={{ backgroundColor: NAVY, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32 }}
        >
          <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 15, color: '#fff' }}>Back to Home</Text>
        </Pressable>
      </View>
    );
  }

  // ── Phase: Annual offer ───────────────────────────────────────────────────
  if (phase === 'annual_offer') {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: CREAM }} contentContainerStyle={{ padding: 28 }}>
        <Text style={{ fontFamily: 'PlayfairDisplay-Bold', fontSize: 22, color: NAVY, marginBottom: 10 }}>
          Before you go — one more option.
        </Text>
        <Text style={{ fontFamily: 'DMSans-Regular', fontSize: 14, color: NAVY + 'AA', lineHeight: 22, marginBottom: 24 }}>
          The annual plan locks you in at{' '}
          <Text style={{ fontFamily: 'DMSans-Bold', color: GOLD }}>₹125/month</Text>
          {' '}— ₹74 less per month than monthly.{'\n\n'}
          That's less than a chai every day. Your Saathi will still be here, still remember everything, just at a better price.
        </Text>

        {/* Annual CTA */}
        <Pressable
          onPress={() => router.push('/(tabs)/pricing')}
          style={{ backgroundColor: GOLD, borderRadius: 14, paddingVertical: 15, alignItems: 'center', marginBottom: 14 }}
        >
          <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 15, color: NAVY }}>Switch to Annual — ₹125/mo →</Text>
        </Pressable>

        {/* Continue cancel */}
        <Pressable
          onPress={() => setPhase('cancel_reason')}
          style={{ paddingVertical: 12, alignItems: 'center' }}
        >
          <Text style={{ fontFamily: 'DMSans-Regular', fontSize: 13, color: MUTED_RED }}>
            No thanks — continue cancelling
          </Text>
        </Pressable>
      </ScrollView>
    );
  }

  // ── Phase: Cancel reason picker ───────────────────────────────────────────
  if (phase === 'cancel_reason') {
    return (
      <ScrollView style={{ flex: 1, backgroundColor: CREAM }} contentContainerStyle={{ padding: 28 }}>
        <Text style={{ fontFamily: 'PlayfairDisplay-Bold', fontSize: 22, color: NAVY, marginBottom: 8 }}>
          Why are you leaving?
        </Text>
        <Text style={{ fontFamily: 'DMSans-Regular', fontSize: 14, color: NAVY + '80', marginBottom: 24 }}>
          Takes 2 seconds. Helps us build a better Saathi.
        </Text>

        {CANCEL_REASONS.map((reason) => (
          <Pressable
            key={reason}
            onPress={() => setCancelReason(reason)}
            style={{
              backgroundColor: cancelReason === reason ? NAVY : '#fff',
              borderWidth: 1.5,
              borderColor: cancelReason === reason ? NAVY : '#E5E9EF',
              borderRadius: 12,
              paddingVertical: 14,
              paddingHorizontal: 18,
              marginBottom: 10,
            }}
          >
            <Text style={{
              fontFamily: 'DMSans-Medium',
              fontSize: 15,
              color: cancelReason === reason ? '#fff' : NAVY,
            }}>
              {reason}
            </Text>
          </Pressable>
        ))}

        <Pressable
          onPress={handleCancelConfirm}
          disabled={!cancelReason || loading}
          style={{
            backgroundColor: cancelReason ? MUTED_RED : '#E5E9EF',
            borderRadius: 14,
            paddingVertical: 15,
            alignItems: 'center',
            marginTop: 12,
          }}
        >
          {loading
            ? <ActivityIndicator color="#fff" />
            : <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 15, color: '#fff' }}>Confirm Cancellation</Text>
          }
        </Pressable>

        <Pressable onPress={() => setPhase('pause_picker')} style={{ paddingVertical: 14, alignItems: 'center' }}>
          <Text style={{ fontFamily: 'DMSans-Regular', fontSize: 13, color: NAVY + '60' }}>← Back</Text>
        </Pressable>
      </ScrollView>
    );
  }

  // ── Phase: Goodbye ────────────────────────────────────────────────────────
  if (phase === 'goodbye') {
    return (
      <View style={{ flex: 1, backgroundColor: CREAM, alignItems: 'center', justifyContent: 'center', padding: 32 }}>
        <Text style={{ fontSize: 48, marginBottom: 16 }}>💛</Text>
        <Text style={{ fontFamily: 'PlayfairDisplay-Bold', fontSize: 22, color: NAVY, textAlign: 'center', marginBottom: 10 }}>
          Your Saathi will be here.
        </Text>
        <Text style={{ fontFamily: 'DMSans-Regular', fontSize: 14, color: NAVY + '99', textAlign: 'center', lineHeight: 22, marginBottom: 32 }}>
          We've stored everything — your sessions, your goals, your journey.{'\n\n'}
          Your Saathi remembers you for{' '}
          <Text style={{ fontFamily: 'DMSans-Bold', color: NAVY }}>1 full year</Text>.{'\n'}
          Come back anytime.
        </Text>
        <Pressable
          onPress={() => router.replace('/(tabs)/home')}
          style={{ backgroundColor: NAVY, borderRadius: 14, paddingVertical: 14, paddingHorizontal: 32 }}
        >
          <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 15, color: '#fff' }}>Back to Home</Text>
        </Pressable>
      </View>
    );
  }

  // ── Phase: Pause picker (default) ─────────────────────────────────────────
  const pauseUntilDate = (days: number) =>
    new Date(Date.now() + days * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short',
    });

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: CREAM }}
      contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
    >
      {/* Header */}
      <Text style={{ fontFamily: 'PlayfairDisplay-Bold', fontSize: 24, color: NAVY, marginBottom: 6 }}>
        Take a break, {displayName}.
      </Text>
      <Text style={{ fontFamily: 'DMSans-Regular', fontSize: 14, color: NAVY + '90', marginBottom: 4, lineHeight: 22 }}>
        Your Saathi remembers everything. No data lost, no resets.{'\n'}
        Resume any time before your pause ends.
      </Text>

      {pauses_remaining === 0 ? (
        <View style={{ backgroundColor: '#FEF3C7', borderRadius: 10, padding: 12, marginBottom: 16 }}>
          <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 13, color: '#92400E' }}>
            You've used both pauses for this year. Contact support to discuss options.
          </Text>
        </View>
      ) : (
        <Text style={{ fontFamily: 'DMSans-Regular', fontSize: 13, color: NAVY + '60', marginBottom: 20 }}>
          {pauses_remaining} of 2 pauses remaining this year
        </Text>
      )}

      {/* Duration options */}
      <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 13, color: NAVY + '80', letterSpacing: 1, marginBottom: 12 }}>
        PAUSE FOR
      </Text>
      {PAUSE_OPTIONS.map((opt) => {
        const active = selectedDays === opt.days;
        return (
          <Pressable
            key={opt.days}
            onPress={() => setSelectedDays(opt.days)}
            style={{
              backgroundColor: active ? NAVY : '#fff',
              borderWidth: 1.5,
              borderColor: active ? GOLD : '#E5E9EF',
              borderRadius: 14,
              paddingVertical: 16,
              paddingHorizontal: 20,
              marginBottom: 10,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <View>
              <Text style={{
                fontFamily: 'DMSans-Bold',
                fontSize: 16,
                color: active ? '#fff' : NAVY,
              }}>
                {opt.label}
              </Text>
              <Text style={{
                fontFamily: 'DMSans-Regular',
                fontSize: 12,
                color: active ? 'rgba(255,255,255,0.65)' : NAVY + '60',
                marginTop: 2,
              }}>
                {opt.sub}
              </Text>
            </View>
            <Text style={{ fontFamily: 'DMSans-Regular', fontSize: 12, color: active ? GOLD : NAVY + '50' }}>
              until {pauseUntilDate(opt.days)}
            </Text>
          </Pressable>
        );
      })}

      {/* Memory preservation note */}
      <View style={{ backgroundColor: '#F0F9FF', borderRadius: 12, padding: 14, marginTop: 8, marginBottom: 20 }}>
        <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 13, color: '#0369A1', lineHeight: 20 }}>
          ✦ Soul Memory is fully preserved.{'\n'}
          Your Saathi picks up exactly where you left off.
        </Text>
      </View>

      {/* Pause CTA */}
      <Pressable
        onPress={handlePause}
        disabled={loading || pauses_remaining === 0}
        style={{
          backgroundColor: pauses_remaining > 0 ? GOLD : '#E5E9EF',
          borderRadius: 14,
          paddingVertical: 16,
          alignItems: 'center',
          marginBottom: 12,
        }}
      >
        {loading
          ? <ActivityIndicator color={NAVY} />
          : <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 16, color: NAVY }}>
              Pause for {selectedDays} days →
            </Text>
        }
      </Pressable>

      {/* Cancel instead */}
      {isPremium ? (
        <Pressable
          onPress={() => cancelReason !== 'Too expensive'
            ? setPhase('cancel_reason')
            : setPhase('annual_offer')
          }
          style={{ paddingVertical: 10, alignItems: 'center' }}
        >
          <Text style={{ fontFamily: 'DMSans-Regular', fontSize: 13, color: MUTED_RED }}>
            Cancel subscription instead
          </Text>
        </Pressable>
      ) : null}

      {/* Dismiss */}
      <Pressable
        onPress={() => router.back()}
        style={{ paddingVertical: 12, alignItems: 'center' }}
      >
        <Text style={{ fontFamily: 'DMSans-Regular', fontSize: 13, color: NAVY + '60' }}>Go back</Text>
      </Pressable>

      {/* Bot warm message */}
      <View style={{ marginTop: 24, alignItems: 'center' }}>
        <Text style={{ fontSize: 28, marginBottom: 8 }}>🤖</Text>
        <Text style={{
          fontFamily: 'DMSans-Regular',
          fontSize: 13,
          color: NAVY + '70',
          textAlign: 'center',
          fontStyle: 'italic',
          lineHeight: 20,
          paddingHorizontal: 20,
        }}>
          "I'll remember everything, {displayName}. Every session, every goal.{'\n'}
          Come back whenever you're ready."
        </Text>
      </View>
    </ScrollView>
  );
}
