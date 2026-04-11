-- ════════════════════════════════════════════
-- Fix account deletion blockers
-- Migration: fix_delete_account_fk_constraints
-- ════════════════════════════════════════════

-- 1. faculty_payouts — SET NULL (keep financial records)
ALTER TABLE faculty_payouts
  DROP CONSTRAINT IF EXISTS faculty_payouts_faculty_id_fkey;
ALTER TABLE faculty_payouts
  ADD CONSTRAINT faculty_payouts_faculty_id_fkey
  FOREIGN KEY (faculty_id) REFERENCES profiles(id)
  ON DELETE SET NULL;

-- 2. live_wishlist — CASCADE (safe to delete)
ALTER TABLE live_wishlist
  DROP CONSTRAINT IF EXISTS live_wishlist_student_id_fkey;
ALTER TABLE live_wishlist
  ADD CONSTRAINT live_wishlist_student_id_fkey
  FOREIGN KEY (student_id) REFERENCES profiles(id)
  ON DELETE CASCADE;

-- 3. session_messages — SET NULL (preserve session history)
ALTER TABLE session_messages
  DROP CONSTRAINT IF EXISTS session_messages_sender_id_fkey;
ALTER TABLE session_messages
  ADD CONSTRAINT session_messages_sender_id_fkey
  FOREIGN KEY (sender_id) REFERENCES profiles(id)
  ON DELETE SET NULL;
