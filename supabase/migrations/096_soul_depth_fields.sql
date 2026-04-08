-- Migration 096: Add session depth, sophistication, and passion peak to student_soul

ALTER TABLE student_soul
  ADD COLUMN IF NOT EXISTS session_depth_avg            INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS question_sophistication_score INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS passion_peak_topic           TEXT    DEFAULT NULL;

COMMENT ON COLUMN student_soul.session_depth_avg IS
  'Rolling average of session depth score (0–100). Proxy for message length × back-and-forth count.';
COMMENT ON COLUMN student_soul.question_sophistication_score IS
  'Rolling average sophistication score (0–100). Higher = more analytical questions (why, compare, evaluate, etc.).';
COMMENT ON COLUMN student_soul.passion_peak_topic IS
  'Most discussed topic in the most recent session — the sharpest signal of current curiosity.';
