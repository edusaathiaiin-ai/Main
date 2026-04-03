/**
 * supabase/functions/board-answer/index.ts
 *
 * Generates an AI answer for a board question, stores it, and notifies
 * the question author via in-app notification + email.
 *
 * Called fire-and-forget from PostQuestionModal after a successful insert.
 * Body: { questionId: string, saathiId: string (slug) }
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { captureError } from '../_shared/sentry.ts';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const GROQ_API_KEY = Deno.env.get('GROQ_API_KEY') ?? '';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') ?? '';
const APP_URL = 'https://www.edusaathiai.in';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Human-readable Saathi name from slug
function saathiName(slug: string): string {
  const map: Record<string, string> = {
    kanoonsaathi: 'KanoonSaathi', mathsaathi: 'MathSaathi',
    chemsaathi: 'ChemSaathi', biosaathi: 'BioSaathi',
    pharmasaathi: 'PharmaSaathi', medicosaathi: 'MedicoSaathi',
    nursingsaathi: 'NursingSaathi', psychsaathi: 'PsychSaathi',
    mechsaathi: 'MechSaathi', civilsaathi: 'CivilSaathi',
    elecsaathi: 'ElecSaathi', compsaathi: 'CompSaathi',
    envirosathi: 'EnviroSaathi', bizsaathi: 'BizSaathi',
    finsaathi: 'FinSaathi', mktsaathi: 'MktSaathi',
    hrsaathi: 'HRSaathi', archsaathi: 'ArchSaathi',
    historysaathi: 'HistorySaathi', econsaathi: 'EconSaathi',
  };
  return map[slug] ?? slug.replace(/saathi$/i, ' Saathi');
}

// Saathi primary colour (approximate — for email CTA)
function saathiColor(slug: string): string {
  const map: Record<string, string> = {
    kanoonsaathi: '#1E3A5F', mathsaathi: '#0F4C2A', chemsaathi: '#5C1A6B',
    biosaathi: '#1A5C2E', pharmasaathi: '#7A1C1C', medicosaathi: '#1A4A5C',
    nursingsaathi: '#5C001A', psychsaathi: '#3A1C5C', mechsaathi: '#1A3A5C',
    civilsaathi: '#3A2800', elecsaathi: '#003A5C', compsaathi: '#1C1C5C',
    envirosathi: '#0F3A1A', bizsaathi: '#1A3A00', finsaathi: '#1A3A2A',
    mktsaathi: '#5C1A00', hrsaathi: '#3A003A', archsaathi: '#6B4A00',
    historysaathi: '#5C3A00', econsaathi: '#2C4A00',
  };
  return map[slug] ?? '#C9993A';
}

async function generateAiAnswer(
  questionText: string,
  slug: string,
): Promise<string> {
  const name = saathiName(slug);
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${GROQ_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      max_tokens: 600,
      temperature: 0.5,
      messages: [
        {
          role: 'system',
          content: `You are ${name}, an AI learning companion on EdUsaathiAI — an Indian education platform. ` +
            `A student has posted a question on the Community Board. Write a clear, accurate, helpful answer. ` +
            `Use plain paragraphs — no markdown headers, no bullet lists unless essential. ` +
            `Keep it under 400 words. Reference Indian context where relevant. ` +
            `End with: "You are not just answering questions. You are shaping a future."`,
        },
        { role: 'user', content: questionText },
      ],
    }),
  });
  const data = await res.json();
  return data.choices?.[0]?.message?.content?.trim() ?? '';
}

async function sendAnswerEmail(
  email: string,
  firstName: string,
  questionText: string,
  name: string,
  actionUrl: string,
  color: string,
) {
  await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'EdUsaathiAI <noreply@edusaathiai.in>',
      to: [email],
      subject: `Your question was answered — ${name}`,
      html: `
<div style="font-family:sans-serif;max-width:480px;margin:0 auto;background:#0B1F3A;color:#fff;padding:36px;border-radius:16px">
  <p style="font-size:13px;color:rgba(255,255,255,0.5);margin:0 0 20px">Hello ${firstName},</p>
  <h2 style="font-family:Georgia,serif;font-size:22px;color:#fff;margin:0 0 6px">Your question was answered ✓</h2>
  <p style="font-size:13px;color:rgba(255,255,255,0.5);margin:0 0 20px">
    ${name} has responded to your Community Board question.
  </p>
  <div style="background:rgba(255,255,255,0.05);border-left:3px solid ${color};border-radius:8px;padding:14px 16px;margin:0 0 24px">
    <p style="font-size:13px;color:rgba(255,255,255,0.7);margin:0;font-style:italic;line-height:1.6">
      "${questionText.slice(0, 120)}${questionText.length > 120 ? '...' : ''}"
    </p>
  </div>
  <a href="${APP_URL}${actionUrl}"
     style="display:block;text-align:center;background:${color};color:#fff;padding:14px;border-radius:12px;font-size:14px;font-weight:700;text-decoration:none;margin:0 0 20px">
    Read the answer →
  </a>
  <p style="font-size:11px;color:rgba(255,255,255,0.2);text-align:center;margin:0">
    EdUsaathiAI Community Board ·
    <a href="${APP_URL}/board" style="color:rgba(255,255,255,0.3)">View all questions</a>
  </p>
</div>`,
    }),
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: CORS_HEADERS });
  }

  try {
    const { questionId, saathiId } = await req.json() as {
      questionId: string;
      saathiId: string;
    };

    if (!questionId || !saathiId) {
      return new Response(JSON.stringify({ error: 'questionId and saathiId required' }), {
        status: 400, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Fetch the question
    const { data: question, error: qErr } = await admin
      .from('board_questions')
      .select('id, title, user_id, ai_answer')
      .eq('id', questionId)
      .single();

    if (qErr || !question) {
      return new Response(JSON.stringify({ error: 'Question not found' }), {
        status: 404, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // Skip if already answered
    if (question.ai_answer) {
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // 2. Generate AI answer
    const answer = await generateAiAnswer(question.title, saathiId);
    if (!answer) {
      return new Response(JSON.stringify({ error: 'AI generation failed' }), {
        status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }

    // 3. Save answer to board_questions.ai_answer
    await admin
      .from('board_questions')
      .update({ ai_answer: answer })
      .eq('id', questionId);

    // 4. Notify question author
    const actionUrl = `/board?question=${questionId}`;
    const name = saathiName(saathiId);

    await admin.from('notifications').insert({
      user_id: question.user_id,
      type: 'board_answered',
      title: `${name} answered your question`,
      body: question.title.slice(0, 80) + (question.title.length > 80 ? '...' : ''),
      action_url: actionUrl,
    });

    // 5. Send email (non-blocking — best effort)
    if (RESEND_API_KEY) {
      const { data: profile } = await admin
        .from('profiles')
        .select('email, full_name')
        .eq('id', question.user_id)
        .single();

      if (profile?.email) {
        const firstName = (profile.full_name ?? 'Student').split(' ')[0];
        await sendAnswerEmail(
          profile.email,
          firstName,
          question.title,
          name,
          actionUrl,
          saathiColor(saathiId),
        ).catch(() => {}); // non-blocking
      }
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    captureError(err instanceof Error ? err : new Error(String(err)), {
      tags: { function: 'board-answer' },
    });
    return new Response(JSON.stringify({ error: 'Internal error' }), {
      status: 500, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
});
