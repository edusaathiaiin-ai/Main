/**
 * lib/supabase-browser.ts
 * Client-side Supabase client for login / session reads in the browser.
 */
import { createBrowserClient } from '@supabase/ssr';

export const supabaseBrowser = createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      flowType: 'pkce',
      detectSessionInUrl: true,
    },
  }
);

// Keep function export for backward compat
export function getBrowserClient() {
  return supabaseBrowser;
}
