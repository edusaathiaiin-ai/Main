-- 148_meeting_link_optional_for_whereby.sql
-- Relax the published-session meeting_link guard to permit whereby/in_app
-- sessions, where the URL is generated lazily at faculty Join (whereby)
-- or never needed (in_app peer tiles).
--
-- Old constraint required meeting_link length > 10 the moment status flips
-- to 'published'. With migration 147, video_provider routes some published
-- sessions to whereby, which has no URL until faculty actually clicks Join.
--
-- New rule: published sessions need a meeting_link UNLESS the provider is
-- whereby or in_app, both of which the classroom shell handles itself.
-- google_meet sessions still require the link — same as today.

ALTER TABLE live_sessions
  DROP CONSTRAINT IF EXISTS live_sessions_published_meeting_link;

ALTER TABLE live_sessions
  ADD CONSTRAINT live_sessions_published_meeting_link
  CHECK (
    status <> 'published'
    OR video_provider IN ('whereby','in_app')
    OR (meeting_link IS NOT NULL AND length(TRIM(BOTH FROM meeting_link)) > 10)
  );
