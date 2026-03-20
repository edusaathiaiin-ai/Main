import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import * as Sentry from '@sentry/react-native';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import { useSaathi } from '@/hooks/useSaathi';
import { useSoul } from '@/hooks/useSoul';
import { useQuota } from '@/hooks/useQuota';
import { useSubscription } from '@/hooks/useSubscription';
import { ConversionModal } from '@/components/ui/ConversionModal';
import {
  checkConversionShouldShow,
  markConversionShown,
  markConversionDismissed,
  markConversionActedOn,
  fetchShownNudgeIds,
  markNudgeShown,
} from '@/hooks/useConversionTrigger';
import { selectNudge } from '@/lib/nudgeSelector';
import type { NudgeMessage } from '@/constants/nudges';

type VerticalInfo = {
  name: string;
  emoji: string;
  primary_color: string;
  bg_color: string;
};

export default function HomeScreen() {
  const { profile, user, showDay45Popup, clearDay45Popup } = useAuth();
  const { isPaused, pauseUntil, openPause } = useSubscription();
  const router = useRouter();
  const { currentSaathiId } = useSaathi();
  const { soul } = useSoul(currentSaathiId);
  const { remaining, limit, isCooling } = useQuota({
    userId: user?.id ?? null,
    saathiId: currentSaathiId,
    botSlot: 1,
  });

  const [vertical, setVertical] = useState<VerticalInfo | null>(null);
  const [loadingVertical, setLoadingVertical] = useState(false);
  const [conversionModal, setConversionModal] = useState<'session_5' | 'day_45' | null>(null);
  const [selectedNudge, setSelectedNudge] = useState<NudgeMessage | null>(null);

  useEffect(() => {
    if (!profile?.primary_saathi_id) return;
    setLoadingVertical(true);
    supabase
      .from('verticals')
      .select('name, emoji, primary_color, bg_color')
      .eq('id', profile.primary_saathi_id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          Sentry.captureException(error, { tags: { action: 'home_load_vertical' } });
        } else if (data) {
          setVertical(data as VerticalInfo);
        }
        setLoadingVertical(false);
      });
  }, [profile?.primary_saathi_id]);

  // session_5 trigger: fire when login_count reaches exactly 5
  useEffect(() => {
    if (!user?.id || !profile) return;
    if (profile.login_count !== 5) return;
    const triggerType = 'session_5' as const;
    checkConversionShouldShow(user.id, triggerType)
      .then(async (should) => {
        if (!should) return;
        const { shownNudgeIds, lastNudgeId } = await fetchShownNudgeIds(user.id, triggerType);
        const nudge = selectNudge({
          userId: user.id,
          triggerType,
          userProfile: {
            displayName: profile.full_name?.split(' ')[0] ?? 'Friend',
            city: profile.city,
            examTarget: profile.exam_target,
            preferredTone: soul?.preferredTone ?? null,
            daysUntilExam: null,
          },
          shownNudgeIds,
          lastNudgeId,
        });
        setSelectedNudge(nudge);
        setConversionModal(triggerType);
        await markConversionShown(user.id, triggerType);
        await markNudgeShown(user.id, triggerType, nudge.id, shownNudgeIds);
      })
      .catch((err: unknown) =>
        Sentry.captureException(err, { tags: { action: 'session5_check' } })
      );
  }, [user?.id, profile?.login_count]);

  // day_45 trigger: lifted from useAuth context
  useEffect(() => {
    if (!showDay45Popup || !user?.id || !profile) return;
    const triggerType = 'day_45' as const;
    fetchShownNudgeIds(user.id, triggerType).then(({ shownNudgeIds, lastNudgeId }) => {
      const nudge = selectNudge({
        userId: user.id,
        triggerType,
        userProfile: {
          displayName: profile.full_name?.split(' ')[0] ?? 'Friend',
          city: profile.city,
          examTarget: profile.exam_target,
          preferredTone: soul?.preferredTone ?? null,
          daysUntilExam: null,
        },
        shownNudgeIds,
        lastNudgeId,
      });
      setSelectedNudge(nudge);
      setConversionModal(triggerType);
    }).catch((err: unknown) =>
      Sentry.captureException(err, { tags: { action: 'day45_nudge_select' } })
    );
  }, [showDay45Popup]);

  const firstName = profile?.full_name?.split(' ')[0] ?? 'Friend';
  const sessionCount = soul?.sessionCount ?? 0;
  const canCheckin = sessionCount >= 5;

  return (
    <ScrollView
      className="flex-1 bg-cream"
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 72, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Pause banner */}
      {isPaused && pauseUntil ? (
        <View
          style={{
            backgroundColor: '#FEF3C7',
            borderRadius: 12,
            paddingVertical: 10,
            paddingHorizontal: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 14,
          }}
        >
          <Text style={{ fontFamily: 'DMSans-Regular', fontSize: 12, color: '#92400E', flex: 1 }}>
            Subscription paused · Resumes{' '}
            <Text style={{ fontFamily: 'DMSans-Bold' }}>
              {pauseUntil.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
            </Text>
          </Text>
          <Pressable onPress={openPause} style={{ marginLeft: 10 }}>
            <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 12, color: '#92400E' }}>
              Resume now →
            </Text>
          </Pressable>
        </View>
      ) : null}
      {/* Logo */}
      <Text
        className="text-2xl tracking-tight"
        style={{ fontFamily: 'PlayfairDisplay-Bold' }}
      >
        <Text style={{ color: '#0B1F3A' }}>EdU</Text>
        <Text style={{ color: '#C9993A' }}>saathi</Text>
        <Text style={{ color: '#0B1F3A' }}>AI</Text>
      </Text>

      {/* Welcome heading */}
      <Text
        className="text-3xl text-navy mt-6"
        style={{ fontFamily: 'PlayfairDisplay-Bold' }}
      >
        Welcome,{'\n'}{firstName}!
      </Text>
      <Text
        className="text-base text-navy/60 mt-2"
        style={{ fontFamily: 'DMSans-Regular' }}
      >
        Your journey begins here.
      </Text>

      {/* Active Saathi card */}
      <View className="mt-8">
        <Text
          className="text-xs uppercase tracking-widest text-navy/50 mb-3"
          style={{ fontFamily: 'DMSans-Medium', letterSpacing: 2 }}
        >
          Your Primary Saathi
        </Text>

        {loadingVertical ? (
          <ActivityIndicator color="#C9993A" size="small" />
        ) : vertical ? (
          <Pressable
            onPress={() => router.push('/(tabs)/chat')}
            className="rounded-2xl p-5 flex-row items-center"
            style={{ backgroundColor: vertical.bg_color }}
          >
            <Text className="text-4xl mr-4">{vertical.emoji}</Text>
            <View className="flex-1">
              <Text
                className="text-lg"
                style={{ fontFamily: 'PlayfairDisplay-Bold', color: vertical.primary_color }}
              >
                {vertical.name}
              </Text>
              <Text
                className="text-sm mt-1"
                style={{ fontFamily: 'DMSans-Regular', color: vertical.primary_color + 'CC' }}
              >
                Ready to learn with you
              </Text>
            </View>
            <View
              className="rounded-2xl px-4 py-2"
              style={{ backgroundColor: vertical.primary_color }}
            >
              <Text
                className="text-xs text-white"
                style={{ fontFamily: 'DMSans-Medium' }}
              >
                Open Chat →
              </Text>
            </View>
          </Pressable>
        ) : (
          <View className="rounded-2xl p-5 bg-white items-center">
            <Text
              className="text-sm text-navy/50"
              style={{ fontFamily: 'DMSans-Regular' }}
            >
              No Saathi selected yet
            </Text>
          </View>
        )}
      </View>

      {/* Quick stats row */}
      <View className="mt-5 flex-row gap-3">
        {/* Chats remaining today */}
        <View
          className="flex-1 rounded-2xl p-4"
          style={{
            backgroundColor: isCooling ? '#FFF3E0' : '#FFFFFF',
            borderWidth: 1,
            borderColor: isCooling ? '#F9731620' : '#0B1F3A10',
          }}
        >
          <Text style={{ fontSize: 22 }}>{isCooling ? '☕' : '💬'}</Text>
          <Text
            className="mt-1"
            style={{
              fontFamily: 'DMSans-Bold',
              fontSize: 20,
              color: isCooling ? '#F97316' : '#0B1F3A',
            }}
          >
            {isCooling ? '0' : remaining}
          </Text>
          <Text
            style={{ fontFamily: 'DMSans-Regular', fontSize: 12, color: '#0B1F3A60', marginTop: 2 }}
          >
            {isCooling ? 'Cooling…' : `of ${limit} chats today`}
          </Text>
        </View>

        {/* Sessions completed */}
        <View
          className="flex-1 rounded-2xl p-4 bg-white"
          style={{ borderWidth: 1, borderColor: '#0B1F3A10' }}
        >
          <Text style={{ fontSize: 22 }}>✦</Text>
          <Text
            className="mt-1"
            style={{ fontFamily: 'DMSans-Bold', fontSize: 20, color: '#C9993A' }}
          >
            {sessionCount}
          </Text>
          <Text
            style={{ fontFamily: 'DMSans-Regular', fontSize: 12, color: '#0B1F3A60', marginTop: 2 }}
          >
            {sessionCount === 1 ? 'session together' : 'sessions together'}
          </Text>
        </View>

        {/* Check-in shortcut — only visible after 5 sessions */}
        {canCheckin ? (
          <Pressable
            onPress={() => router.push('/(tabs)/checkin')}
            className="flex-1 rounded-2xl p-4"
            style={{ backgroundColor: '#C9993A15', borderWidth: 1, borderColor: '#C9993A30' }}
          >
            <Text style={{ fontSize: 22 }}>📋</Text>
            <Text
              className="mt-1"
              style={{ fontFamily: 'DMSans-Bold', fontSize: 13, color: '#C9993A' }}
            >
              Check-in
            </Text>
            <Text
              style={{ fontFamily: 'DMSans-Regular', fontSize: 12, color: '#92400E', marginTop: 2 }}
            >
              Test yourself
            </Text>
          </Pressable>
        ) : (
          <View
            className="flex-1 rounded-2xl p-4 bg-white"
            style={{ borderWidth: 1, borderColor: '#0B1F3A10' }}
          >
            <Text style={{ fontSize: 22 }}>📋</Text>
            <Text
              className="mt-1"
              style={{ fontFamily: 'DMSans-Bold', fontSize: 13, color: '#0B1F3A40' }}
            >
              Check-in
            </Text>
            <Text
              style={{ fontFamily: 'DMSans-Regular', fontSize: 12, color: '#0B1F3A40', marginTop: 2 }}
            >
              Unlocks at session 5
            </Text>
          </View>
        )}
      </View>

      {/* Founding Student badge */}
      <View
        className="mt-5 rounded-2xl p-5 flex-row items-center"
        style={{ backgroundColor: '#C9993A15' }}
      >
        <Text className="text-3xl mr-4">⭐</Text>
        <View className="flex-1">
          <Text
            className="text-sm"
            style={{ fontFamily: 'DMSans-Bold', color: '#C9993A' }}
          >
            Founding Student Access
          </Text>
          <Text
            className="text-xs mt-1 text-navy/60"
            style={{ fontFamily: 'DMSans-Regular' }}
          >
            60 days of full Premium — no card needed.
          </Text>
        </View>
      </View>

      {/* Soul memory teaser — visible once at least 1 session is done */}
      {soul?.lastSessionSummary ? (
        <View
          className="mt-5 rounded-2xl p-5"
          style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#0B1F3A10' }}
        >
          <Text
            className="text-xs uppercase tracking-widest text-navy/40 mb-2"
            style={{ fontFamily: 'DMSans-Medium', letterSpacing: 2 }}
          >
            Last Session Memory
          </Text>
          <Text
            style={{
              fontFamily: 'DMSans-Regular',
              fontSize: 13,
              color: '#0B1F3A',
              lineHeight: 20,
              fontStyle: 'italic',
            }}
          >
            "{soul.lastSessionSummary}"
          </Text>
        </View>
      ) : null}

      {/* Conversion modal — session_5 and day_45 */}
      {conversionModal && selectedNudge ? (
        <ConversionModal
          visible
          triggerType={conversionModal}
          nudge={selectedNudge}
          showAnnualPlan={conversionModal === 'day_45'}
          accentColor={vertical?.primary_color ?? '#C9993A'}
          onDismiss={async () => {
            if (user?.id && conversionModal) {
              await markConversionDismissed(user.id, conversionModal);
            }
            if (conversionModal === 'day_45') clearDay45Popup();
            setConversionModal(null);
            setSelectedNudge(null);
          }}
          onCta={async () => {
            if (user?.id && conversionModal) {
              await markConversionActedOn(user.id, conversionModal);
            }
            if (conversionModal === 'day_45') clearDay45Popup();
            setConversionModal(null);
            setSelectedNudge(null);
            router.push('/(tabs)/pricing');
          }}
        />
      ) : null}
    </ScrollView>
  );
}
