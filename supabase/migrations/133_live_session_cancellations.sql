-- ═══════════════════════════════════════════════════════════════════════════════
-- 133 — Faculty-initiated session cancellation + student refund tracking
--
-- Rules (per CLAUDE.md / product decision):
--   * Faculty can cancel a published session up to T-1h before scheduled_at.
--   * Cancellation marks session + all its lectures as 'cancelled', freezes
--     the faculty payout (`payout_status='on_hold'`), and opens a refund
--     request on every paid booking.
--   * We don't collect student UPI at booking time. After cancellation the
--     student visits /refunds, pastes UPI, admin transfers manually then
--     marks each booking as refunded.
--
-- Refund states on live_bookings.refund_status:
--   none      — booking is fine, nothing pending
--   pending   — session was cancelled; awaiting student UPI
--   ready     — student submitted UPI; admin needs to send money
--   paid      — admin transferred and confirmed
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE public.live_bookings
  ADD COLUMN IF NOT EXISTS refund_upi_id        TEXT        NULL,
  ADD COLUMN IF NOT EXISTS refund_initiated_at  TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS refund_status        TEXT        NOT NULL DEFAULT 'none',
  ADD COLUMN IF NOT EXISTS refund_upi_reference TEXT        NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'live_bookings_refund_status_check'
  ) THEN
    ALTER TABLE public.live_bookings
      ADD CONSTRAINT live_bookings_refund_status_check
      CHECK (refund_status IN ('none', 'pending', 'ready', 'paid'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_live_bookings_refund_status
  ON live_bookings(refund_status)
  WHERE refund_status <> 'none';

-- Allow students to read + update only their own booking's refund_upi_id.
-- (existing live_bookings_own policy already covers SELECT/UPDATE for student_id = auth.uid().)
