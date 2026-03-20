/**
 * supabase/functions/rss-fetch/index.ts
 *
 * RSS News Fetcher — runs via cron at 6:00 AM IST daily.
 * Fetches RSS feeds for all active verticals, parses headlines + URLs,
 * and upserts into news_items table. Never stores article body.
 *
 * ── CRON AUTH ────────────────────────────────────────────────────────────────
 * This function uses a CRON_SECRET header — NOT the service role key.
 * The service role key must NEVER appear in SQL cron jobs.
 *
 * Trigger via Supabase cron:
 *   select cron.schedule('rss-fetch-daily', '30 0 * * *', $$
 *     select net.http_post(
 *       url     := 'https://<project>.supabase.co/functions/v1/rss-fetch',
 *       headers := '{"x-cron-secret": "<CRON_SECRET>"}'::jsonb
 *     );
 *   $$);
 *   (30 0 UTC = 05:30 IST = 6:00 AM IST)
 *
 * Add to Supabase secrets:
 *   CRON_SECRET=<random 32-char string — generate with: openssl rand -hex 16>
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const CRON_SECRET = Deno.env.get('CRON_SECRET') ?? '';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ---------------------------------------------------------------------------
// RSS feed definitions — headline + URL only (zero copyright risk)
// ---------------------------------------------------------------------------

type FeedDef = {
  url: string;
  source: string;
  category: string;
};

const RSS_FEEDS: Record<string, FeedDef[]> = {
  kanoonsaathi: [
    { url: 'https://www.barandbench.com/feed', source: 'Bar & Bench', category: 'Law' },
    { url: 'https://www.livelaw.in/feed', source: 'Live Law', category: 'Law' },
    { url: 'https://feeds.feedburner.com/TheHinduLegal', source: 'The Hindu Legal', category: 'Law' },
  ],
  medicosaathi: [
    { url: 'https://pubmed.ncbi.nlm.nih.gov/rss/search/?term=medical+education&format=rss', source: 'PubMed', category: 'Medical Research' },
    { url: 'https://rss.sciencedaily.com/releases/health_medicine.xml', source: 'Science Daily', category: 'Health' },
  ],
  pharmasaathi: [
    { url: 'https://www.pharmacytimes.com/rss/all', source: 'Pharmacy Times', category: 'Pharmacy' },
    { url: 'https://pubmed.ncbi.nlm.nih.gov/rss/search/?term=pharmacology&format=rss', source: 'PubMed', category: 'Pharmacology Research' },
  ],
  nursingsaathi: [
    { url: 'https://rss.sciencedaily.com/releases/health_medicine.xml', source: 'Science Daily', category: 'Nursing' },
  ],
  psychsaathi: [
    { url: 'https://pubmed.ncbi.nlm.nih.gov/rss/search/?term=psychology+education&format=rss', source: 'PubMed', category: 'Psychology' },
    { url: 'https://rss.sciencedaily.com/releases/mind_brain.xml', source: 'Science Daily', category: 'Psychology' },
  ],
  maathsaathi: [
    { url: 'https://rss.sciencedaily.com/releases/computers_math.xml', source: 'Science Daily', category: 'Mathematics' },
    { url: 'https://arxiv.org/rss/math', source: 'arXiv', category: 'Mathematics Research' },
  ],
  chemsaathi: [
    { url: 'https://feeds.rsc.org/rss/cc', source: 'Royal Society of Chemistry', category: 'Chemistry' },
    { url: 'https://rss.sciencedaily.com/releases/chemistry.xml', source: 'Science Daily', category: 'Chemistry' },
  ],
  biosaathi: [
    { url: 'https://rss.sciencedaily.com/releases/biology.xml', source: 'Science Daily', category: 'Biology' },
    { url: 'https://arxiv.org/rss/q-bio', source: 'arXiv', category: 'Biology Research' },
  ],
  mechsaathi: [
    { url: 'https://spectrum.ieee.org/feeds/feed.rss', source: 'IEEE Spectrum', category: 'Engineering' },
    { url: 'https://rss.sciencedaily.com/releases/matter_energy/engineering.xml', source: 'Science Daily', category: 'Mechanical Engineering' },
  ],
  civilsaathi: [
    { url: 'https://rss.sciencedaily.com/releases/matter_energy/civil_engineering.xml', source: 'Science Daily', category: 'Civil Engineering' },
  ],
  elecsaathi: [
    { url: 'https://spectrum.ieee.org/feeds/feed.rss', source: 'IEEE Spectrum', category: 'Electronics' },
    { url: 'https://rss.sciencedaily.com/releases/computers_math/computer_science.xml', source: 'Science Daily', category: 'Electronics' },
  ],
  compsaathi: [
    { url: 'https://arxiv.org/rss/cs.AI', source: 'arXiv AI', category: 'Computer Science Research' },
    { url: 'https://rss.sciencedaily.com/releases/computers_math/artificial_intelligence.xml', source: 'Science Daily', category: 'Computer Science' },
  ],
  envirosaathi: [
    { url: 'https://rss.sciencedaily.com/releases/earth_climate.xml', source: 'Science Daily', category: 'Environmental Science' },
    { url: 'https://arxiv.org/rss/eess.SP', source: 'arXiv', category: 'Environmental Research' },
  ],
  bizsaathi: [
    { url: 'https://economictimes.indiatimes.com/rssfeedstopstories.cms', source: 'Economic Times', category: 'Business' },
    { url: 'https://www.livemint.com/rss/news', source: 'Mint', category: 'Business' },
  ],
  finsaathi: [
    { url: 'https://rbi.org.in/rss/Rss.aspx', source: 'RBI', category: 'Finance' },
    { url: 'https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms', source: 'Economic Times Markets', category: 'Finance' },
  ],
  mktsaathi: [
    { url: 'https://economictimes.indiatimes.com/industry/rssfeeds/13352306.cms', source: 'Economic Times Industry', category: 'Marketing' },
    { url: 'https://www.livemint.com/rss/brand-stories', source: 'Mint', category: 'Marketing' },
  ],
  hrsaathi: [
    { url: 'https://economictimes.indiatimes.com/wealth/rssfeeds/837555174.cms', source: 'Economic Times', category: 'HR' },
  ],
  archsaathi: [
    { url: 'https://www.archdaily.com/feed', source: 'ArchDaily', category: 'Architecture' },
    { url: 'https://www.dezeen.com/feed/', source: 'Dezeen', category: 'Architecture & Design' },
  ],
  historysaathi: [
    { url: 'https://www.historytoday.com/rss.xml', source: 'History Today', category: 'History' },
    { url: 'https://rss.sciencedaily.com/releases/fossils_ruins.xml', source: 'Science Daily', category: 'Archaeology' },
  ],
  econsaathi: [
    { url: 'https://rbi.org.in/rss/Rss.aspx', source: 'RBI', category: 'Economics' },
    { url: 'https://economictimes.indiatimes.com/rssfeeds/7771282.cms', source: 'Economic Times', category: 'Economics' },
  ],
};

// UPSC feeds shared across all verticals
const UPSC_FEEDS: FeedDef[] = [
  { url: 'https://www.thehindu.com/news/national/feeder/default.rss', source: 'The Hindu National', category: 'UPSC' },
  { url: 'https://pib.gov.in/RssMain.aspx?ModId=6&Lang=1&Regid=3', source: 'PIB India', category: 'UPSC' },
  { url: 'https://prsindia.org/rss.xml', source: 'PRS India', category: 'UPSC' },
];

// ---------------------------------------------------------------------------
// RSS parsing — pure text parsing, no external parser library needed
// ---------------------------------------------------------------------------

type RssItem = {
  title: string;
  url: string;
  publishedAt: string | null;
};

function extractText(xml: string, tag: string): string {
  // Handle CDATA
  const cdataRx = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`, 'i');
  const cdataMatch = xml.match(cdataRx);
  if (cdataMatch?.[1]) return cdataMatch[1].trim();

  // Handle plain text
  const plainRx = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`, 'i');
  const plainMatch = xml.match(plainRx);
  return plainMatch?.[1]?.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim() ?? '';
}

function parseRssFeed(xml: string, maxItems = 10): RssItem[] {
  const items: RssItem[] = [];

  // Split on <item> or <entry> tags (RSS 2.0 and Atom)
  const itemRx = /<(?:item|entry)>([\s\S]*?)<\/(?:item|entry)>/gi;
  let match: RegExpExecArray | null;

  while ((match = itemRx.exec(xml)) !== null && items.length < maxItems) {
    const block = match[1];

    const title = extractText(block, 'title');
    // For links: try <link>, then <link href="..."/>, then <guid isPermaLink="true">
    const linkPlain = extractText(block, 'link');
    const linkAtomMatch = block.match(/<link[^>]+href="([^"]+)"/i);
    const url = linkAtomMatch?.[1] ?? linkPlain;

    const pubDate =
      extractText(block, 'pubDate') ||
      extractText(block, 'published') ||
      extractText(block, 'updated') ||
      null;

    if (!title || !url) continue;

    let publishedAt: string | null = null;
    if (pubDate) {
      try {
        publishedAt = new Date(pubDate).toISOString();
      } catch {
        publishedAt = null;
      }
    }

    items.push({ title, url, publishedAt });
  }

  return items;
}

// ---------------------------------------------------------------------------
// Fetch one feed with a timeout
// ---------------------------------------------------------------------------

async function fetchFeed(feedUrl: string, timeoutMs = 8000): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(feedUrl, {
      headers: { 'User-Agent': 'EdUsaathiAI-RSSBot/1.0' },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  // Accept both GET (cron trigger) and POST (manual trigger)
  if (req.method !== 'GET' && req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  // ── CRON_SECRET auth check ─────────────────────────────────────────────────
  // The cron job sends x-cron-secret instead of the service role key.
  // This prevents the service role key from ever appearing in SQL.
  const incomingSecret = req.headers.get('x-cron-secret');
  if (!CRON_SECRET || incomingSecret !== CRON_SECRET) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  // ────────────────────────────────────────────────────────────────────────────

  const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  const failedFeeds: { vertical: string; url: string; source: string; reason: string }[] = [];
  const results: Record<string, { inserted: number; skipped: number; errors: string[] }> = {};
  let totalInserted = 0;

  for (const [verticalId, feeds] of Object.entries(RSS_FEEDS)) {
    results[verticalId] = { inserted: 0, skipped: 0, errors: [] };

    // Each vertical gets its own feeds + shared UPSC feeds
    const allFeeds = [...feeds, ...UPSC_FEEDS];

    for (const feed of allFeeds) {
      const xml = await fetchFeed(feed.url);
      if (!xml) {
        const reason = `Failed to fetch: ${feed.url}`;
        results[verticalId].errors.push(reason);
        failedFeeds.push({ vertical: verticalId, url: feed.url, source: feed.source, reason });
        // 200ms delay even on failure to avoid hammering on retries
        await new Promise(r => setTimeout(r, 200));
        continue;
      }

      const items = parseRssFeed(xml, 10);

      for (const item of items) {
        const { error } = await admin.from('news_items').upsert(
          {
            vertical_id: verticalId,
            source: feed.source,
            category: feed.category,
            title: item.title.slice(0, 500),
            url: item.url.slice(0, 1000),
            published_at: item.publishedAt,
            fetched_at: new Date().toISOString(),
            is_active: true,
          },
          { onConflict: 'url', ignoreDuplicates: false }
        );

        if (error) {
          // Duplicate URL = expected — silently skip
          if (!error.message.includes('duplicate') && !error.message.includes('unique')) {
            results[verticalId].errors.push(`DB error for ${item.url}: ${error.message}`);
            results[verticalId].skipped++;
          } else {
            results[verticalId].skipped++;
          }
        } else {
          results[verticalId].inserted++;
          totalInserted++;
        }
      }

      // 200ms between fetches to avoid rate limiting from RSS providers
      await new Promise(r => setTimeout(r, 200));
    }
  }

  // Deactivate news items older than 7 days to keep the feed fresh
  const cutoff = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  await admin
    .from('news_items')
    .update({ is_active: false })
    .lt('fetched_at', cutoff)
    .eq('is_active', true);

  // ── Feed health logging — fire-and-forget ──────────────────────────────────
  // Logs failed feeds so admin dashboard can surface broken sources.
  if (failedFeeds.length > 0) {
    admin.from('rss_feed_health').upsert(
      failedFeeds.map(f => ({
        vertical_id:   f.vertical,
        feed_url:      f.url,
        source_name:   f.source,
        error_message: f.reason,
        failed_at:     new Date().toISOString(),
        resolved_at:   null,
      })),
      { onConflict: 'feed_url' }
    ).then(({ error }: { error: { message: string } | null }) => {
      if (error) console.warn('rss_feed_health upsert failed:', error.message);
    });
  }
  // ────────────────────────────────────────────────────────────────────────────

  return new Response(
    JSON.stringify({
      ok: true,
      totalInserted,
      verticals: Object.keys(RSS_FEEDS).length,
      results,
      runAt: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    }
  );
});
