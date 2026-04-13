/**
 * PostHog analytics wrapper — EdUsaathiAI (Next.js)
 *
 * Privacy rules (CLAUDE.md §25):
 * - Never send chat message content — only message_len
 * - Never send email, phone, or full_name
 * - distinctId = Supabase auth.users.id (UUID, not PII)
 * - Session replay OFF at launch
 * - Respect DPDP opt-out via posthog.opt_out_capturing()
 *
 * All calls are no-ops if PostHog is not initialised (pre-hydration, SSR,
 * missing env var, or ad-blocker). Callers never need to null-check.
 */

import posthog from 'posthog-js'

// ─── Identification ──────────────────────────────────────────────────────────

type PlanId = 'free' | 'trial' | 'plus-monthly' | 'plus-annual' | 'unlimited'
type Role = 'student' | 'faculty' | 'public' | 'institution' | 'global_guest'
type FlameStage = 'cold' | 'spark' | 'ember' | 'fire' | 'wings'

export interface UserIdentity {
  plan_id: PlanId
  role: Role
  primary_saathi_id: string
  academic_level?: 'school' | 'bachelor' | 'masters' | 'phd'
  city?: string
  is_global_guest?: boolean
  signup_date?: string
  flame_stage?: FlameStage
  session_count_total?: number
}

/**
 * Call immediately after Supabase auth resolves.
 * PostHog merges the anonymous pre-login session automatically.
 */
export function identify(userId: string, properties: UserIdentity) {
  if (typeof window === 'undefined') return
  posthog.identify(userId, properties)
}

/** Call on logout / session reset */
export function resetAnalytics() {
  if (typeof window === 'undefined') return
  posthog.reset()
}

/** Opt out (DPDP) */
export function optOut() {
  if (typeof window === 'undefined') return
  posthog.opt_out_capturing()
}

/** Opt back in */
export function optIn() {
  if (typeof window === 'undefined') return
  posthog.opt_in_capturing()
}

// ─── Client-side events (CLAUDE.md §25) ──────────────────────────────────────

function capture(event: string, props?: Record<string, unknown>) {
  if (typeof window === 'undefined') return
  posthog.capture(event, props)
}

export function trackSignupStarted(method: 'google' | 'email' | 'wa') {
  capture('signup_started', { method })
}

export function trackSignupCompleted(method: 'google' | 'email' | 'wa', duration_s: number) {
  capture('signup_completed', { method, duration_s })
}

export function trackSaathiSelected(saathi_slug: string, is_primary: boolean) {
  capture('saathi_selected', { saathi_slug, is_primary })
}

export function trackChatSent(
  saathi_slug: string,
  bot_slot: 1 | 2 | 3 | 4 | 5,
  message_len: number,
) {
  capture('chat_sent', { saathi_slug, bot_slot, message_len })
}

export function trackPricingViewed(source: 'upgrade_modal' | 'sidebar' | 'direct') {
  capture('pricing_viewed', { source })
}

export function trackUpgradeClicked(plan_id: string, source: string) {
  capture('upgrade_clicked', { plan_id, source })
}

export function trackWaLinkClicked(source: 'login' | 'chat_tip' | 'post_payment') {
  capture('wa_link_clicked', { source })
}

export function trackCheckinCompleted(
  saathi_slug: string,
  opts?: { checkin_score?: number; flame_stage?: string },
) {
  capture('checkin_completed', {
    saathi_slug,
    ...(typeof opts?.checkin_score === 'number' ? { checkin_score: opts.checkin_score } : {}),
    ...(opts?.flame_stage ? { flame_stage: opts.flame_stage } : {}),
  })
}

export function trackBoardPosted(saathi_slug: string, type: 'question' | 'answer') {
  capture('board_posted', { saathi_slug, type })
}

export function trackErrorReported(saathi_slug: string) {
  capture('error_reported', { saathi_slug })
}
