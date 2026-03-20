/**
 * lib/supabase-browser.ts
 * Client-side Supabase client for login / session reads in the browser.
 */
import { createBrowserClient } from '@supabase/ssr';

export function getBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
