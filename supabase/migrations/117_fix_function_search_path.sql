-- Fix mutable search_path on all custom functions
-- Supabase Security Advisor warning: "Function Search Path Mutable"
-- Setting search_path prevents schema injection attacks

ALTER FUNCTION public.award_saathi_points(uuid, text, integer, text, jsonb) SET search_path = public;
ALTER FUNCTION public.book_live_seat(uuid, uuid, text) SET search_path = public;
ALTER FUNCTION public.check_companionship(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.enforce_board_question_rate_limit() SET search_path = public;
ALTER FUNCTION public.generate_faculty_slug(text, text) SET search_path = public;
ALTER FUNCTION public.get_board_quota(text, text) SET search_path = public;
ALTER FUNCTION public.get_founding_count() SET search_path = public;
ALTER FUNCTION public.get_saathi_suggestions(uuid) SET search_path = public;
ALTER FUNCTION public.get_today_ist() SET search_path = public;
ALTER FUNCTION public.increment_faculty_earnings(uuid, integer) SET search_path = public;
ALTER FUNCTION public.increment_suspension_count(uuid) SET search_path = public;
ALTER FUNCTION public.is_admin() SET search_path = public;
ALTER FUNCTION public.is_faculty() SET search_path = public;
ALTER FUNCTION public.is_institution() SET search_path = public;
ALTER FUNCTION public.mark_companionship_card_shown(uuid, uuid, text) SET search_path = public;
ALTER FUNCTION public.prevent_money_field_update() SET search_path = public;
ALTER FUNCTION public.release_faculty_payout(uuid, text) SET search_path = public;
ALTER FUNCTION public.set_saathi_horizons_updated_at() SET search_path = public;
ALTER FUNCTION public.unlock_saathi(uuid, uuid, integer) SET search_path = public;
ALTER FUNCTION public.update_internship_posting_count() SET search_path = public;
