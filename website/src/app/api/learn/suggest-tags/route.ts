import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

// Simple in-process rate limiter — no Redis needed for this low-volume endpoint.
// 20 requests per user per minute (generous for tag suggestions on keystroke).
const userRequestCounts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(userId: string): boolean {
  const now = Date.now();
  const entry = userRequestCounts.get(userId);
  if (!entry || now > entry.resetAt) {
    userRequestCounts.set(userId, { count: 1, resetAt: now + 60_000 });
    return false;
  }
  entry.count += 1;
  return entry.count > 20;
}

export async function POST(req: NextRequest) {
  // Auth check
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (isRateLimited(user.id)) {
    return NextResponse.json({ tags: [] }, { status: 429 });
  }

  const body = await req.json() as { topic?: string; vertical_id?: string };
  const { topic, vertical_id } = body;

  if (!topic || typeof topic !== 'string' || topic.trim().length < 3) {
    return NextResponse.json({ tags: [] });
  }

  const saathiName = vertical_id
    ? vertical_id.replace(/saathi$/i, ' Saathi').replace(/^\w/, (c) => c.toUpperCase())
    : 'Education';

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ tags: [] });
  }

  try {
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 128,
        messages: [
          {
            role: 'user',
            content: `Generate 4-6 short topic tags for a learning intent in the subject area "${saathiName}".
The student wants to learn: "${topic.trim()}"

Rules:
- Each tag: 1-3 words, title case
- Tags should be specific subtopics or skills, not generic
- Return ONLY a JSON array of strings, nothing else
- Example: ["Tort Law","Negligence","Case Studies","Indian Courts"]`,
          },
        ],
      }),
    });

    if (!resp.ok) return NextResponse.json({ tags: [] });

    const data = await resp.json() as { content?: { type: string; text: string }[] };
    const raw = data.content?.[0]?.type === 'text' ? (data.content[0].text ?? '').trim() : '[]';
    const match = raw.match(/\[[\s\S]*\]/);
    const tags: unknown[] = match ? (JSON.parse(match[0]) as unknown[]) : [];
    const safeTags = tags.filter((t): t is string => typeof t === 'string' && t.length > 0).slice(0, 6);

    return NextResponse.json({ tags: safeTags });
  } catch {
    return NextResponse.json({ tags: [] });
  }
}
