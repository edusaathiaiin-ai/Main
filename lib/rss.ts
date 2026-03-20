/**
 * lib/rss.ts
 *
 * RSS fetching is handled server-side by the Supabase Edge Function:
 *   supabase/functions/rss-fetch/index.ts
 *
 * Runs at 6:00 AM IST daily via Supabase cron (18:30 UTC).
 * Fetches all 20 Saathi feeds + UPSC shared feeds.
 * Upserts headline + URL only into news_items table (zero copyright risk).
 *
 * Client-side: read from news_items table directly via Supabase client
 * (see app/(tabs)/news.tsx).
 *
 * To manually trigger: POST to /functions/v1/rss-fetch with service role key.
 */
export {}; // This module intentionally has no client-side exports.
