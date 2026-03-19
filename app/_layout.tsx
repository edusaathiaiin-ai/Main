import '../global.css';
import 'react-native-reanimated';

import { Stack } from 'expo-router';

import { initializeSentryWithDsn } from '@/lib/sentry';

initializeSentryWithDsn(process.env.SENTRY_DSN);

export default function RootLayout() {
  return <Stack screenOptions={{ headerShown: false }} />;
}
