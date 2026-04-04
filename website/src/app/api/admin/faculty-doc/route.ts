import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'

// GET /api/admin/faculty-doc?userId=xxx
// Returns a 5-minute signed URL for the faculty's verification document.
// Admin-only. Requires authenticated session with role=admin.

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()
  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (profileError || profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const userId = req.nextUrl.searchParams.get('userId')
  if (!userId) {
    return NextResponse.json({ error: 'userId required' }, { status: 400 })
  }

  // Fetch the doc path via admin client (bypasses RLS)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  }

  const admin = createAdminClient(supabaseUrl, serviceKey)

  const { data: fp } = await admin
    .from('faculty_profiles')
    .select('verification_doc_url, verification_doc_type')
    .eq('user_id', userId)
    .single()

  if (!fp?.verification_doc_url) {
    return NextResponse.json({ error: 'No document uploaded' }, { status: 404 })
  }

  const { data: signed, error: signError } = await admin.storage
    .from('faculty-docs')
    .createSignedUrl(fp.verification_doc_url, 300) // 5-minute window

  if (signError || !signed?.signedUrl) {
    return NextResponse.json(
      { error: 'Could not generate download link' },
      { status: 500 }
    )
  }

  return NextResponse.json({
    url: signed.signedUrl,
    doc_type: fp.verification_doc_type,
  })
}
