/*
  Migration: 030_news_items_read_policy.sql
  Purpose: Allow authenticated users to SELECT active news items directly.
           Students fetch news via the client SDK for the News tab.
           Only is_active = true rows are visible — stale/deactivated news
           is automatically hidden without any client-side filtering.
*/

create policy "authenticated users can read active news"
  on public.news_items
  for select
  to authenticated
  using (is_active = true);
