/**
 * PostHog analytics wrapper — EdUsaathiAI
 *
 * Privacy rules (CLAUDE.md §25):
 * - Never send chat message content — only message_len
 * - Never send email, phone, or full_name
 * - distinctId = Supabase auth.users.id (UUID, not PII)
 * - Session replay OFF at launch
 * - Respect DPDP opt-out via posthog.optOutCapturing()
 */

import PostHog from 'posthog-react-native';

// Singleton — initialised once in PostHogProvider, accessed here via the
// module-level ref set by initAnalytics().
let _client: PostHog | null = null;

export function initAnalytics(client: PostHog) {
  _client = client;
}

function ph(): PostHog | null {
  return _client;
}

// ─── Identification ────────────────────────────────────────────────────────

/**
 * Call immediately after Supabase auth resolves.
 * PostHog merges the anonymous pre-login session automatically.
 */
export function identify(
  userId: string,
  properties: {
    plan_id: 'free' | 'trial' | 'plus-monthly' | 'plus-annual' | 'unlimited';
    role: 'student' | 'faculty' | 'public' | 'institution' | 'global_guest';
    primary_saathi_id: string;
    academic_level?: 'school' | 'bachelor' | 'masters' | 'phd';
    city?: string;
    is_global_guest?: boolean;
    signup_date?: string;
    flame_stage?: 'cold' | 'spark' | 'ember' | 'fire' | 'wings';
    session_count_total?: number;
  },
) {
  ph()?.identify(userId, properties);
}

/** Call on logout / session reset */
export function resetAnalytics() {
  ph()?.reset();
}

/** Opt out (DPDP) */
export function optOut() {
  ph()?.optOutCapturing();
}

/** Opt back in */
export function optIn() {
  ph()?.optInCapturing();
}

// ─── Client-side events (CLAUDE.md §25) ───────────────────────────────────

export function trackSignupStarted(method: 'google' | 'email' | 'wa') {
  ph()?.capture('signup_started', { method });
}

export function trackSignupCompleted(method: 'google' | 'email' | 'wa', duration_s: number) {
  ph()?.capture('signup_completed', { method, duration_s });
}

export function trackSaathiSelected(saathi_slug: string, is_primary: boolean) {
  ph()?.capture('saathi_selected', { saathi_slug, is_primary });
}

export function trackChatSent(saathi_slug: string, bot_slot: 1 | 2 | 3 | 4 | 5, message_len: number) {
  ph()?.capture('chat_sent', { saathi_slug, bot_slot, message_len });
}

export function trackPricingViewed(source: 'upgrade_modal' | 'sidebar' | 'direct') {
  ph()?.capture('pricing_viewed', { source });
}

export function trackUpgradeClicked(plan_id: string, source: string) {
  ph()?.capture('upgrade_clicked', { plan_id, source });
}

export function trackWaLinkClicked(source: 'login' | 'chat_tip' | 'post_payment') {
  ph()?.capture('wa_link_clicked', { source });
}

export function trackCheckinCompleted(saathi_slug: string, score: number, type: string) {
  ph()?.capture('checkin_completed', { saathi_slug, score, type });
}

export function trackBoardPosted(saathi_slug: string, type: 'question' | 'answer') {
  ph()?.capture('board_posted', { saathi_slug, type });
}

export function trackErrorReported(saathi_slug: string) {
  ph()?.capture('error_reported', { saathi_slug });
}
