-- Migration 097: Soul horizon signal fields
-- Tracks when a student's curiosity starts exceeding their declared subject —
-- the signal that they are becoming more than they think they are.

ALTER TABLE student_soul
  ADD COLUMN IF NOT EXISTS emerging_interests   TEXT[],
  ADD COLUMN IF NOT EXISTS boundary_crossed_at  TIMESTAMPTZ[],
  ADD COLUMN IF NOT EXISTS possibility_signals  JSONB;

COMMENT ON COLUMN student_soul.emerging_interests IS
  'Topics the student keeps asking about that are adjacent to or outside their declared subject.
   Detected from question patterns across sessions. Examples: a BioSaathi student repeatedly
   asking about bioinformatics, a KanoonSaathi student asking about legal tech startups.
   Updated by soul-update Edge Function.';

COMMENT ON COLUMN student_soul.boundary_crossed_at IS
  'Timestamps of sessions where the student asked something clearly outside their comfort zone
   or declared subject boundary — the moments they reached further than expected.
   Array so the full history of boundary-crossing is preserved.';

COMMENT ON COLUMN student_soul.possibility_signals IS
  'Structured record of horizon-expanding moments per session.
   Schema: [{ session_ts: timestamptz, saathi_id: uuid, signal: string, topic: string }]
   Example: AccountSaathi student asking about blockchain → signal stored here so the
   soul-update function and system prompt builder can reference it in future sessions.
   The Saathi can say: "Last time you asked about blockchain — you should know that..."';
