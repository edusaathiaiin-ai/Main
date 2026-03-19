import { useEffect, useRef } from 'react';
import { Animated, Text, View } from 'react-native';
import { useRouter } from 'expo-router';

import { useAuth } from '@/hooks/useAuth';

export default function SplashScreen() {
  const router = useRouter();
  const { session, isLoading } = useAuth();

  const logoOpacity = useRef(new Animated.Value(0)).current;
  const taglineOpacity = useRef(new Animated.Value(0)).current;
  const subtitleOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade-in sequence: logo → tagline → subtitle
    Animated.sequence([
      Animated.timing(logoOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.timing(taglineOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.timing(subtitleOpacity, { toValue: 1, duration: 400, useNativeDriver: true }),
    ]).start();
  }, [logoOpacity, taglineOpacity, subtitleOpacity]);

  useEffect(() => {
    // Only auto-advance to welcome when there is NO session.
    // For returning users, AuthRedirect in _layout.tsx will redirect to home
    // near-instantly (before this 2s timer fires).
    if (isLoading) return;

    if (!session) {
      const timer = setTimeout(() => {
        router.replace('/(auth)/welcome');
      }, 2000);
      return () => clearTimeout(timer);
    }
    // Session present: let AuthRedirect handle navigation — do nothing here.
  }, [isLoading, session, router]);

  return (
    <View className="flex-1 items-center justify-center bg-navy">
      {/* Logo */}
      <Animated.View style={{ opacity: logoOpacity }} className="items-center">
        <Text
          className="text-5xl tracking-tight"
          style={{ fontFamily: 'PlayfairDisplay-Bold' }}
        >
          <Text style={{ color: '#FAF7F2' }}>EdU</Text>
          <Text style={{ color: '#C9993A' }}>saathi</Text>
          <Text style={{ color: '#FAF7F2' }}>AI</Text>
        </Text>
      </Animated.View>

      {/* Tagline */}
      <Animated.View style={{ opacity: taglineOpacity }} className="mt-4 items-center">
        <Text
          className="text-xs tracking-widest uppercase"
          style={{ fontFamily: 'DMSans-Regular', color: '#C9993A', letterSpacing: 4 }}
        >
          Unified Soul Partnership
        </Text>
      </Animated.View>

      {/* Subtitle */}
      <Animated.View style={{ opacity: subtitleOpacity }} className="mt-6 items-center px-12">
        <Text
          className="text-sm text-center leading-6"
          style={{ fontFamily: 'DMSans-Regular', color: '#FAF7F299' }}
        >
          Where every subject finds its Saathi
        </Text>
      </Animated.View>

      {/* IAES mark at bottom */}
      <View className="absolute bottom-12 items-center">
        <Text
          className="text-xs"
          style={{ fontFamily: 'DMSans-Regular', color: '#FAF7F240' }}
        >
          Indo American Education Society · Ahmedabad
        </Text>
      </View>
    </View>
  );
}

