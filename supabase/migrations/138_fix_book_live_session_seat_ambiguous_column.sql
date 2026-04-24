-- 138_fix_book_live_session_seat_ambiguous_column.sql
--
-- CRITICAL HOTFIX — RESTORES PAID BOOKING FLOW
--
-- Incident (2026-04-24 ~16:45 IST, same day as the Sprint 1 paper citation
-- launch): a student (Prarthi, pjb13.in@gmail.com) paid ₹49 via Razorpay
-- for the session "Mastering in genetics and evolution". Razorpay captured
-- the payment (payment_id pay_ShJGzbjsFlUdJE). The verify-live-booking
-- edge function then threw 500 and the UI showed "Payment verification
-- failed. Contact support." Money left the student's account; no seat
-- was reserved.
--
-- Root cause
-- ──────────
-- The RPC book_live_session_seat declares
--   RETURNS TABLE (booking_id uuid, seats_booked integer, total_seats integer)
-- which creates implicit function-scoped variables with those names.
-- Its body then executed:
--   UPDATE public.live_sessions
--      SET seats_booked = seats_booked + 1,
--   ...
-- Postgres cannot decide whether `seats_booked` on either side of the `=`
-- refers to the table column or the function variable. It raises
--   ERROR 42702: column reference "seats_booked" is ambiguous
-- which aborts the RPC transaction. verify-live-booking's catch block
-- maps the abort to 500 and the client prints the generic
-- "Payment verification failed" banner.
--
-- Why this never showed up before today
-- ─────────────────────────────────────
-- Every booking attempt prior to this morning failed at the Supabase
-- gateway with 401 because verify_jwt was (implicitly) true on the
-- live-booking edge functions. The gateway rejected the request before
-- the function handler ran, so the RPC was never actually exercised.
-- Today's morning fix (config.toml entry adding verify_jwt=false for
-- razorpay-booking-order / verify-live-booking / book-free-session)
-- was the first time a real verify call reached the RPC — and the
-- latent ambiguous-column bug fired on the very first attempt.
--
-- Fix
-- ───
-- Alias the UPDATE target as `ls` and qualify the column reference,
-- so Postgres knows the LHS is the table column and the RHS is the
-- table column + 1. The RETURNS TABLE variables keep their names
-- (edge function callers read booking_id / seats_booked / total_seats
-- off the returned row).
--
-- Post-fix recovery
-- ─────────────────
-- Prarthi's booking was manually created by calling the fixed RPC
-- with her payment_id and a clearly-marked recovery order_id
-- (order_RECOVERY_prarthi_2026-04-24). Booking id
-- ebdf6ac6-f9d4-44b8-865c-aae3cf9fd2ae — seat 1/5 on session
-- 8c32399f-8b12-408d-883e-f71e323ee7cc. If audit needs the real
-- Razorpay order_id later, it can be reconciled from the Razorpay
-- dashboard using pay_ShJGzbjsFlUdJE.
--
-- Prevention
-- ──────────
-- We are adding a jest-level test that calls every booking RPC in
-- a rollback transaction on CI. That test would have caught this
-- the moment the original RPC migration was written. Tracked
-- separately in the same PR cluster.

CREATE OR REPLACE FUNCTION public.book_live_session_seat(
  p_session_id uuid,
  p_student_id uuid,
  p_booking_type text,
  p_lecture_ids uuid[],
  p_amount_paid_paise integer,
  p_price_type text,
  p_razorpay_order_id text,
  p_razorpay_payment_id text
)
RETURNS TABLE(booking_id uuid, seats_booked integer, total_seats integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_seats_booked integer;
  v_total_seats  integer;
  v_status       text;
  v_booking_id   uuid;
BEGIN
  -- Lock the session row so no other booking thread can overbook
  SELECT ls.seats_booked, ls.total_seats, ls.status
    INTO v_seats_booked, v_total_seats, v_status
    FROM public.live_sessions ls
   WHERE ls.id = p_session_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'session_not_found' USING ERRCODE = 'P0002';
  END IF;

  IF v_status <> 'published' THEN
    RAISE EXCEPTION 'session_not_bookable' USING ERRCODE = 'P0001';
  END IF;

  IF v_seats_booked >= v_total_seats THEN
    RAISE EXCEPTION 'sold_out' USING ERRCODE = 'P0001';
  END IF;

  -- Prevent duplicate booking by same student (UNIQUE index also enforces
  -- this, but surfacing a clean error before the constraint violation
  -- gives the client a typed failure to route on).
  IF EXISTS (
    SELECT 1 FROM public.live_bookings lb
     WHERE lb.session_id = p_session_id
       AND lb.student_id = p_student_id
  ) THEN
    RAISE EXCEPTION 'already_booked' USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.live_bookings (
    session_id, student_id, booking_type, lecture_ids,
    amount_paid_paise, price_type,
    razorpay_order_id, razorpay_payment_id,
    paid_at, payment_status
  ) VALUES (
    p_session_id, p_student_id, p_booking_type, p_lecture_ids,
    p_amount_paid_paise, p_price_type,
    p_razorpay_order_id, p_razorpay_payment_id,
    now(), 'paid'
  )
  RETURNING id INTO v_booking_id;

  -- HOTFIX: alias the UPDATE target and qualify the column reference so
  -- Postgres can distinguish `ls.seats_booked` (column) from the
  -- function's RETURNS TABLE variable of the same name.
  UPDATE public.live_sessions AS ls
     SET seats_booked = ls.seats_booked + 1,
         updated_at   = now()
   WHERE ls.id = p_session_id;

  -- Return the new state
  booking_id   := v_booking_id;
  seats_booked := v_seats_booked + 1;
  total_seats  := v_total_seats;
  RETURN NEXT;
END;
$function$;

COMMENT ON FUNCTION public.book_live_session_seat IS
  'Atomic live-session booking. Fixed April 2026 to resolve 42702 ambiguous column in the seats_booked UPDATE — the original version aborted every real booking once gateway auth was unblocked.';
