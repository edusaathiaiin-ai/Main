/**
 * app/saathi/[id]/index.tsx
 *
 * Saathi deep-link screen.
 * Navigating to /saathi/:id sets that Saathi as the active context
 * and renders the full ChatScreen.
 *
 * Route examples:
 *   /saathi/maathsaathi   → MaathSaathi chat
 *   /saathi/kanoonsaathi  → KanoonSaathi chat
 */

import { useEffect } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ActivityIndicator, Text, View } from 'react-native';

import { ChatScreen } from '@/components/chat/ChatScreen';
import { SAATHIS } from '@/constants/saathis';
import { useSaathi } from '@/hooks/useSaathi';

export default function SaathiChatRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { setCurrentSaathiId } = useSaathi();

  const saathi = SAATHIS.find((s) => s.id === id);

  // Apply the Saathi context as soon as the route mounts
  useEffect(() => {
    if (saathi) {
      setCurrentSaathiId(saathi.id);
    }
  }, [saathi, setCurrentSaathiId]);

  // Unknown Saathi ID — redirect back gracefully
  if (!saathi) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#FAF7F2',
          padding: 32,
        }}
      >
        <Text style={{ fontSize: 48, marginBottom: 16 }}>🤔</Text>
        <Text
          style={{
            fontFamily: 'PlayfairDisplay-Bold',
            fontSize: 20,
            color: '#0B1F3A',
            textAlign: 'center',
            marginBottom: 8,
          }}
        >
          Saathi not found
        </Text>
        <Text
          style={{
            fontFamily: 'DMSans-Regular',
            fontSize: 14,
            color: '#0B1F3A80',
            textAlign: 'center',
            marginBottom: 24,
          }}
        >
          We couldn{"'"}t find a Saathi with the ID{' '}
          <Text style={{ fontFamily: 'DMSans-Bold', color: '#0B1F3A' }}>{id}</Text>.
        </Text>
        <View
          style={{
            backgroundColor: '#0B1F3A',
            borderRadius: 16,
            paddingHorizontal: 20,
            paddingVertical: 10,
          }}
        >
          <Text
            onPress={() => router.replace('/(tabs)/chat')}
            style={{ fontFamily: 'DMSans-Bold', fontSize: 14, color: '#FAF7F2' }}
          >
            Go to Chat →
          </Text>
        </View>
      </View>
    );
  }

  // Valid Saathi — render the full ChatScreen
  return <ChatScreen />;
}
