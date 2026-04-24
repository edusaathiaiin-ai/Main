-- 137_live_session_terms_and_refund.sql
--
-- Faculty-authored terms + refund window on every live_session.
--
-- Motivation (April 2026): the booking page currently shows a platform-written
-- line "Full refund if session cancelled · Meeting link shared 24h before ·
-- Payment secure via Razorpay". That line is NOT the faculty's commitment —
-- it's platform boilerplate. When a dispute arises, there's no black-and-white
-- contract between faculty and student about:
--   - what the session actually covers / what prerequisites are needed
--   - whether recording is permitted
--   - how long before start a student can cancel for refund
--
-- Adding these columns makes the faculty's commitment a first-class record.
-- The /live/[id] page renders them in a "Set by faculty" box so the student
-- reads the faculty's own terms before paying, and the admin can resolve
-- disputes by pointing to the exact promise that was accepted at booking time.
--
-- Lock semantics:
--   terms and refund_window_hours are editable by the faculty until the first
--   seat is booked. The trigger below stamps terms_locked_at at that moment,
--   and the second trigger rejects any subsequent change to either column.
--   This prevents a faculty from changing the refund window after students
--   have already agreed to the original one.
--
-- Additive-only migration — no drops, no data backfill needed.

ALTER TABLE public.live_sessions
  ADD COLUMN IF NOT EXISTS terms TEXT,
  ADD COLUMN IF NOT EXISTS refund_window_hours INT NOT NULL DEFAULT 24,
  ADD COLUMN IF NOT EXISTS terms_locked_at TIMESTAMPTZ;

-- 0 = non-refundable (explicit, not null). Anything < 0 is nonsense.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'live_sessions_refund_window_nonneg'
  ) THEN
    ALTER TABLE public.live_sessions
      ADD CONSTRAINT live_sessions_refund_window_nonneg
      CHECK (refund_window_hours >= 0);
  END IF;
END
$$;

-- Stamp terms_locked_at on first booking — runs AFTER INSERT into live_bookings
CREATE OR REPLACE FUNCTION public.lock_live_session_terms()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE public.live_sessions
  SET terms_locked_at = NOW()
  WHERE id = NEW.session_id
    AND terms_locked_at IS NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lock_live_session_terms ON public.live_bookings;
CREATE TRIGGER trg_lock_live_session_terms
  AFTER INSERT ON public.live_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.lock_live_session_terms();

-- Reject edits to terms / refund_window_hours once locked
CREATE OR REPLACE FUNCTION public.reject_locked_terms_edit()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF OLD.terms_locked_at IS NOT NULL THEN
    IF NEW.terms IS DISTINCT FROM OLD.terms THEN
      RAISE EXCEPTION 'terms_locked: session has active bookings — terms cannot be changed';
    END IF;
    IF NEW.refund_window_hours IS DISTINCT FROM OLD.refund_window_hours THEN
      RAISE EXCEPTION 'terms_locked: session has active bookings — refund window cannot be changed';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_reject_locked_terms_edit ON public.live_sessions;
CREATE TRIGGER trg_reject_locked_terms_edit
  BEFORE UPDATE OF terms, refund_window_hours ON public.live_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.reject_locked_terms_edit();

COMMENT ON COLUMN public.live_sessions.terms IS
  'Faculty-written terms, prerequisites, recording policy, etc. Shown to students on /live/[id]. Editable until first booking stamps terms_locked_at.';
COMMENT ON COLUMN public.live_sessions.refund_window_hours IS
  'Hours before first lecture that a student can cancel for full refund. 0 = non-refundable. Default 24h.';
COMMENT ON COLUMN public.live_sessions.terms_locked_at IS
  'Timestamp of the first live_bookings INSERT for this session. Once set, terms and refund_window_hours are frozen.';
