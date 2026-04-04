/**
 * db-enums.ts
 *
 * Single source of truth for every enum / check-constraint value used across
 * the EdUsaathiAI database. Import from here instead of using raw strings.
 *
 * If a DB constraint changes, update it here and TypeScript will surface every
 * call site that needs updating.
 *
 * Table → constraint source:
 *   board_questions   → 011_board_questions.sql
 *   moderation_flags  → 013_moderation_flags.sql + 070_fix_moderation_flags_schema.sql
 *   intern_interests  → 017_intern_interests.sql
 *   dpdp_requests     → 018_dpdp_requests.sql
 *   subscriptions     → 028_subscriptions.sql
 *   learning_intents  → 067_learning_intents.sql
 *   faculty_sessions  → 062_faculty_finder.sql (no CHECK, convention only)
 *   live_sessions     → 063_live_sessions.sql  (no CHECK, convention only)
 *   live_lectures     → 063_live_sessions.sql  (no CHECK, convention only)
 *   live_bookings     → 063_live_sessions.sql  (no CHECK, convention only)
 *   lecture_requests  → 066_lecture_requests.sql (no CHECK, convention only)
 */

// ── board_questions.status ───────────────────────────────────────────────────
// CHECK (status IN ('open', 'closed', 'archived'))
export const BOARD_STATUS = {
  OPEN: 'open',
  CLOSED: 'closed',
  ARCHIVED: 'archived',
} as const
export type BoardStatus = (typeof BOARD_STATUS)[keyof typeof BOARD_STATUS]

// ── moderation_flags.status ──────────────────────────────────────────────────
// CHECK (status IN ('open', 'in_review', 'resolved', 'rejected', 'auto_flagged'))
export const MODERATION_STATUS = {
  OPEN: 'open',
  IN_REVIEW: 'in_review',
  RESOLVED: 'resolved',
  REJECTED: 'rejected',
  AUTO_FLAGGED: 'auto_flagged', // set by suspensions edge function for violations
} as const
export type ModerationStatus =
  (typeof MODERATION_STATUS)[keyof typeof MODERATION_STATUS]

// ── moderation_flags.target_type ─────────────────────────────────────────────
// CHECK (target_type IS NULL OR target_type IN ('chat_message', 'board_question', 'board_answer', 'note'))
export const MODERATION_TARGET_TYPE = {
  CHAT_MESSAGE: 'chat_message',
  BOARD_QUESTION: 'board_question',
  BOARD_ANSWER: 'board_answer',
  NOTE: 'note',
} as const
export type ModerationTargetType =
  (typeof MODERATION_TARGET_TYPE)[keyof typeof MODERATION_TARGET_TYPE]

// ── intern_interests.status ──────────────────────────────────────────────────
// CHECK (status IN ('applied', 'shortlisted', 'rejected', 'selected', 'withdrawn'))
export const INTERN_STATUS = {
  APPLIED: 'applied',
  SHORTLISTED: 'shortlisted',
  REJECTED: 'rejected',
  SELECTED: 'selected',
  WITHDRAWN: 'withdrawn',
} as const
export type InternStatus = (typeof INTERN_STATUS)[keyof typeof INTERN_STATUS]

// ── dpdp_requests.status ─────────────────────────────────────────────────────
// CHECK (status IN ('pending', 'in_progress', 'completed', 'rejected'))
export const DPDP_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  REJECTED: 'rejected',
} as const
export type DpdpStatus = (typeof DPDP_STATUS)[keyof typeof DPDP_STATUS]

// ── dpdp_requests.request_type ───────────────────────────────────────────────
// CHECK (request_type IN ('export', 'delete', 'correction'))
export const DPDP_REQUEST_TYPE = {
  EXPORT: 'export',
  DELETE: 'delete',
  CORRECTION: 'correction',
} as const
export type DpdpRequestType =
  (typeof DPDP_REQUEST_TYPE)[keyof typeof DPDP_REQUEST_TYPE]

// ── subscriptions.status ─────────────────────────────────────────────────────
// CHECK (status IN ('created', 'paid', 'failed', 'cancelled', 'refunded'))
export const SUBSCRIPTION_STATUS = {
  CREATED: 'created',
  PAID: 'paid',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
  REFUNDED: 'refunded',
} as const
export type SubscriptionStatus =
  (typeof SUBSCRIPTION_STATUS)[keyof typeof SUBSCRIPTION_STATUS]

// ── learning_intents.status ──────────────────────────────────────────────────
// CHECK (status IN ('open','fulfilled','expired','removed'))
export const INTENT_STATUS = {
  OPEN: 'open',
  FULFILLED: 'fulfilled',
  EXPIRED: 'expired',
  REMOVED: 'removed',
} as const
export type IntentStatus = (typeof INTENT_STATUS)[keyof typeof INTENT_STATUS]

