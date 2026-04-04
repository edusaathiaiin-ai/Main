-- 082_book_live_seat_atomic.sql
--
-- Atomic seat booking RPC.
-- Acquires a row-level lock (FOR UPDATE) on live_sessions before
-- incrementing seats_booked, preventing double-booking under concurrent requests.
--
-- Returns: 'ok' | 'session_not_found' | 'session_not_published' | 'seats_full' | 'already_booked'
-- All writes happen in a single transaction — either all succeed or none do.

CREATE OR REPLACE FUNCTION public.book_live_seat(
  p_session_id  UUID,
  p_student_id  UUID,
  p_order_id    TEXT DEFAULT NULL
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_session      live_sessions%ROWTYPE;
  v_already      INTEGER;
BEGIN
  -- Lock the session row to prevent concurrent over-booking
  SELECT * INTO v_session
    FROM live_sessions
   WHERE id = p_session_id
     FOR UPDATE;

  IF NOT FOUND THEN
    RETURN 'session_not_found';
  END IF;

  IF v_session.status <> 'published' THEN
    RETURN 'session_not_published';
  END IF;

  IF v_session.seats_booked >= v_session.total_seats THEN
    RETURN 'seats_full';
  END IF;

  -- Idempotency: check if student already has a booking for this session
  SELECT COUNT(*) INTO v_already
    FROM live_bookings
   WHERE session_id = p_session_id
     AND student_id = p_student_id
     AND payment_status <> 'refunded';

  IF v_already > 0 THEN
    RETURN 'already_booked';
  END IF;

  -- Insert the booking record
  INSERT INTO live_bookings (
    session_id,
    student_id,
    razorpay_order_id,
    payment_status,
    booked_at
  ) VALUES (
    p_session_id,
    p_student_id,
    p_order_id,
    CASE WHEN p_order_id IS NOT NULL THEN 'pending' ELSE 'free' END,
    now()
  );

  -- Increment the counter atomically (we hold the FOR UPDATE lock)
  UPDATE live_sessions
     SET seats_booked = seats_booked + 1,
         updated_at   = now()
   WHERE id = p_session_id;

  RETURN 'ok';
END;
$$;

-- Only authenticated users (students) and service_role may call this function
REVOKE ALL ON FUNCTION public.book_live_seat(UUID, UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.book_live_seat(UUID, UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.book_live_seat(UUID, UUID, TEXT) TO service_role;
