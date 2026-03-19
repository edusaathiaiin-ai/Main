import { Redirect } from 'expo-router';

/**
 * Root index — always start at splash.
 * AuthRedirect in _layout.tsx handles returning users (redirects to home
 * near-instantly, before the 2-second splash timer fires).
 */
export default function Index() {
  return <Redirect href="/(auth)/splash" />;
}

