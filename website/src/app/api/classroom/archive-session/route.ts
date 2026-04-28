import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { requireAuth } from '@/lib/requireAuth'

const DEPTH_WEIGHTS: Record<string, number> = {
  protein_structure: 10,
  wolfram_query: 8,
  pubmed_citation: 6,
  pdf_annotation: 5,
  geogebra_state: 4,
  formula_katex: 3,
  code_snapshot: 2,
  molecule_3d: 1,
}

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { user, supabase } = auth

  const { session_id } = await req.json()
  if (!session_id) return NextResponse.json({ error: 'Missing session_id' }, { status: 400 })

  // Verify caller is faculty of this session
  const { data: session } = await supabase
    .from('live_sessions')
    .select('id, faculty_id, vertical_id, title, started_at, session_artifacts, session_nature')
    .eq('id', session_id)
    .single()

  if (!session || session.faculty_id !== user.id) {
    return NextResponse.json({ error: 'Not authorized' }, { status: 403 })
  }

  // Resolve saathi slug
  const { data: vertical } = await supabase
    .from('verticals')
    .select('slug')
    .eq('id', session.vertical_id)
    .single()
  const saathiSlug = vertical?.slug ?? 'unknown'

  // 1. Fetch all classroom_commands (tool events + questions + artifacts)
  const { data: commands } = await supabase
    .from('classroom_commands')
    .select('*')
    .eq('session_id', session_id)
    .order('created_at', { ascending: true })

  // 2. Fetch homework items
  const { data: homeworkRows } = await supabase
    .from('homework')
    .select('question_text, student_name')
    .eq('session_id', session_id)

  // 3. Read notes from session_artifacts (already saved by handleLeave)
  const sessionNotes = (session.session_artifacts as Record<string, unknown>)?.session_notes as
    { html?: string; plain_text?: string } | undefined

  // 4. Build artifacts array from classroom_commands
  const artifacts: Record<string, unknown>[] = []
  for (const cmd of commands ?? []) {
    if (cmd.tool_triggered === 'question') continue // questions are logged separately

    let data: Record<string, unknown> = {}
    try { data = JSON.parse(cmd.tool_query ?? '{}') } catch { /* use empty */ }

    artifacts.push({
      type: cmd.tool_triggered ?? 'command_log',
      source: cmd.command_text?.replace(/^\[artifact:\w+\]\s*/, '') || 'EdUsaathiAI',
      data,
      timestamp: cmd.created_at,
    })
  }

  // Add canvas snapshot artifact if present
  const canvasJson = (session.session_artifacts as Record<string, unknown>)?.canvas_snapshot
  if (canvasJson) {
    artifacts.push({
      type: 'canvas_snapshot',
      source: 'tldraw',
      data: {
        tldraw_json: canvasJson,
        has_drawings: true,
      },
      timestamp: new Date().toISOString(),
    })
  } else {
    artifacts.push({
      type: 'canvas_snapshot',
      source: 'tldraw',
      data: { tldraw_json: null, has_drawings: false },
      timestamp: new Date().toISOString(),
    })
  }

  // Add notes artifact if present
  if (sessionNotes?.html) {
    artifacts.push({
      type: 'session_notes',
      source: 'Student Notes',
      data: { html: sessionNotes.html, plain_text: sessionNotes.plain_text },
      timestamp: new Date().toISOString(),
    })
  }

  // Add command log as final artifact
  const questionCommands = (commands ?? []).filter(c => c.tool_triggered === 'question')
  artifacts.push({
    type: 'command_log',
    source: 'EdUsaathiAI AI Command Bar',
    data: {
      commands: (commands ?? []).map(c => ({
        command_text: c.command_text,
        tool_triggered: c.tool_triggered,
        tool_query: c.tool_query,
        timestamp: c.created_at,
      })),
      total_commands: (commands ?? []).length,
      questions: questionCommands.map(c => ({
        text: c.command_text,
        student: c.tool_query,
        timestamp: c.created_at,
      })),
    },
    timestamp: new Date().toISOString(),
  })

  // 5. Generate summary via Claude Haiku (raw API — no SDK dependency)
  let summary = ''
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (apiKey && artifacts.length > 1) {
    try {
      const artifactSummary = artifacts
        .filter(a => a.type !== 'command_log')
        .map(a => `- ${a.type}: ${JSON.stringify(a.data).slice(0, 200)}`)
        .join('\n')

      const homeworkSummary = (homeworkRows ?? []).map(h => `- HW: ${h.question_text}`).join('\n')

      // session_nature shapes what the summary prioritises. Default
      // (curriculum or null) = existing behaviour; no regression.
      const nature = (session as { session_nature?: string | null }).session_nature ?? 'curriculum'
      const systemByNature: Record<string, string> = {
        curriculum: `Summarise this research session in 2-3 sentences.
Focus on what was studied academically, not the tools used.
Do not mention software names. Be specific about compounds,
theorems, cases, or concepts that were covered.`,
        broader_context: `Summarise this BROADER CONTEXT session in 2-3 sentences.
The session deliberately went beyond the syllabus — capture the bridges
drawn to industry, history, policy, society, or adjacent disciplines,
not just the academic topic. Be specific about the connections made.
Do not mention software names.`,
        story: `Summarise this STORY SESSION in 2-3 sentences.
The faculty shared personal experience, a subject's narrative arc, or
a lived perspective. Capture the story the student heard — people,
moments, reflections — not a textbook recap. Warm, narrative tone.
Do not mention software names.`,
      }
      const systemPrompt = systemByNature[nature] ?? systemByNature.curriculum

      const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 200,
          system: systemPrompt,
          messages: [{
            role: 'user',
            content: `Session: ${session.title}\nSaathi: ${saathiSlug}\nNature: ${nature}\n\nArtifacts:\n${artifactSummary}\n\n${homeworkSummary ? `Homework assigned:\n${homeworkSummary}` : ''}`,
          }],
        }),
      })

      if (claudeRes.ok) {
        const data = await claudeRes.json()
        const text = data.content?.[0]?.text ?? ''
        summary = text
      } else {
        summary = `${session.title} — ${saathiSlug} session with ${artifacts.length} research artifacts.`
      }
    } catch {
      summary = `${session.title} — ${saathiSlug} session with ${artifacts.length} research artifacts.`
    }
  } else {
    summary = `${session.title} — ${saathiSlug} session.`
  }

  // 6. Calculate session duration
  const startedAt = session.started_at ? new Date(session.started_at).getTime() : Date.now() - 3600000
  const durationMs = Date.now() - startedAt
  const durationInterval = `${Math.floor(durationMs / 3600000)} hours ${Math.floor((durationMs % 3600000) / 60000)} minutes`

  // 7. Calculate research depth score
  let depthScore = 0
  for (const a of artifacts) {
    const t = a.type as string
    depthScore += DEPTH_WEIGHTS[t] ?? 0
  }

  // 8. Build archive context for soul engine (max 400 chars). Prepend the
  // nature tag so the chat Edge Function can carry the tone forward when
  // it injects LAST CLASSROOM SESSION context.
  const sessionNature =
    (session as { session_nature?: string | null }).session_nature ?? 'curriculum'
  const topArtifacts = artifacts
    .filter(a => a.type !== 'command_log' && a.type !== 'session_notes')
    .slice(0, 5)
    .map(a => `${a.type}: ${JSON.stringify(a.data).slice(0, 60)}`)
    .join('; ')
  const natureTag = sessionNature === 'curriculum' ? '' : `[nature:${sessionNature}] `
  const archiveContext = (natureTag + topArtifacts).slice(0, 400)

  // 9. Get booked students
  const { data: bookings } = await supabase
    .from('live_bookings')
    .select('student_id')
    .eq('session_id', session_id)

  const studentIds = (bookings ?? []).map(b => b.student_id).filter(Boolean)

  // Include faculty as well (they also get an archive)
  const allParticipantIds = [...new Set([...studentIds, user.id])]

  // 10. Write one research_archives row per participant
  const sessionDate = session.started_at
    ? new Date(session.started_at).toISOString().slice(0, 10)
    : new Date().toISOString().slice(0, 10)

  for (const participantId of allParticipantIds) {
    await supabase.from('research_archives').insert({
      session_id,
      student_id: participantId,
      faculty_id: user.id,
      saathi_slug: saathiSlug,
      session_date: sessionDate,
      session_duration: durationInterval,
      summary,
      artifacts,
      reconstructable: true,
    })
  }

  // 11. Update live_sessions with final artifacts
  await supabase
    .from('live_sessions')
    .update({
      session_artifacts: {
        ...(session.session_artifacts as Record<string, unknown> ?? {}),
        archived_at: new Date().toISOString(),
        artifact_count: artifacts.length,
        research_depth_score: depthScore,
      },
      ended_at: new Date().toISOString(),
    })
    .eq('id', session_id)

  // 12. Update student_soul for each student (Step 6 — soul engine integration)
  for (const studentId of studentIds) {
    const { data: existingSoul } = await supabase
      .from('student_soul')
      .select('research_depth_score')
      .eq('user_id', studentId)
      .eq('vertical_id', session.vertical_id)
      .maybeSingle()

    const currentScore = existingSoul?.research_depth_score ?? 0

    await supabase
      .from('student_soul')
      .upsert({
        user_id: studentId,
        vertical_id: session.vertical_id,
        last_research_summary: summary,
        research_depth_score: currentScore + depthScore,
        last_archive_context: archiveContext,
      }, { onConflict: 'user_id,vertical_id' })
  }

  // 13. Institution daily-minutes rollup (Phase I-2 Step 5).
  //     Group classroom sessions taught by institution faculty count
  //     against the institution's daily window. Independent faculty
  //     and faculty without an education_institution_id are unaffected
  //     — the lookup short-circuits to a no-op for them.
  //
  //     Race-safe via the increment_institution_minutes RPC (migration
  //     145), which does the self-healing reset and the increment in a
  //     single UPDATE. Service-role client because:
  //       (a) the RPC is GRANT EXECUTE TO service_role only — a
  //           logged-in user cannot bump arbitrary institutions, and
  //       (b) faculty don't have UPDATE on education_institutions
  //           through their RLS policies.
  //
  //     Fire-and-forget: a network blip on this rollup must not fail
  //     the archive write, which is the user-visible action.
  try {
    const { data: facultyProfile } = await supabase
      .from('profiles')
      .select('education_institution_id')
      .eq('id', user.id)
      .maybeSingle<{ education_institution_id: string | null }>()

    if (facultyProfile?.education_institution_id) {
      const minutes = Math.max(1, Math.ceil(durationMs / 60_000))
      const todayIst = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })

      const adminClient = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { auth: { persistSession: false, autoRefreshToken: false } },
      )

      const { error: rpcErr } = await adminClient.rpc('increment_institution_minutes', {
        p_institution_id: facultyProfile.education_institution_id,
        p_add_minutes:    minutes,
        p_today_ist:      todayIst,
      })
      if (rpcErr) {
        console.warn('[archive-session] institution minutes RPC failed:', rpcErr.message)
      }
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'unknown'
    console.warn('[archive-session] institution minutes rollup threw:', msg)
  }

  return NextResponse.json({
    success: true,
    archives_created: allParticipantIds.length,
    artifacts_count: artifacts.length,
    depth_score: depthScore,
    summary,
  })
}
