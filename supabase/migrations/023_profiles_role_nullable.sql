/*
  Migration: 023_profiles_role_nullable
  Purpose: Allow role to be NULL during onboarding.
           New users get a stub profile at first sign-in; role is set at Step 3 onboarding.
*/

alter table public.profiles
  alter column role drop not null;

-- Keep the check constraint — PostgreSQL evaluates NULL IN (...) as UNKNOWN,
-- which passes the CHECK (only FALSE is rejected). So NULL role is permitted.
