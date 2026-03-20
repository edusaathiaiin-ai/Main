import { useMemo } from 'react';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';
import * as Sentry from '@sentry/react-native';

import { SAATHIS } from '@/constants/saathis';
import { useSaathi } from '@/hooks/useSaathi';
import { useSoul } from '@/hooks/useSoul';

function isCheckinAvailable(sessionCount: number): boolean {
  return sessionCount >= 5 && (sessionCount === 5 || sessionCount % 7 === 0);
}

export default function CheckinEntryScreen() {
  const { currentSaathiId } = useSaathi();
  const { soul } = useSoul(currentSaathiId);

  const saathi = currentSaathiId ? SAATHIS.find((item) => item.id === currentSaathiId) : null;

  const sessionCount = soul?.sessionCount ?? 0;
  const displayName = soul?.displayName || 'Student';
  const available = isCheckinAvailable(sessionCount);

  const warmMessage = useMemo(() => {
    if (!available) {
      return `${displayName}, we are still getting your learning rhythm. Keep learning with your Saathi and your next Check-in will appear soon.`;
    }

    return `${displayName}, we've been learning together for ${sessionCount} sessions. Ready to see how far you've come?`;
  }, [available, displayName, sessionCount]);

  const onStart = () => {
    try {
      router.push('/(tabs)/checkin/flow');
    } catch (error) {
      Sentry.captureException(error, { tags: { action: 'checkin_start_nav' } });
    }
  };

  const onNotNow = () => {
    try {
      if (router.canGoBack()) {
        router.back();
      } else {
        router.replace('/(tabs)/chat');
      }
    } catch (error) {
      Sentry.captureException(error, { tags: { action: 'checkin_back_nav' } });
      router.replace('/(tabs)/chat');
    }
  };

  if (!saathi) {
    return <View className="flex-1 bg-cream" />;
  }

  return (
    <View className="flex-1 bg-cream px-5 pt-12">
      <View className="rounded-3xl px-5 py-5" style={{ backgroundColor: saathi.bg }}>
        <Text style={{ fontSize: 34 }}>{saathi.emoji}</Text>
        <Text
          style={{
            fontFamily: 'PlayfairDisplay-Bold',
            fontSize: 24,
            color: saathi.primary,
            marginTop: 6,
          }}
        >
          Saathi Check-in
        </Text>
        <Text
          style={{
            fontFamily: 'DMSans-Regular',
            fontSize: 14,
            lineHeight: 22,
            color: saathi.primary + 'DD',
            marginTop: 10,
          }}
        >
          {available ? 'Check-in available' : 'Check-in warming up'}
        </Text>
        <Text
          style={{
            fontFamily: 'DMSans-Regular',
            fontSize: 14,
            lineHeight: 22,
            color: saathi.primary + 'CC',
            marginTop: 8,
          }}
        >
          {warmMessage}
        </Text>
      </View>

      <View className="mt-8 flex-row">
        <Pressable
          onPress={onStart}
          disabled={!available}
          className="flex-1 rounded-2xl items-center justify-center py-3 mr-2"
          style={{ backgroundColor: available ? '#C9993A' : '#E5E7EB' }}
        >
          <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 14, color: '#0B1F3A' }}>
            {"Let's do it →"}
          </Text>
        </Pressable>

        <Pressable
          onPress={onNotNow}
          className="flex-1 rounded-2xl items-center justify-center py-3 ml-2"
          style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#0B1F3A1F' }}
        >
          <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 14, color: '#0B1F3A' }}>
            Not now
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