// ── learning_intents.depth_preference ───────────────────────────────────────
// CHECK (depth_preference IN ('beginner','intermediate','advanced'))
export const INTENT_DEPTH = {
  BEGINNER: 'beginner',
  INTERMEDIATE: 'intermediate',
  ADVANCED: 'advanced',
} as const
export type IntentDepth = (typeof INTENT_DEPTH)[keyof typeof INTENT_DEPTH]

// ── learning_intents.format_preference ──────────────────────────────────────
// CHECK (format_preference IN ('lecture','series','workshop','onetoone','any'))
export const INTENT_FORMAT = {
  LECTURE: 'lecture',
  SERIES: 'series',
  WORKSHOP: 'workshop',
  ONETOONE: 'onetoone',
  ANY: 'any',
} as const
export type IntentFormat = (typeof INTENT_FORMAT)[keyof typeof INTENT_FORMAT]

// ── learning_intents.urgency ─────────────────────────────────────────────────
// CHECK (urgency IN ('this_month','next_3_months','anytime'))
export const INTENT_URGENCY = {
  THIS_MONTH: 'this_month',
  NEXT_3_MONTHS: 'next_3_months',
  ANYTIME: 'anytime',
} as const
export type IntentUrgency = (typeof INTENT_URGENCY)[keyof typeof INTENT_URGENCY]

// ── faculty_sessions.status (no CHECK — convention only) ─────────────────────
export const SESSION_STATUS = {
  REQUESTED: 'requested',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
  COMPLETED: 'completed',
  REVIEWED: 'reviewed',
  CANCELLED: 'cancelled',
  DISPUTED: 'disputed',
} as const
export type SessionStatus = (typeof SESSION_STATUS)[keyof typeof SESSION_STATUS]

// ── faculty_sessions.payout_status (no CHECK — convention only) ──────────────
export const PAYOUT_STATUS = {
  PENDING: 'pending',
  RELEASING: 'releasing',
  RELEASED: 'released',
  FAILED: 'failed',
} as const
export type PayoutStatus = (typeof PAYOUT_STATUS)[keyof typeof PAYOUT_STATUS]

// ── live_sessions.status (no CHECK — convention only) ────────────────────────
export const LIVE_SESSION_STATUS = {
  DRAFT: 'draft',
  PENDING_REVIEW: 'pending_review',
  PUBLISHED: 'published',
  CANCELLED: 'cancelled',
  COMPLETED: 'completed',
} as const
export type LiveSessionStatus =
  (typeof LIVE_SESSION_STATUS)[keyof typeof LIVE_SESSION_STATUS]

// ── live_lectures.status (no CHECK — convention only) ────────────────────────
export const LIVE_LECTURE_STATUS = {
  SCHEDULED: 'scheduled',
  LIVE: 'live',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const
export type LiveLectureStatus =
  (typeof LIVE_LECTURE_STATUS)[keyof typeof LIVE_LECTURE_STATUS]

// ── live_bookings.payment_status (no CHECK — convention only) ────────────────
export const BOOKING_PAYMENT_STATUS = {
  PENDING: 'pending',
  PAID: 'paid',
  REFUNDED: 'refunded',
  FAILED: 'failed',
} as const
export type BookingPaymentStatus =
  (typeof BOOKING_PAYMENT_STATUS)[keyof typeof BOOKING_PAYMENT_STATUS]

// ── lecture_requests.status (no CHECK — convention only) ─────────────────────
export const LECTURE_REQUEST_STATUS = {
  PENDING: 'pending',
  ACKNOWLEDGED: 'acknowledged',
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
} as const
export type LectureRequestStatus =
  (typeof LECTURE_REQUEST_STATUS)[keyof typeof LECTURE_REQUEST_STATUS]

// ── research_projects.status ─────────────────────────────────────────────────
// CHECK (status IN ('open','filled','paused','closed'))  →  072_research_projects.sql
export const RESEARCH_PROJECT_STATUS = {
  OPEN: 'open',
  FILLED: 'filled',
  PAUSED: 'paused',
  CLOSED: 'closed',
} as const
export type ResearchProjectStatus =
  (typeof RESEARCH_PROJECT_STATUS)[keyof typeof RESEARCH_PROJECT_STATUS]

// ── research_applications.status ─────────────────────────────────────────────
// CHECK (status IN ('pending','shortlisted','accepted','rejected','withdrawn'))
export const RESEARCH_APPLICATION_STATUS = {
  PENDING: 'pending',
  SHORTLISTED: 'shortlisted',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  WITHDRAWN: 'withdrawn',
} as const
export type ResearchApplicationStatus =
  (typeof RESEARCH_APPLICATION_STATUS)[keyof typeof RESEARCH_APPLICATION_STATUS]
