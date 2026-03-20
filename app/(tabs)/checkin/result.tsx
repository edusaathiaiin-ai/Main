import { useEffect, useMemo, useState } from 'react';
import { useLocalSearchParams, router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import * as Sentry from '@sentry/react-native';

import { SAATHIS } from '@/constants/saathis';
import { useSaathi } from '@/hooks/useSaathi';
import { useSoul } from '@/hooks/useSoul';
import { useAuth } from '@/hooks/useAuth';
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

type ResultLevel = 'ambitious' | 'struggling' | 'casual' | 'high_performer';

function parseArrayParam(value: string | string[] | undefined): string[] {
  if (!value) return [];
  const raw = Array.isArray(value) ? value[0] : value;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === 'string') : [];
  } catch {
    return [];
  }
}

function getResultMessage(params: {
  level: ResultLevel;
  name: string;
}): string {
  switch (params.level) {
    case 'ambitious':
      return `You walked in knowing key pieces. You leave with deeper clarity. Your goal preparation is stronger for it.`;
    case 'struggling':
      return `${params.name}, you got the hard ones right. The ones you missed, we fix together next session. You are doing better than you think.`;
    case 'high_performer':
      return 'Perfect again. So next time we go deeper into edge cases where real depth lives.';
    case 'casual':
    default:
      return 'Solid. You have the core concepts. One area to brush up next, but you are looking strong.';
  }
}

export default function CheckinResultScreen() {
  const { currentSaathiId } = useSaathi();
  const { soul } = useSoul(currentSaathiId);
  const { user } = useAuth();
  const params = useLocalSearchParams<{ level?: string; cleared?: string; revisit?: string }>();

  const saathi = currentSaathiId ? SAATHIS.find((item) => item.id === currentSaathiId) : null;

  const level = (params.level as ResultLevel | undefined) ?? 'casual';
  const clearedTopics = useMemo(() => parseArrayParam(params.cleared), [params.cleared]);
  const revisitTopics = useMemo(() => parseArrayParam(params.revisit), [params.revisit]);

  const displayName = soul?.displayName || 'Student';
  const message = getResultMessage({ level, name: displayName });

  const { profile } = useAuth();
  const [conversionVisible, setConversionVisible] = useState(false);
  const [selectedNudge, setSelectedNudge] = useState<NudgeMessage | null>(null);

  // checkin_complete trigger: show after 2s delay
  useEffect(() => {
    if (!user?.id) return;
    const uid = user.id;
    const triggerType = 'checkin_complete' as const;
    const timer = setTimeout(() => {
      checkConversionShouldShow(uid, triggerType)
        .then(async (should) => {
          if (!should) return;
          const { shownNudgeIds, lastNudgeId } = await fetchShownNudgeIds(uid, triggerType);
          const nudge = selectNudge({
            userId: uid,
            triggerType,
            userProfile: {
              displayName: soul?.displayName ?? 'Friend',
              city: profile?.city ?? null,
              examTarget: profile?.exam_target ?? null,
              preferredTone: soul?.preferredTone ?? null,
              daysUntilExam: null,
            },
            shownNudgeIds,
            lastNudgeId,
          });
          setSelectedNudge(nudge);
          setConversionVisible(true);
          await markConversionShown(uid, triggerType);
          await markNudgeShown(uid, triggerType, nudge.id, shownNudgeIds);
        })
        .catch((err: unknown) =>
          Sentry.captureException(err, { tags: { action: 'checkin_complete_check' } })
        );
    }, 2000);
    return () => clearTimeout(timer);
  }, [user?.id]);

  return (
    <View className="flex-1 bg-cream px-5 pt-12">
      {!saathi ? (
        <View className="flex-1 bg-cream" />
      ) : (
        <>
          <View className="rounded-3xl p-5" style={{ backgroundColor: saathi.bg }}>
            <Text style={{ fontSize: 34 }}>{saathi.emoji}</Text>
            <Text style={{ fontFamily: 'PlayfairDisplay-Bold', fontSize: 24, color: saathi.primary, marginTop: 8 }}>
              Saathi Check-in Reflection
            </Text>
            <Text style={{ fontFamily: 'DMSans-Regular', fontSize: 14, lineHeight: 22, color: saathi.primary + 'DD', marginTop: 10 }}>
              {message}
            </Text>
          </View>

          <View className="mt-6">
            <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 13, color: '#166534', marginBottom: 8 }}>
              Topics cleared ✓
            </Text>
            <View className="flex-row flex-wrap mb-3">
              {(clearedTopics.length > 0 ? clearedTopics : ['Momentum']).map((topic) => (
                <View key={topic} className="rounded-full px-3 py-1 mr-2 mb-2" style={{ backgroundColor: '#DCFCE7' }}>
                  <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 12, color: '#166534' }}>{topic}</Text>
                </View>
              ))}
            </View>

            <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 13, color: '#B45309', marginBottom: 8 }}>
              Topics to revisit →
            </Text>
            <View className="flex-row flex-wrap">
              {(revisitTopics.length > 0 ? revisitTopics : ['Precision']).map((topic) => (
                <View key={topic} className="rounded-full px-3 py-1 mr-2 mb-2" style={{ backgroundColor: '#FEF3C7' }}>
                  <Text style={{ fontFamily: 'DMSans-Medium', fontSize: 12, color: '#92400E' }}>{topic}</Text>
                </View>
              ))}
            </View>
          </View>

          <Pressable
            onPress={() => router.replace('/(tabs)/chat')}
            className="mt-8 rounded-2xl items-center justify-center py-3"
            style={{ backgroundColor: '#C9993A' }}
          >
            <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 14, color: '#0B1F3A' }}>
              Continue Learning →
            </Text>
          </Pressable>
        </>
      )}

      {/* checkin_complete conversion popup — 2s after result shown */}
      {selectedNudge ? (
        <ConversionModal
          visible={conversionVisible}
          triggerType="checkin_complete"
          nudge={selectedNudge}
          accentColor={saathi?.primary ?? '#C9993A'}
          onDismiss={async () => {
            if (user?.id) await markConversionDismissed(user.id, 'checkin_complete');
            setConversionVisible(false);
            setSelectedNudge(null);
          }}
          onCta={async () => {
            if (user?.id) await markConversionActedOn(user.id, 'checkin_complete');
            setConversionVisible(false);
            setSelectedNudge(null);
            router.push('/(tabs)/pricing');
          }}
        />
      ) : null}
    </View>
  );
}
