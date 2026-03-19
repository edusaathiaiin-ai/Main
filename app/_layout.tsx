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
// Handles both first-load routing and app-restart mid-onboarding recovery.
function AuthRedirect() {
  const { session, profile, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const segs = segments as string[];
    const currentScreen = segs[1] as string | undefined;

    // Pre-auth screens: accessible without a session
    const PRE_AUTH = new Set(['splash', 'welcome', 'login', 'otp-verify']);

    if (!session) {
      // Unauthenticated — only allow (auth) group screens
      if (!inAuthGroup) {
        router.replace('/(auth)/splash');
      }
      return;
    }

    // Authenticated — determine correct step based on profile state
    if (!profile) return; // profile still resolving

    const role = profile.role;
    const hasSaathi = Boolean(profile.primary_saathi_id);
    const hasName = Boolean(profile.full_name);

    if (!role) {
      // Step 3 — need to pick role
      if (currentScreen !== 'role-select') {
        router.replace('/(auth)/role-select');
      }
    } else if (!hasSaathi) {
      // Step 4 — need to pick primary Saathi
      if (currentScreen !== 'saathi-picker') {
        router.replace('/(auth)/saathi-picker');
      }
    } else if (!hasName) {
      // Step 5 — need to complete profile
      if (currentScreen !== 'profile-setup') {
        router.replace('/(auth)/profile-setup');
      }
    } else {
      // Onboarding complete — if on any pre-auth or auth screen, go to home
      if (inAuthGroup && (PRE_AUTH.has(currentScreen ?? '') || currentScreen === 'role-select' || currentScreen === 'saathi-picker' || currentScreen === 'profile-setup')) {
        router.replace('/(tabs)/home');
      } else if (!inAuthGroup && segments[0] !== '(tabs)' && segments[0] !== 'saathi') {
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

