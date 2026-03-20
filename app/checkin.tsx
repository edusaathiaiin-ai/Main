import { Redirect } from 'expo-router';

/**
 * app/checkin.tsx
 *
 * Legacy stub — redirects to the real Check-in entry screen.
 * The full Check-in flow lives under app/(tabs)/checkin/.
 */
export default function CheckinRedirect() {
  return <Redirect href="/(tabs)/checkin" />;
}

