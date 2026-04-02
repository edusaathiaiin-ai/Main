-- ═══════════════════════════════════════════════════════
-- WhatsApp Saathi — profiles columns + sessions table
-- ═══════════════════════════════════════════════════════

-- Add WhatsApp fields to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS wa_phone
  TEXT NULL UNIQUE,
ADD COLUMN IF NOT EXISTS wa_saathi_id
  UUID NULL
  REFERENCES verticals(id),
ADD COLUMN IF NOT EXISTS wa_registered_at
  TIMESTAMPTZ NULL,
ADD COLUMN IF NOT EXISTS wa_state
  TEXT DEFAULT 'new';
  -- new | selecting_saathi | active

-- WhatsApp conversation sessions
-- Stores last 10 messages for context
CREATE TABLE IF NOT EXISTS whatsapp_sessions (
  id UUID PRIMARY KEY
    DEFAULT gen_random_uuid(),
  wa_phone TEXT NOT NULL UNIQUE,
  user_id UUID NULL
    REFERENCES profiles(id),
  messages JSONB DEFAULT '[]',
  -- array of {role, content}
  last_message_at TIMESTAMPTZ DEFAULT now(),
  message_count_today INTEGER DEFAULT 0,
  last_reset_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE whatsapp_sessions
  ENABLE ROW LEVEL SECURITY;

CREATE POLICY wa_sessions_service
ON whatsapp_sessions FOR ALL
TO service_role
USING (true) WITH CHECK (true);

-- Index for fast phone lookup
CREATE INDEX IF NOT EXISTS idx_wa_sessions_phone
ON whatsapp_sessions(wa_phone);

CREATE INDEX IF NOT EXISTS idx_profiles_wa_phone
ON profiles(wa_phone);
