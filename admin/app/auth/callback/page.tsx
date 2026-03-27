// Server component — force-dynamic so Supabase client is never called at build time.
export const dynamic = 'force-dynamic';

import { AuthCallbackClient } from './AuthCallbackClient';

export default function AuthCallbackPage() {
  return <AuthCallbackClient />;
}
