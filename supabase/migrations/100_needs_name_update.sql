-- Add needs_name_update flag to profiles
-- Set true when auth-register detects full_name is null or fails validation.
-- Triggers /onboard?step=name gate in (app)/layout.tsx for returning users.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS needs_name_update boolean NOT NULL DEFAULT false;

-- Backfill: any active profile with a null full_name needs a name update
UPDATE profiles SET needs_name_update = true WHERE full_name IS NULL AND is_active = true;
