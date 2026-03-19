import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';

import { useAuth } from '@/hooks/useAuth';

type Props = {
  children: React.ReactNode;
};

/**
 * Wraps authenticated-only screens.
 *
 * Guard logic:
 *  - Loading        → show spinner (session is being restored from SecureStore)
 *  - No session     → redirect to /(auth)/login
 *  - Session, role = null → redirect to /(auth)/role-select (onboarding Step 3)
 *  - Session, role set    → render children
 */
export function ProtectedRoute({ children }: Props) {
  const { session, profile, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-cream">
        <ActivityIndicator size="large" color="#C9993A" />
      </View>
    );
  }

  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  if (profile?.role === null || profile?.role === undefined) {
    // User authenticated but hasn't completed onboarding role selection
    return <Redirect href="/(auth)/role-select" />;
  }

  return <>{children}</>;
}
