import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

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
