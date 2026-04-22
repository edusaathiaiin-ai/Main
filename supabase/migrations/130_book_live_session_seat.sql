-- ═══════════════════════════════════════════════════════════════════════════════
-- 130 — Atomic seat-reservation RPC for live_sessions booking
--
-- Replaces the client-side read-modify-write pattern
--   (SELECT seats_booked; INSERT booking; UPDATE seats_booked+1)
-- which allows overbooking when two students click "Book" simultaneously.
--
-- Called by the verify-live-booking Edge Function AFTER Razorpay payment
-- verification succeeds. If all seats are taken the function raises
-- exception 'sold_out' and the Edge Function returns 409 so the student
-- can see "session just filled — book the next one".
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.book_live_session_seat(
  p_session_id        uuid,
  p_student_id        uuid,
  p_booking_type      text,
  p_lecture_ids       uuid[],
  p_amount_paid_paise integer,
  p_price_type        text,
  p_razorpay_order_id text,
  p_razorpay_payment_id text
) RETURNS TABLE (booking_id uuid, seats_booked integer, total_seats integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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

  -- Prevent duplicate booking by same student (also enforced by UNIQUE
  -- index, but surface a clean error before the constraint violation).
  IF EXISTS (
    SELECT 1 FROM public.live_bookings
    WHERE session_id = p_session_id AND student_id = p_student_id
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

  UPDATE public.live_sessions
     SET seats_booked = seats_booked + 1,
         updated_at = now()
   WHERE id = p_session_id;

  -- Return the new state
  booking_id   := v_booking_id;
  seats_booked := v_seats_booked + 1;
  total_seats  := v_total_seats;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION public.book_live_session_seat(
  uuid, uuid, text, uuid[], integer, text, text, text
) TO service_role;

-- Intentionally NOT granted to authenticated — this function must be called
-- only by the verify-live-booking Edge Function after HMAC verification of
-- the Razorpay webhook / checkout signature.
