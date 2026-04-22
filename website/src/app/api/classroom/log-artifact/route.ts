import { NextRequest, NextResponse } from 'next/server'
import { requireAuth } from '@/lib/requireAuth'

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth instanceof NextResponse) return auth
  const { user, supabase } = auth

  const { session_id, artifact } = await req.json()
  if (!session_id || !artifact?.type) {
    return NextResponse.json({ error: 'Missing session_id or artifact' }, { status: 400 })
  }

  await supabase.from('classroom_commands').insert({
    session_id,
    user_id: user.id,
    command_text: `[artifact:${artifact.type}] ${artifact.source ?? ''}`,
    tool_triggered: artifact.type,
    tool_query: JSON.stringify(artifact.data ?? {}),
    created_at: artifact.timestamp ?? new Date().toISOString(),
  })

  return NextResponse.json({ ok: true })
}
