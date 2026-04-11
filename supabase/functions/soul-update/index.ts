/**
 * supabase/functions/soul-update/index.ts
 *
 * Soul Update v2 — Complete rewrite.
 * Fixes all 11 fields that were never being written.
 *
 * Fields now written (was 7, now 18):
 *   display_name, preferred_tone, top_topics, struggle_topics,
 *   last_session_summary, session_count, flame_stage,
 *   session_depth_avg, question_sophistication_score,
 *   passion_peak_topic,
 *   ── NEW ──
 *   passion_intensity, career_discovery_stage, predicted_trajectory,
 *   career_interest, depth_calibration, shell_broken, shell_broken_at,
 *   prior_knowledge_base, emerging_interests, peer_mode, exam_mode
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { isUUID } from '../_shared/validate.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { checkRateLimit } from '../_shared/rateLimit.ts'

const SUPABASE_URL          = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_ANON_KEY     = Deno.env.get('SUPABASE_ANON_KEY') ?? ''
const SUPABASE_SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
const GROQ_API_KEY          = Deno.env.get('GROQ_API_KEY') ?? ''

const MAX_MESSAGES  = 40
const MAX_TOPICS    = 20
const MAX_STRUGGLES = 10

// ─── Types ────────────────────────────────────────────────────────────────────

type MessageRole = 'user' | 'assistant' | 'system'
type ChatMessage = { role: MessageRole; content: string }
type PreferredTone = 'formal' | 'casual' | 'neutral'
type FlameStage = 'cold' | 'spark' | 'ember' | 'fire' | 'wings'

type CareerStage =
  | 'unaware'    // never mentioned career
  | 'curious'    // asked about career paths once
  | 'exploring'  // asking regularly
  | 'committed'  // named specific goal

type Trajectory =
  | 'research'        // "why" > "what", asks about papers
  | 'professional'    // exams, certifications, jobs
  | 'entrepreneurial' // startups, problems, market
  | 'academic'        // teaching, academia, PhD
  | 'undecided'

// ─── Name guard — block numeric/mash values from being written back ──────────

function isValidDisplayName(name: string | null | undefined): boolean {
  if (!name) return false
  const t = name.trim()
  if (t.length < 2 || t.length > 40) return false
  if (/^\d+$/.test(t)) return false                      // pure numbers
  if (!/[a-zA-Z\u0900-\u097F]/.test(t)) return false    // must have at least one letter
  const blocked = ['test','user','admin','guest','demo','na','none','null','undefined','anon','anonymous','temp']
  if (blocked.includes(t.toLowerCase())) return false
  return true
}

// ─── Flame stage — now quality-gated, not just session count ─────────────────

function computeFlameStage(
  sessionCount:  number,
  depthAvg:      number,
  passionScore:  number,
  shellBroken:   boolean,
): FlameStage {
  if (sessionCount >= 30 && passionScore >= 70 && shellBroken) return 'wings'
  if (sessionCount >= 15 && depthAvg >= 50 && passionScore >= 50) return 'fire'
  if (sessionCount >= 8  && depthAvg >= 35)                        return 'ember'
  if (sessionCount >= 3  && depthAvg >= 20)                        return 'spark'
  return 'cold'
}

// ─── Tone detection (unchanged — working correctly) ──────────────────────────

function detectTone(messages: ChatMessage[], existing: PreferredTone): PreferredTone {
  const text = messages.filter(m => m.role === 'user').map(m => m.content).join(' ')
  if (text.length < 20) return existing

  const formal  = [/\b(therefore|hence|thus|regarding|furthermore|moreover)\b/i, /\b(please|kindly|could you)\b/i]
  const casual  = [/\b(yeah|yep|gonna|wanna|kinda|dunno|btw|omg|lol)\b/i, /!{2,}/]

  const fs = formal.filter(rx => rx.test(text)).length
  const cs = casual.filter(rx => rx.test(text)).length
  if (fs > cs && fs >= 2) return 'formal'
  if (cs > fs && cs >= 2) return 'casual'
  return existing
}

// ─── Struggle detection (unchanged — working correctly) ──────────────────────

function detectStruggles(messages: ChatMessage[]): string[] {
  const rx = /\b(don'?t understand|confused about|struggling with|not clear|lost on|can'?t grasp|having trouble with)\b/i
  const cap = /(?:don'?t understand|confused about|struggling with|not clear about|lost on|can'?t grasp|having trouble with)\s+([^.!?\n]{3,40})/i
  const topics: string[] = []
  for (const m of messages) {
    if (m.role !== 'user' || !rx.test(m.content)) continue
    const match = m.content.match(cap)
    if (match?.[1]) topics.push(match[1].trim())
  }
  return [...new Set(topics)]
}

// ─── Depth score ──────────────────────────────────────────────────────────────

function computeDepthScore(messages: ChatMessage[]): number {
  const userMsgs = messages.filter(m => m.role === 'user')
  if (userMsgs.length === 0) return 0

  const avgLen = userMsgs.reduce((s, m) => s + m.content.length, 0) / userMsgs.length
  const engagement = Math.min(userMsgs.length, 10) * 5   // max 50
  const depth = Math.min(avgLen / 200, 1) * 50            // max 50
  return Math.min(100, Math.round(depth + engagement))
}

// ─── Question sophistication ──────────────────────────────────────────────────

function computeSophistication(messages: ChatMessage[]): number {
  const userMsgs = messages.filter(m => m.role === 'user')
  const markers = [
    /\b(why|how|explain|compare|difference|relationship|cause|effect|analyse|evaluate)\b/i,
    /\?.*\?/,                                                    // multiple questions
    /\b(however|although|whereas|despite|contrary|rather than)\b/i,  // connectives
    /\b(what if|suppose|imagine|assume|consider)\b/i,            // hypotheticals
    /\b(doesn't this mean|but then|this contradicts)\b/i,        // challenging Saathi
  ]
  const score = userMsgs.reduce((s, m) =>
    s + markers.filter(rx => rx.test(m.content)).length * 15, 0
  )
  return Math.min(100, score)
}

// ─── Passion intensity ────────────────────────────────────────────────────────
// Measures genuine intellectual engagement, not just activity

function computePassionIntensity(
  messages:       ChatMessage[],
  sessionDepth:   number,
  sophistication: number,
  existing:       number,
): number {
  const userMsgs = messages.filter(m => m.role === 'user')

  let score = 0

  // Base: depth and sophistication
  score += sessionDepth * 0.4         // max 40
  score += sophistication * 0.3       // max 30

  // Signals of genuine curiosity
  const goingDeeper = userMsgs.filter(m =>
    /\b(tell me more|go deeper|what else|another example|why exactly|how exactly)\b/i.test(m.content)
  ).length
  score += Math.min(goingDeeper * 8, 16)   // max 16

  // Connecting to real life
  const realWorld = userMsgs.filter(m =>
    /\b(in real life|in practice|actually|does this mean|so basically|I've seen|I noticed)\b/i.test(m.content)
  ).length
  score += Math.min(realWorld * 5, 10)     // max 10

  // Challenge — student pushes back
  const challenge = userMsgs.filter(m =>
    /\b(but|however|I thought|isn't it|doesn't that|what about|that doesn't)\b/i.test(m.content)
  ).length
  score += Math.min(challenge * 4, 12)     // max 12

  const newScore = Math.min(100, Math.round(score))

  // Passion never drops more than 5 per session (momentum preservation)
  if (existing > 0) {
    return Math.max(newScore, existing - 5)
  }
  return newScore
}

// ─── Peer mode / exam mode detection ─────────────────────────────────────────

function detectModes(messages: ChatMessage[]): { peer: boolean; exam: boolean } {
  const text = messages.filter(m => m.role === 'user').map(m => m.content).join(' ')
  const peer = /\b(explain like|simple terms|I'm new to|basics|beginner)\b/i.test(text)
  const exam = /\b(exam|test|MCQ|question bank|previous year|past paper|mock|revision|marks)\b/i.test(text)
  return { peer, exam }
}

// ─── Shell broken detection ───────────────────────────────────────────────────
// Student went meaningfully beyond their enrolled curriculum

function detectShellBroken(
  messages:         ChatMessage[],
  enrolledSubjects: string[],
  existing:         boolean,
): boolean {
  if (existing) return true  // once broken, stays broken
  if (enrolledSubjects.length === 0) return false

  const text = messages.filter(m => m.role === 'user').map(m => m.content).join(' ')

  // Signals of going beyond
  const beyondSignals = [
    /\b(research|paper|journal|publication|PhD|Masters|further study)\b/i,
    /\b(what if|imagine if|could we|what would happen if)\b/i,
    /\b(career|job|industry|real world application|startup|company)\b/i,
    /\b(connection|relationship between|similar to|reminds me of)\b/i,
  ]

  const signals = beyondSignals.filter(rx => rx.test(text)).length
  return signals >= 2
}

// ─── The main AI call — extracts all semantic fields in one pass ──────────────

type AIExtraction = {
  passion_peak_topic:      string | null
  career_interest:         string | null
  career_discovery_stage:  CareerStage
  predicted_trajectory:    Trajectory
  emerging_interests:      string[]
  prior_knowledge_base:    string[]
  depth_calibration:       number
}

async function extractSemanticFields(
  messages:    ChatMessage[],
  displayName: string,
  existingDepthCalibration: number,
): Promise<AIExtraction | null> {
  if (!GROQ_API_KEY) return null

  const transcript = messages
    .filter(m => m.role !== 'system')
    .slice(-20)
    .map(m => `${m.role === 'user' ? displayName : 'Saathi'}: ${m.content}`)
    .join('\n')

  if (transcript.trim().length < 50) return null

  const prompt = `Analyse this study session transcript and extract information about the student.

TRANSCRIPT:
${transcript}

Return ONLY this exact JSON (no markdown, no backticks, no extra text):
{
  "passion_peak_topic": "The specific ACADEMIC SUBJECT AREA the student showed most curiosity about (e.g. 'DNA replication', 'Constitutional law', 'Quantum mechanics'). Must be a genuine academic topic — NOT a single generic word like 'Pass', 'Notes', 'What', 'Yes', 'Okay'. Return null if no clear topic emerged.",

  "career_interest": "The specific career or profession the student mentioned wanting to pursue (e.g. 'criminal lawyer', 'research scientist', 'data analyst'). Return null if never mentioned.",

  "career_discovery_stage": "One of: 'unaware' (never mentioned career), 'curious' (asked about career options once), 'exploring' (asked multiple times), 'committed' (named a specific goal).",

  "predicted_trajectory": "One of: 'research' (asks why, interested in papers and deeper understanding), 'professional' (focused on exams, certifications, job skills), 'entrepreneurial' (interested in startups, real-world problems, building things), 'academic' (interested in teaching, PhD, academia), 'undecided' (no clear signal).",

  "emerging_interests": ["List of NEW topics the student showed curiosity about that are BEYOND their main subject. E.g. if a law student asked about psychology, include 'Psychology'. Max 5 items. Empty array if none."],

  "prior_knowledge_base": ["List of topics the student demonstrated EXISTING knowledge about — things they explained correctly or used as analogies. Max 5 items. Empty array if none."],

  "depth_calibration": A number 0-100 representing this student's intellectual level based on the conversation. 0-25=complete beginner, 26-50=undergraduate early, 51-70=undergraduate advanced, 71-85=postgraduate level, 86-100=research/expert level. Current calibration: ${existingDepthCalibration}. Adjust by max 10 points per session — do not swing wildly.
}`

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model:       'llama-3.3-70b-versatile',
        messages:    [{ role: 'user', content: prompt }],
        max_tokens:  600,
        temperature: 0.2,
      }),
    })

    if (!res.ok) return null
    const json = await res.json()
    const text = (json.choices?.[0]?.message?.content ?? '').replace(/```json|```/g, '').trim()
    return JSON.parse(text) as AIExtraction
  } catch {
    return null
  }
}

// ─── Session summary (unchanged — working correctly) ─────────────────────────

async function generateSummary(messages: ChatMessage[], displayName: string): Promise<string> {
  if (!GROQ_API_KEY) return ''

  const transcript = messages
    .filter(m => m.role !== 'system')
    .slice(-20)
    .map(m => `${m.role === 'user' ? displayName : 'Saathi'}: ${m.content}`)
    .join('\n')

  if (transcript.trim().length === 0) return ''

  const prompt = `Summarise this tutoring session in exactly 3 sentences:
1. The main topic(s) covered
2. One key concept the student engaged with
3. One area to revisit next session

Be warm and personal. Use the student's name: ${displayName}.
No bullet points. Return only the 3 sentences.

TRANSCRIPT:
${transcript}`

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${GROQ_API_KEY}` },
      body: JSON.stringify({
        model:       'llama-3.3-70b-versatile',
        messages:    [{ role: 'user', content: prompt }],
        max_tokens:  200,
        temperature: 0.4,
      }),
    })
    if (!res.ok) return ''
    const json = await res.json()
    return json.choices?.[0]?.message?.content?.trim() ?? ''
  } catch {
    return ''
  }
}

// ─── Main handler ─────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  const CORS = corsHeaders(req)
  if (req.method === 'OPTIONS') return new Response(null, { headers: CORS })
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405, headers: { ...CORS, 'Content-Type': 'application/json' },
    })
  }

  try {
    // ── Auth ────────────────────────────────────────────────────────────────
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    })
    const { data: { user }, error: authError } = await userClient.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // ── Rate limit ────────────────────────────────────────────────────────────
    const allowed = await checkRateLimit('soul-update', user.id, 30, 60)
    if (!allowed) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), {
        status: 429, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // ── Parse body ────────────────────────────────────────────────────────────
    const body = await req.json()
    const { saathiId, sessionMessages } = body as {
      saathiId?: string
      sessionMessages?: ChatMessage[]
    }

    if (!saathiId || !Array.isArray(sessionMessages) || sessionMessages.length === 0) {
      return new Response(JSON.stringify({ error: 'Missing saathiId or sessionMessages' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }
    if (!isUUID(saathiId)) {
      return new Response(JSON.stringify({ error: 'saathiId must be a UUID' }), {
        status: 400, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    // ── Sanitise messages ─────────────────────────────────────────────────────
    const messages = sessionMessages
      .filter((m): m is ChatMessage =>
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        m.content.length > 0
      )
      .slice(-MAX_MESSAGES)
      .map(m => ({ role: m.role, content: m.content.slice(0, 2000) }))

    if (messages.length === 0) {
      return new Response(JSON.stringify({ ok: true, message: 'No valid messages' }), {
        status: 200, headers: { ...CORS, 'Content-Type': 'application/json' },
      })
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    // ── Fetch current soul ────────────────────────────────────────────────────
    const { data: soul } = await admin
      .from('student_soul')
      .select('*')
      .eq('user_id',    user.id)
      .eq('vertical_id', saathiId)
      .maybeSingle()

    const rawDisplayName      = soul?.display_name
    const displayName         = isValidDisplayName(rawDisplayName) ? rawDisplayName! : 'Student'
    const existingTone        = soul?.preferred_tone       ?? 'neutral'
    const existingTopics      = soul?.top_topics           ?? []
    const existingStruggles   = soul?.struggle_topics      ?? []
    const existingCount       = soul?.session_count        ?? 0
    const existingDepthCal    = soul?.depth_calibration    ?? 40
    const existingPassion     = soul?.passion_intensity    ?? 0
    const existingShellBroken = soul?.shell_broken         ?? false
    const existingFlame       = soul?.flame_stage          ?? 'cold'
    const enrolledSubjects    = soul?.enrolled_subjects    ?? []

    // ── Run all calculations in parallel ─────────────────────────────────────
    const [summary, aiFields] = await Promise.all([
      generateSummary(messages, displayName),
      extractSemanticFields(messages, displayName, existingDepthCal),
    ])

    // ── Compute all scores ────────────────────────────────────────────────────
    const sessionDepth    = computeDepthScore(messages)
    const sophistication  = computeSophistication(messages)
    const passionIntensity = computePassionIntensity(
      messages, sessionDepth, sophistication, existingPassion
    )
    const newTone         = detectTone(messages, existingTone as PreferredTone)
    const struggles       = detectStruggles(messages)
    const modes           = detectModes(messages)
    const shellBroken     = detectShellBroken(messages, enrolledSubjects, existingShellBroken)
    const newFlame        = computeFlameStage(
      existingCount + 1, sessionDepth, passionIntensity, shellBroken
    )
    const flameChanged    = newFlame !== existingFlame

    // Merge topics (still use regex for merging — AI gives us passion_peak_topic)
    const regexTopics = (messages
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join(' ')
      .match(/\b[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})*\b/g) ?? [])
      .slice(0, 10)

    const mergedTopics    = [...new Set([...existingTopics, ...regexTopics])].slice(0, MAX_TOPICS)
    const mergedStruggles = [...new Set([...existingStruggles, ...struggles])].slice(0, MAX_STRUGGLES)

    // ── Build upsert payload — ALL 18 fields ──────────────────────────────────
    const payload: Record<string, unknown> = {
      user_id:    user.id,
      vertical_id: saathiId,

      // Always-updated fields
      display_name:                  displayName,
      preferred_tone:                newTone,
      top_topics:                    mergedTopics,
      struggle_topics:               mergedStruggles,
      last_session_summary:          summary || soul?.last_session_summary || null,
      session_count:                 existingCount + 1,
      last_session_date:             new Date().toISOString(),

      // Computed scores
      session_depth_avg:             sessionDepth,
      question_sophistication_score: sophistication,
      passion_intensity:             passionIntensity,
      flame_stage:                   newFlame,
      peer_mode:                     modes.peer,
      exam_mode:                     modes.exam,

      // Shell broken — once true, stays true
      shell_broken:                  shellBroken,
      ...(shellBroken && !existingShellBroken
        ? { shell_broken_at: new Date().toISOString() }
        : {}),
    }

    // AI-extracted fields — only update if AI returned valid data
    if (aiFields) {
      // passion_peak_topic — only if it's a real academic topic
      if (
        aiFields.passion_peak_topic &&
        aiFields.passion_peak_topic.length > 3 &&
        !['pass', 'notes', 'what', 'yes', 'no', 'okay', 'ok'].includes(
          aiFields.passion_peak_topic.toLowerCase()
        )
      ) {
        payload.passion_peak_topic = aiFields.passion_peak_topic
      }

      // career_interest
      if (aiFields.career_interest) {
        payload.career_interest = aiFields.career_interest
      }

      // career_discovery_stage — only advance, never go back
      const stageOrder: CareerStage[] = ['unaware', 'curious', 'exploring', 'committed']
      const existingStageIdx = stageOrder.indexOf(
        (soul?.career_discovery_stage as CareerStage) ?? 'unaware'
      )
      const newStageIdx = stageOrder.indexOf(aiFields.career_discovery_stage)
      if (newStageIdx > existingStageIdx) {
        payload.career_discovery_stage = aiFields.career_discovery_stage
      }

      // predicted_trajectory — only update if not undecided
      if (aiFields.predicted_trajectory !== 'undecided') {
        payload.predicted_trajectory = aiFields.predicted_trajectory
      }

      // depth_calibration — gradual adjustment, max ±10 per session
      const rawCal = aiFields.depth_calibration
      const clampedCal = Math.max(
        existingDepthCal - 10,
        Math.min(existingDepthCal + 10, rawCal)
      )
      payload.depth_calibration = clampedCal

      // emerging_interests — merge with existing
      if (aiFields.emerging_interests?.length > 0) {
        const existing = soul?.emerging_interests ?? []
        payload.emerging_interests = [
          ...new Set([...existing, ...aiFields.emerging_interests])
        ].slice(0, 10)
      }

      // prior_knowledge_base — merge with existing
      if (aiFields.prior_knowledge_base?.length > 0) {
        const existing = soul?.prior_knowledge_base ?? []
        payload.prior_knowledge_base = [
          ...new Set([...existing, ...aiFields.prior_knowledge_base])
        ].slice(0, 15)
      }
    }

    // ── Upsert to student_soul ────────────────────────────────────────────────
    const { error: upsertError } = await admin
      .from('student_soul')
      .upsert(payload, { onConflict: 'user_id,vertical_id' })

    if (upsertError) throw new Error(`soul upsert: ${upsertError.message}`)

    // ── Award points on flame stage advancement (fire-and-forget) ────────────
    if (flameChanged) {
      const { data: profile } = await admin
        .from('profiles')
        .select('plan_id')
        .eq('id', user.id)
        .maybeSingle()

      admin.rpc('award_saathi_points', {
        p_user_id:     user.id,
        p_action_type: 'flame_advance',
        p_base_points: 100,
        p_plan_id:     (profile as { plan_id?: string } | null)?.plan_id ?? 'free',
        p_metadata:    { from: existingFlame, to: newFlame },
      }).then(() => {}).catch(() => {})
    }

    // ── Award shell-broken points ─────────────────────────────────────────────
    if (shellBroken && !existingShellBroken) {
      const { data: profile } = await admin
        .from('profiles')
        .select('plan_id')
        .eq('id', user.id)
        .maybeSingle()

      admin.rpc('award_saathi_points', {
        p_user_id:     user.id,
        p_action_type: 'shell_broken',
        p_base_points: 150,
        p_plan_id:     (profile as { plan_id?: string } | null)?.plan_id ?? 'free',
        p_metadata:    { first_time: true },
      }).then(() => {}).catch(() => {})
    }

    return new Response(
      JSON.stringify({
        ok:              true,
        sessionCount:    existingCount + 1,
        newTone,
        sessionDepth,
        sophistication,
        passionIntensity,
        newFlame,
        flameChanged,
        shellBroken,
        shellJustBroken: shellBroken && !existingShellBroken,
        aiExtracted:     aiFields !== null,
        passionPeakTopic: payload.passion_peak_topic ?? null,
        careerStage:     payload.career_discovery_stage ?? soul?.career_discovery_stage,
        trajectory:      payload.predicted_trajectory ?? soul?.predicted_trajectory,
        depthCalibration: payload.depth_calibration ?? existingDepthCal,
      }),
      { status: 200, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : 'Internal error' }),
      { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } }
    )
  }
})
