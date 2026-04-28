// ─── Core user types ──────────────────────────────────────────────────────────

export type UserRole = 'student' | 'faculty' | 'public' | 'institution'

export type Profile = {
  id: string
  role: UserRole | null
  email: string
  device_id: string | null
  registration_ip: string | null
  country_code: string | null
  is_geo_limited: boolean
  registered_at: string
  needs_review: boolean
  review_reason: string | null
  full_name: string | null
  city: string | null
  institution_name: string | null
  // Education Institution membership (migrations 136 + 139 rename)
  // Distinct from the older "Institution" user role (institution_profiles).
  education_institution_id?:                string | null
  education_institution_role?:              'principal' | 'faculty' | 'student' | null
  education_institution_joined_at?:         string | null
  education_institution_drop_requested_at?: string | null
  // Classroom pre-flight + welcome card (migration 146)
  classroom_onboarded?:                     boolean
  year_of_study: string | null
  exam_target: string | null
  exam_target_id: string | null
  exam_target_year: number | null
  exam_target_date: string | null
  primary_saathi_id: string | null
  is_active: boolean
  created_at: string
  // Subscription
  plan_id: string
  subscription_status: string
  subscription_expires_at: string | null
  razorpay_customer_id: string | null
  razorpay_subscription_id: string | null
  // Login tracking
  login_count: number
  // Subscription pause
  pause_until: string | null
  pause_count_this_year: number
  cancellation_reason: string | null
  // Soul profile columns (migration 054)
  academic_level: string | null
  degree_programme: string | null
  university_affiliation: string | null
  current_semester: string | null
  current_subjects: string[] | null
  interest_areas: string[] | null
  learning_style: string | null
  nudge_preference: string | null
  profile_completeness_pct: number
  previous_degree: string | null
  last_profile_updated_at: string | null
  // WhatsApp Saathi
  wa_phone: string | null
  wa_saathi_id: string | null
  wa_registered_at: string | null
  wa_state: string | null
  // Suspension
  suspension_status: string | null
  suspension_tier: number | null
  suspended_until: string | null
  suspension_reason: string | null
  suspension_count: number
  is_banned: boolean
}

// ─── Soul / AI context ────────────────────────────────────────────────────────

export type SoulProfile = {
  userId: string
  saathiId: string
  displayName: string
  ambitionLevel: string
  preferredTone: 'formal' | 'casual' | 'neutral'
  enrolledSubjects: string[]
  futureSubjects: string[]
  futureResearchArea: string
  topTopics: string[]
  struggleTopics: string[]
  lastSessionSummary: string | null
  sessionCount: number
}

// ─── Chat ─────────────────────────────────────────────────────────────────────

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  createdAt: string
}

// ─── Saathi / Bot ─────────────────────────────────────────────────────────────

export type Saathi = {
  id: string
  name: string
  emoji: string
  tagline: string
  primary: string
  accent: string
  bg: string
  has3D?: boolean
  theme?: string // 'legal' = KanoonSaathi courtroom theme
}

export type BotSlot = {
  slot: 1 | 2 | 3 | 4 | 5
  id: string
  name: string
  availableTo: string
  purpose: string
}

// ─── Quota ────────────────────────────────────────────────────────────────────

export type QuotaState = {
  limit: number
  used: number
  remaining: number
  coolingUntil: Date | null
  isCooling: boolean
}

// ─── News ─────────────────────────────────────────────────────────────────────

export type NewsItem = {
  id: string
  vertical_id: string
  title: string
  source: string
  url: string | null
  summary: string | null
  is_active: boolean
  fetched_at: string
}

// ─── Board ────────────────────────────────────────────────────────────────────

export type BoardQuestion = {
  id: string
  user_id: string
  vertical_id: string
  title: string
  body: string
  tags: string[]
  is_anonymous: boolean
  created_at: string
  answer_count?: number
  upvote_count?: number
}

export type BoardAnswer = {
  id: string
  question_id: string
  user_id: string
  body: string
  is_ai_generated: boolean
  is_faculty_verified: boolean
  created_at: string
  upvote_count?: number
}
