-- 083_money_fields_immutable.sql
--
-- Prevents accidental (or malicious) direct UPDATE of financial fields
-- on faculty_sessions after the row is created.
--
-- The only way to update fee_paise, platform_fee_paise, or faculty_payout_paise
-- is via service_role (used by Edge Functions that verify Razorpay webhooks).
-- Direct client mutations through the anon/authenticated role are blocked.

CREATE OR REPLACE FUNCTION public.prevent_money_field_update()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Allow service_role to update anything (webhook processing, admin tools)
  IF current_setting('role') = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF NEW.fee_paise            IS DISTINCT FROM OLD.fee_paise OR
     NEW.platform_fee_paise   IS DISTINCT FROM OLD.platform_fee_paise OR
     NEW.faculty_payout_paise IS DISTINCT FROM OLD.faculty_payout_paise
  THEN
    RAISE EXCEPTION 'Direct update of money fields is not allowed (fee_paise, platform_fee_paise, faculty_payout_paise). Use the admin release flow.';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_money_field_update ON public.faculty_sessions;

CREATE TRIGGER trg_prevent_money_field_update
  BEFORE UPDATE ON public.faculty_sessions
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_money_field_update();
