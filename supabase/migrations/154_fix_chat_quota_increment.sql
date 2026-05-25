-- ═══════════════════════════════════════════════════════════════════════════════
-- 154 — Fix chat-quota increment (CRITICAL — quota enforcement was 100% broken)
--
-- chat_sessions.message_count has been stuck at 0 across the entire 90-day
-- retained history. The chat edge function's incrementQuota was calling
-- PostgREST .update({message_count, cooling_until}).eq(...) and silently
-- no-opping — returning `error: null` while updating 0 rows. Forensics ruled
-- out the DB layer (raw SQL UPDATE works fine on the same row), the WHERE
-- clause (the personality_id update with the same WHERE persisted), code
-- privileges, triggers, and constraints. Root cause within the JS/PostgREST
-- request shape couldn't be pinpointed from forensics.
--
-- Result so far: daily caps and 48h cooling have NEVER been enforced on the
-- website chat path. Free post-trial users could chat unlimited; paid users
-- could exceed their daily cap. Cooling never fired.
--
-- This migration routes around the whole class of bug with two pieces:
--
--   1. UNIQUE (user_id, vertical_id, bot_slot, quota_date_ist) — verified
--      no existing duplicates before adding. Closes the latent race in
--      getOrCreateQuotaRow that could create two rows for the same tuple.
--
--   2. increment_chat_quota() — SECURITY DEFINER. One atomic upsert that
--      either inserts the row at message_count=1 or increments the existing
--      row by 1. Sets cooling_until on the row that crosses the daily cap.
--      No PostgREST UPDATE path involved at all.
--
-- The chat function (separate deploy) replaces its broken JS-side increment
-- with `admin.rpc('increment_chat_quota', …)`.
--
-- Idempotent — safe to re-run.
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. Unique constraint (no duplicates exist as of 2026-05-25) ─────────────
ALTER TABLE public.chat_sessions
  DROP CONSTRAINT IF EXISTS chat_sessions_quota_key;
ALTER TABLE public.chat_sessions
  ADD CONSTRAINT chat_sessions_quota_key
  UNIQUE (user_id, vertical_id, bot_slot, quota_date_ist);

-- ── 2. Atomic increment RPC ─────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.increment_chat_quota(
  p_user_id       uuid,
  p_vertical_id   uuid,
  p_bot_slot      integer,
  p_date_ist      date,
  p_daily_quota   integer,
  p_cooling_hours integer
) RETURNS TABLE (new_count integer, cooling_until timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count   integer;
  v_cooling timestamptz;
  v_slot    smallint := p_bot_slot::smallint;
BEGIN
  -- Atomic upsert: insert row at message_count=1 OR bump the existing row
  -- by 1. ON CONFLICT keys off the new chat_sessions_quota_key.
  INSERT INTO public.chat_sessions
    (user_id, vertical_id, bot_slot, quota_date_ist, message_count)
  VALUES
    (p_user_id, p_vertical_id, v_slot, p_date_ist, 1)
  ON CONFLICT (user_id, vertical_id, bot_slot, quota_date_ist)
  DO UPDATE SET message_count = public.chat_sessions.message_count + 1
  RETURNING public.chat_sessions.message_count, public.chat_sessions.cooling_until
  INTO v_count, v_cooling;

  -- First time we cross the daily cap → start cooling. Idempotent: if
  -- v_cooling is already set, leave it alone (cron-quota-reset clears it).
  IF v_count >= p_daily_quota AND v_cooling IS NULL AND p_cooling_hours > 0 THEN
    v_cooling := now() + (p_cooling_hours || ' hours')::interval;
    UPDATE public.chat_sessions
       SET cooling_until = v_cooling
     WHERE user_id      = p_user_id
       AND vertical_id  = p_vertical_id
       AND bot_slot     = v_slot
       AND quota_date_ist = p_date_ist;
  END IF;

  RETURN QUERY SELECT v_count, v_cooling;
END;
$$;

REVOKE ALL ON FUNCTION public.increment_chat_quota(uuid, uuid, integer, date, integer, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.increment_chat_quota(uuid, uuid, integer, date, integer, integer) TO service_role;
