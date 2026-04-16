-- Round-robin queue marker for rss-fetch edge function.
-- Function picks the vertical with the oldest last_rss_fetch_at (NULL first),
-- processes it, then updates this column. With cron firing every 2 minutes,
-- 30 saathis cycle through in ~60 minutes. Fail-safe: any vertical that errors
-- out keeps its old timestamp and stays at the front of the queue.

ALTER TABLE verticals
  ADD COLUMN IF NOT EXISTS last_rss_fetch_at timestamptz;

COMMENT ON COLUMN verticals.last_rss_fetch_at IS
  'Set by rss-fetch edge function. Function picks vertical with oldest value (NULL first) to process — provides round-robin queue.';

-- news_items columns the rss-fetch upsert was writing but didn't exist
ALTER TABLE news_items
  ADD COLUMN IF NOT EXISTS domain_verified boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS professor_note  text;
