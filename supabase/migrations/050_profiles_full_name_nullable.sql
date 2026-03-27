/*
  Migration: 050_profiles_full_name_nullable
  Purpose: Allow full_name to be NULL during initial signup.
           Email OTP users have no name metadata at auth time.
           Google OAuth users supply it from Google metadata.
           Onboarding (Step 6) fills full_name for all roles.
*/

alter table public.profiles
  alter column full_name drop not null;
