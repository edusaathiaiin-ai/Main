-- Add delivery tracking columns to faculty_nominations
-- email_sent_at and whatsapp_sent_at already exist from initial migration

ALTER TABLE faculty_nominations
ADD COLUMN IF NOT EXISTS email_delivered BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS email_error TEXT,
ADD COLUMN IF NOT EXISTS whatsapp_delivered BOOLEAN DEFAULT NULL,
ADD COLUMN IF NOT EXISTS whatsapp_error TEXT;
