-- Add personality_id to chat_sessions for consistent voice within a session
ALTER TABLE chat_sessions
ADD COLUMN IF NOT EXISTS personality_id TEXT;

COMMENT ON COLUMN chat_sessions.personality_id IS 'Historical personality ID for this session (e.g. ramanujan, darwin). Null = normal Saathi voice.';
