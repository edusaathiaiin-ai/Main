-- Migration 052: Fix profile creation for new Google OAuth users
--
-- Problem: When new users sign in via Google OAuth, the handle_new_user trigger
-- may fail silently (mutable search_path issue), leaving no profile row.
-- The auth/callback ensureProfile INSERT also fails if RLS blocks it.
--
-- This migration does 3 things:
-- 1. Recreates handle_new_user with fixed search_path and robust INSERT
-- 2. Ensures the trigger exists and fires on auth.users INSERT
-- 3. Adds an RLS INSERT policy so authenticated users can insert their own profile
--    (safety net in case trigger fires but RLS blocks client-side inserts)

-- ── Step 1: Recreate handle_new_user with fixed search_path ─────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    email,
    full_name,
    role,
    is_active,
    plan_id,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'),
    'student',
    FALSE,
    'free',
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING; -- safe for repeated runs
  RETURN NEW;
END;
$$;

-- ── Step 2: Ensure the trigger is attached ──────────────────────────────────
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ── Step 3: Allow authenticated users to insert their own profile row ────────
-- (Fallback for client-side ensureProfile in auth/callback)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'profiles_insert_own'
  ) THEN
    EXECUTE 'CREATE POLICY profiles_insert_own ON public.profiles
      FOR INSERT TO authenticated
      WITH CHECK (auth.uid() = id)';
  END IF;
END $$;

-- ── Step 4: Allow authenticated users to read their own profile ──────────────
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'profiles'
      AND policyname = 'profiles_select_own'
  ) THEN
    EXECUTE 'CREATE POLICY profiles_select_own ON public.profiles
      FOR SELECT TO authenticated
      USING (auth.uid() = id)';
  END IF;
END $$;

-- ── Step 5: Ensure RLS is enabled on profiles ───────────────────────────────
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
