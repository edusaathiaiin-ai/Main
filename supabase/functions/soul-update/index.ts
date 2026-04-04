/**
 * supabase/functions/soul-update/index.ts
 *
 * Soul Update Edge Function — called at the end of every chat session.
 * Analyses the completed session messages and updates the student_soul table:
 *   - preferred_tone   (detected from message patterns)
 *   - top_topics[]     (extracted from user messages, merged with existing)
 *   - struggle_topics[]  (detected from struggle markers)
 *   - last_session_summary (3-sentence Groq-generated memory)
 *   - session_count    (+1)
 *
 * Input: { saathiId: string, sessionMessages: ChatMessage[] }
 * The client sends the session messages; the Edge Function does all server-side
 * analysis. GROQ_API_KEY is never sent to the client.
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { isUUID } from '../_shared/validate.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY') ?? '';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const MAX_MESSAGES = 40;   // Cap to avoid token bloat
const MAX_TOPICS = 20;
const MAX_STRUGGLES = 10;

// ---------------------------------------------------------------------------
// Type definitions (mirrors lib/soul.ts — Deno cannot import from lib/)
// ---------------------------------------------------------------------------

type MessageRole = 'user' | 'assistant' | 'system';

type ChatMessage = {
  role: MessageRole;
  content: string;
};

type PreferredTone = 'formal' | 'casual' | 'neutral';

// deno-lint-ignore no-explicit-any
type SupabaseClientType = ReturnType<typeof createClient<any>>;

type FlameStage = 'cold' | 'spark' | 'flame' | 'fire' | 'wings';

type RawSoulRow = {
  display_name: unknown;
  preferred_tone: unknown;
  top_topics: unknown;
  struggle_topics: unknown;
  session_count: unknown;
  last_session_summary: unknown;
  flame_stage: unknown;
};

// Flame stage advances with session count — passion ignites over time
function nextFlameStage(sessionCount: number): FlameStage {
  if (sessionCount >= 25) return 'wings';
  if (sessionCount >= 15) return 'fire';
  if (sessionCount >= 8)  return 'flame';
  if (sessionCount >= 3)  return 'spark';
  return 'cold';
}

// ---------------------------------------------------------------------------
// Tone detection
// ---------------------------------------------------------------------------

function detectPreferredTone(messages: ChatMessage[], existing: PreferredTone): PreferredTone {
  const userText = messages
    .filter((m) => m.role === 'user')
    .map((m) => m.content)
    .join(' ');

  if (userText.length < 20) return existing;

  const formalPatterns = [
    /\b(therefore|hence|thus|regarding|furthermore|moreover|consequently|accordingly)\b/i,
    /\b(please|kindly|could you|would you)\b/i,
    /\b(I would like|I wish to|I am seeking)\b/i,
  ];

  const casualPatterns = [
    /\b(yeah|yep|nope|gonna|wanna|kinda|dunno|btw|omg|lol)\b/i,
    /\b(ok|okay|cool|great|nice|awesome|wow)\b/i,
    /!{2,}/,
  ];

  const formalScore = formalPatterns.filter((rx) => rx.test(userText)).length;
  const casualScore = casualPatterns.filter((rx) => rx.test(userText)).length;

  if (formalScore > casualScore && formalScore >= 2) return 'formal';
  if (casualScore > formalScore && casualScore >= 2) return 'casual';
  return existing;
}

// ---------------------------------------------------------------------------
// Topic extraction
// ---------------------------------------------------------------------------

function extractTopics(messages: ChatMessage[], limit: number): string[] {
  const userText = messages
    .filter((m) => m.role === 'user')
    .map((m) => m.content)
    .join(' ');

  const candidates = userText.match(/\b[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})*\b/g) ?? [];
  const freq: Record<string, number> = {};
  for (const term of candidates) {
    const key = term.trim();
    freq[key] = (freq[key] ?? 0) + 1;
  }

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([term]) => term);
}

// ---------------------------------------------------------------------------
// Struggle topic detection
// ---------------------------------------------------------------------------

function detectStruggleTopics(messages: ChatMessage[]): string[] {
  const struggleRx =
    /\b(don'?t understand|confused about|struggling with|not clear|lost on|can'?t grasp|having trouble with|unclear|difficult for me|hard to follow)\b/i;

  const captureSuffix =
    /(?:don'?t understand|confused about|struggling with|not clear about|lost on|can'?t grasp|having trouble with|unclear about|difficult for me|hard to follow)\s+([^.!?\n]{3,40})/i;

  const topics: string[] = [];
  for (const msg of messages) {
    if (msg.role !== 'user') continue;
    if (!struggleRx.test(msg.content)) continue;
    const match = msg.content.match(captureSuffix);
    if (match?.[1]) topics.push(match[1].trim());
  }
  return [...new Set(topics)];
}

// ---------------------------------------------------------------------------
// Session summary via Groq
// ---------------------------------------------------------------------------

type GroqResponse = {
  choices?: Array<{ message?: { content?: string } }>;
};

async function generateSummary(messages: ChatMessage[], displayName: string): Promise<string> {
  if (!GROQ_API_KEY) return '';

  const transcript = messages
    .filter((m) => m.role !== 'system')
    .slice(-20)
    .map((m) => `${m.role === 'user' ? displayName : 'Saathi'}: ${m.content}`)
    .join('\n');

  if (transcript.trim().length === 0) return '';

  const prompt = `You are summarising a tutoring session between a student and their AI learning companion.
Write exactly 3 sentences:
1. The main topic(s) covered
2. One key concept the student engaged with
3. One area to revisit next session

Be warm and personal. Refer to the student by their name: ${displayName}.
Do not use bullet points. Return only the 3 sentences.

TRANSCRIPT:
${transcript}`;

  try {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.4,
      }),
    });

    if (!res.ok) return '';
    const json = (await res.json()) as GroqResponse;
    return json.choices?.[0]?.message?.content?.trim() ?? '';
  } catch {
    return '';
  }
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  try {
    // JWT auth
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    type RequestBody = { saathiId?: string; sessionMessages?: ChatMessage[] };
    const body = (await req.json()) as RequestBody;
    const { saathiId, sessionMessages } = body;

    if (!saathiId || !Array.isArray(sessionMessages) || sessionMessages.length === 0) {
      return new Response(JSON.stringify({ error: 'Missing saathiId or sessionMessages' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
    // saathiId is stored as vertical_id (UUID FK) — reject slugs here
    if (!isUUID(saathiId)) {
      return new Response(JSON.stringify({ error: 'saathiId must be a UUID' }), {
        status: 400,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Cap messages to prevent abuse
    const messages = sessionMessages
      .filter((m): m is ChatMessage =>
        (m.role === 'user' || m.role === 'assistant') &&
        typeof m.content === 'string' &&
        m.content.length > 0
      )
      .slice(-MAX_MESSAGES)
      .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));

    if (messages.length === 0) {
      return new Response(JSON.stringify({ ok: true, message: 'No valid messages to process' }), {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const admin: SupabaseClientType = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Fetch current soul record
    const { data: soulData } = await admin
      .from('student_soul')
      .select('display_name, preferred_tone, top_topics, struggle_topics, session_count, last_session_summary, flame_stage')
      .eq('user_id', user.id)
      .eq('vertical_id', saathiId)
      .maybeSingle();

    const row = soulData as RawSoulRow | null;
    const displayName = typeof row?.display_name === 'string' ? row.display_name : 'Student';
    const existingTone: PreferredTone =
      row?.preferred_tone === 'formal' || row?.preferred_tone === 'casual'
        ? (row.preferred_tone as PreferredTone)
        : 'neutral';
    const existingTopics: string[] = Array.isArray(row?.top_topics) ? (row.top_topics as string[]) : [];
    const existingStruggles: string[] = Array.isArray(row?.struggle_topics) ? (row.struggle_topics as string[]) : [];
    const sessionCount: number = typeof row?.session_count === 'number' ? row.session_count : 0;
    const existingFlameStage = typeof row?.flame_stage === 'string' ? (row.flame_stage as FlameStage) : 'cold';
    const newFlameStage = nextFlameStage(sessionCount + 1);
    const flameStageChanged = newFlameStage !== existingFlameStage;

    // Run analysis
    const newTone = detectPreferredTone(messages, existingTone);
    const sessionTopics = extractTopics(messages, 10);
    const newStruggles = detectStruggleTopics(messages);
    const summary = await generateSummary(messages, displayName);

    const mergedTopics = [...new Set([...existingTopics, ...sessionTopics])].slice(0, MAX_TOPICS);
    const mergedStruggles = [...new Set([...existingStruggles, ...newStruggles])].slice(0, MAX_STRUGGLES);

    // Upsert updated soul
    const { error: upsertError } = await admin.from('student_soul').upsert(
      {
        user_id: user.id,
        vertical_id: saathiId,
        display_name: displayName,
        preferred_tone: newTone,
        top_topics: mergedTopics,
        struggle_topics: mergedStruggles,
        last_session_summary: summary || (typeof row?.last_session_summary === 'string' ? row.last_session_summary : null),
        session_count: sessionCount + 1,
        flame_stage: newFlameStage,
      },
      { onConflict: 'user_id,vertical_id' }
    );

    if (upsertError) {
      throw new Error(`soul upsert: ${upsertError.message}`);
    }

    return new Response(
      JSON.stringify({
        ok: true,
        sessionCount: sessionCount + 1,
        newTone,
        topicsAdded: sessionTopics.length,
        strugglesAdded: newStruggles.length,
        summaryGenerated: Boolean(summary),
        flameStageChanged,
        newFlameStage,
        previousFlameStage: existingFlameStage,
      }),
      {
        status: 200,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
