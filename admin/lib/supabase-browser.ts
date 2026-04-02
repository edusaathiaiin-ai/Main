/**
 * lib/supabase-browser.ts
 * Client-side Supabase client for login / session reads in the browser.
 * Uses implicit flow so magic links work regardless of which browser opens them.
 */
import { createBrowserClient } from '@supabase/ssr';

// Lazily initialised so the module can be imported at build time
// without NEXT_PUBLIC_* env vars present.
let _client: ReturnType<typeof createBrowserClient> | null = null;

function makeClient(): ReturnType<typeof createBrowserClient> {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        flowType: 'implicit',
        detectSessionInUrl: true,
      },
    }
  );
}

export function getBrowserClient(): ReturnType<typeof createBrowserClient> {
  if (!_client) _client = makeClient();
  return _client;
}

// supabaseBrowser — same lazy client, typed via function return
// Accessing any property defers client creation to first use.
export const supabaseBrowser = new Proxy(
  {} as ReturnType<typeof makeClient>,
  {
    get(_t, prop: string | symbol) {
      return Reflect.get(getBrowserClient(), prop);
    },
  }
) as ReturnType<typeof makeClient>;
