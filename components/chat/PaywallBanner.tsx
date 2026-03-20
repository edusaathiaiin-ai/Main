/**
 * components/chat/PaywallBanner.tsx
 *
 * Tier-aware paywall banner shown when a user without the right tier
 * taps a locked bot slot in ChatScreen.
 *
 * Free → Plus  : "Unlock all 5 bots"
 * Plus → Pro   : "50 chats/day, 24h cooling"
 * Pro  → Unlimited : "Zero cooling, ever"
 */

import { Pressable, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useSubscription } from '@/hooks/useSubscription';

type PaywallBannerProps = {
  botSlot: number;
  saathiPrimary?: string;
};

const BOT_SLOT_NAMES: Record<number, string> = {
  2: 'Practice Buddy',
  3: 'Debate Partner',
  4: 'Research Guide',
};

type UpsellCopy = {
  emoji: string;
  headline: string;
  sub: string;
  cta: string;
  bg: string;
  border: string;
  textColor: string;
};

function getUpsellCopy(planId: string): UpsellCopy {
  switch (planId) {
    case 'plus':
      return {
        emoji: '🚀',
        headline: 'Upgrade to Saathi Pro',
        sub: '50 chats/day, 24h cooling half the wait. Fastest responses.',
        cta: 'Explore Pro — ₹499/mo →',
        bg: '#F0F9FF',
        border: '#BAE6FD',
        textColor: '#0369A1',
      };
    case 'pro':
      return {
        emoji: '🔥',
        headline: 'Go Unlimited — Zero cooling, ever.',
        sub: 'No cooling periods. No limits. Ever. For those who are serious.',
        cta: 'Explore Unlimited — ₹4,999/mo →',
        bg: '#0B1F3A',
        border: '#C9993A',
        textColor: '#C9993A',
      };
    default: // free
      return {
        emoji: '✦',
        headline: 'Unlock all 5 bots',
        sub: 'Upgrade to Saathi Plus — all bots, all Saathis, unlimited check-ins.',
        cta: 'See Plus plans →',
        bg: '#FFFBEB',
        border: '#C9993A30',
        textColor: '#92400E',
      };
  }
}

export function PaywallBanner({ botSlot, saathiPrimary = '#C9993A' }: PaywallBannerProps) {
  const router = useRouter();
  const { planId } = useSubscription();
  const botName = BOT_SLOT_NAMES[botSlot] ?? `Bot ${botSlot}`;
  const copy = getUpsellCopy(planId);

  return (
    <View
      className="mx-4 mb-4 rounded-2xl p-5"
      style={{ backgroundColor: copy.bg, borderWidth: 1.5, borderColor: copy.border }}
    >
      <View className="flex-row items-center mb-3">
        <Text style={{ fontSize: 26, marginRight: 10 }}>{copy.emoji}</Text>
        <View className="flex-1">
          <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 15, color: planId === 'pro' ? '#fff' : '#0B1F3A' }}>
            {botName} — {copy.headline}
          </Text>
          <Text style={{ fontFamily: 'DMSans-Regular', fontSize: 13, color: planId === 'pro' ? '#ffffff99' : '#0B1F3A80', marginTop: 2 }}>
            {copy.sub}
          </Text>
        </View>
      </View>

      <Pressable
        onPress={() => router.push('/(tabs)/pricing')}
        className="rounded-xl items-center py-3"
        style={{ backgroundColor: planId === 'pro' ? '#C9993A' : saathiPrimary }}
      >
        <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 14, color: planId === 'pro' ? '#0B1F3A' : '#FAF7F2' }}>
          {copy.cta}
        </Text>
      </Pressable>
    </View>
  );
}
