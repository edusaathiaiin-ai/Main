import { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { Pressable, Text, View } from 'react-native';

type CoolingBannerProps = {
  coolingUntil: Date;
  saathiName?: string;
};

function formatCountdown(ms: number): string {
  if (ms <= 0) return '00:00:00';
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  return [h, m, s].map((n) => String(n).padStart(2, '0')).join(':');
}

export function CoolingBanner({ coolingUntil, saathiName }: CoolingBannerProps) {
  const [countdown, setCountdown] = useState(() =>
    formatCountdown(coolingUntil.getTime() - Date.now())
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = coolingUntil.getTime() - Date.now();
      setCountdown(formatCountdown(remaining));
      if (remaining <= 0) clearInterval(interval);
    }, 1000);
    return () => clearInterval(interval);
  }, [coolingUntil]);

  if (coolingUntil.getTime() <= Date.now()) return null;

  return (
    <View
      className="rounded-2xl px-4 py-3 mb-3"
      style={{ backgroundColor: '#FFF3E0', borderWidth: 1, borderColor: '#F9731620' }}
    >
      <Text style={{ fontFamily: 'DMSans-Bold', fontSize: 14, color: '#F97316' }}>
        ☕ Take a breather
      </Text>
      <Text style={{ fontFamily: 'DMSans-Regular', fontSize: 13, color: '#92400E', marginTop: 4 }}>
        Chat resumes in{' '}
        <Text style={{ fontFamily: 'DMSans-Bold', fontVariant: ['tabular-nums'] }}>
          {countdown}
        </Text>
      </Text>
      {saathiName ? (
        <Pressable onPress={() => router.push('/(tabs)/news')} hitSlop={6}>
          <Text
            style={{
              fontFamily: 'DMSans-Regular',
              fontSize: 12,
              color: '#92400ECC',
              marginTop: 4,
              textDecorationLine: 'underline',
            }}
          >
            Explore what's happening in {saathiName} while you wait.
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
