import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  // 1. Verify session server-side
  const supabase = await createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // 2. Verify admin role from database (not just JWT claim)
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || profile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  // 3. Call edge function using server-side secret — never exposed to client
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const cronSecret = process.env.CRON_SECRET;

  if (!supabaseUrl || !cronSecret) {
    return NextResponse.json({ error: 'Server misconfiguration' }, { status: 500 });
  }

  const response = await fetch(`${supabaseUrl}/functions/v1/rss-fetch`, {
    method: 'POST',
    headers: {
      'x-cron-secret': cronSecret,
    },
  });

  if (!response.ok) {
    return NextResponse.json({ error: 'RSS fetch failed' }, { status: 502 });
  }

  return NextResponse.json({ ok: true });
}
