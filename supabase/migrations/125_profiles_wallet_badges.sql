-- Add wallet and badges to profiles for nomination rewards
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS wallet_balance_paise INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS badges TEXT[] DEFAULT '{}';
