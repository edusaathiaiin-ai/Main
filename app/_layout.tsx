import '../global.css';
import 'react-native-reanimated';

import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import * as WebBrowser from 'expo-web-browser';
import {
  useFonts,
  PlayfairDisplay_400Regular,
  PlayfairDisplay_700Bold,
} from '@expo-google-fonts/playfair-display';
import {
  DMSans_400Regular,
  DMSans_500Medium,
  DMSans_700Bold,
} from '@expo-google-fonts/dm-sans';

import { initializeSentryWithDsn } from '@/lib/sentry';
import { AuthProvider, useAuth } from '@/hooks/useAuth';

// Keep native splash screen visible until fonts + auth are ready
SplashScreen.preventAutoHideAsync();

// Required for iOS to close ASWebAuthenticationSession after OAuth redirect
WebBrowser.maybeCompleteAuthSession();

initializeSentryWithDsn(process.env.EXPO_PUBLIC_SENTRY_DSN);

// ─── Auth-aware redirect ───────────────────────────────────────────────────
// Runs inside AuthProvider so it can read auth state.
function AuthRedirect() {
  const { session, profile, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inTabsGroup = segments[0] === '(tabs)';

    if (!session && !inAuthGroup) {
      // Not authenticated → send to login
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup) {
      if (profile?.role === null || profile?.role === undefined) {
        // Authenticated but onboarding incomplete → role selector
        router.replace('/(auth)/role-select');
      } else if (inTabsGroup === false) {
        // Fully set up → home
        router.replace('/(tabs)/home');
      }
    }
  }, [isLoading, session, profile, segments, router]);

  return null;
}

// ─── Root layout ──────────────────────────────────────────────────────────
export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    'PlayfairDisplay-Regular': PlayfairDisplay_400Regular,
    'PlayfairDisplay-Bold': PlayfairDisplay_700Bold,
    'DMSans-Regular': DMSans_400Regular,
    'DMSans-Medium': DMSans_500Medium,
    'DMSans-Bold': DMSans_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  // Don't render until fonts are ready (avoids FOUT on first paint)
  if (!fontsLoaded && !fontError) return null;

  return (
    <AuthProvider>
      <AuthRedirect />
      <Stack screenOptions={{ headerShown: false }} />
    </AuthProvider>
  );
}

