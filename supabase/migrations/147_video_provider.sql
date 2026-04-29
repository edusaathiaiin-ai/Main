-- 147_video_provider.sql
-- Video provider routing columns for automatic Whereby/Meet selection.
--
-- Two-phase decision:
--   Phase 1 — provisional pick at session creation (booking count predicted).
--   Phase 2 — final lock at faculty Join (actual booking count known).
--
-- Selection logic (lives in code, not SQL):
--   faculty_session              → whereby      (always 1:1)
--   live_session, booked < 25    → whereby      (small group, intimate iframe)
--   live_session, booked >= 25   → google_meet  (cost gap matters at scale)
--
-- Whereby rooms are created lazily: only when faculty actually clicks Join.
-- whereby_room_url + whereby_host_url cache the API response so we don't
-- re-create rooms on refresh / second device.
--
-- in_app reserved for the 100ms.live in-app video path that already exists
-- on live_sessions.classroom_mode = 'in_app'. Kept here so the column can
-- represent the full set of video routes we'll ever take.

ALTER TABLE live_sessions
  ADD COLUMN IF NOT EXISTS video_provider
    text DEFAULT 'google_meet'
    CHECK (video_provider IN ('whereby','google_meet','in_app')),
  ADD COLUMN IF NOT EXISTS video_provider_locked
    boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS whereby_room_id   text,
  ADD COLUMN IF NOT EXISTS whereby_room_url  text,
  ADD COLUMN IF NOT EXISTS whereby_host_url  text;

ALTER TABLE faculty_sessions
  ADD COLUMN IF NOT EXISTS video_provider
    text DEFAULT 'whereby'
    CHECK (video_provider IN ('whereby','google_meet','in_app')),
  ADD COLUMN IF NOT EXISTS video_provider_locked
    boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS whereby_room_id   text,
  ADD COLUMN IF NOT EXISTS whereby_room_url  text,
  ADD COLUMN IF NOT EXISTS whereby_host_url  text;
