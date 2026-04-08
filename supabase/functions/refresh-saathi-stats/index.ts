import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// No hardcoded slugs — fetch all live verticals from the database

function communityLabel(total: number): string {
  if (total >= 1000) return 'Community';
  if (total >= 500) return 'Scholars';
  if (total >= 200) return 'Learners';
  if (total >= 50) return 'Explorers';
  if (total >= 11) return 'Pioneers';
  return 'Founding Members';
}

serve(async () => {
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Fetch all live verticals from DB — no hardcoded list
  const { data: verticals } = await admin
    .from('verticals')
    .select('id, slug')
    .eq('is_live', true)
    .eq('is_active', true);

  if (!verticals || verticals.length === 0) {
    return new Response(
      JSON.stringify({ refreshed: 0, error: 'No live verticals found' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  }

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const thirtyDaysAgoISO = thirtyDaysAgo.toISOString();

  let refreshed = 0;

  for (const vertical of verticals) {
    const uuid = (vertical as { id: string; slug: string }).id;
    const slug = (vertical as { id: string; slug: string }).slug;

    // Total students — profiles.primary_saathi_id stores UUID
    const { count: total } = await admin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('primary_saathi_id', uuid)
      .eq('is_active', true);

    // Active students — distinct user_ids with a session in last 30 days
    const { data: activeSessions } = await admin
      .from('chat_sessions')
      .select('user_id')
      .eq('vertical_id', uuid)
      .gte('created_at', thirtyDaysAgoISO);

    const activeCount = new Set((activeSessions ?? []).map((r: { user_id: string }) => r.user_id)).size;

    // Paying students
    const { count: paying } = await admin
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('primary_saathi_id', uuid)
      .neq('plan_id', 'free')
      .not('plan_id', 'is', null);

    // Total sessions + messages
    const { data: sessionStats } = await admin
      .from('chat_sessions')
      .select('message_count')
      .eq('vertical_id', uuid);

    const totalSessions = sessionStats?.length ?? 0;
    const totalMessages = (sessionStats ?? []).reduce(
      (sum: number, s: { message_count: number }) => sum + (s.message_count ?? 0), 0,
    );

    // Average depth from student_soul
    const { data: depthRows } = await admin
      .from('student_soul')
      .select('depth_calibration')
      .eq('vertical_id', uuid)
      .not('depth_calibration', 'is', null);

    const avgDepth = depthRows && depthRows.length > 0
      ? depthRows.reduce((sum: number, s: { depth_calibration: number }) => sum + (s.depth_calibration ?? 0), 0) / depthRows.length
      : 0;

    // Top topics across all souls
    const { data: souls } = await admin
      .from('student_soul')
      .select('top_topics')
      .eq('vertical_id', uuid)
      .not('top_topics', 'is', null);

    const topicFreq: Record<string, number> = {};
    (souls ?? []).forEach((s: { top_topics: string[] | null }) => {
      (s.top_topics ?? []).forEach((t) => {
        topicFreq[t] = (topicFreq[t] ?? 0) + 1;
      });
    });
    const topTopics = Object.entries(topicFreq)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([topic]) => topic);

    const totalCount = total ?? 0;
    const label = communityLabel(totalCount);

    // saathi_stats_cache uses slug as PK
    await admin.from('saathi_stats_cache').upsert({
      vertical_id: slug,
      total_students: totalCount,
      active_students: activeCount,
      paying_students: paying ?? 0,
      total_sessions: totalSessions,
      total_messages: totalMessages,
      avg_depth: Math.round(avgDepth * 10) / 10,
      top_topics: topTopics,
      community_label: label,
      last_refreshed_at: new Date().toISOString(),
      next_refresh_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
    }, { onConflict: 'vertical_id' });

    refreshed++;
  }

  return new Response(
    JSON.stringify({ refreshed, at: new Date().toISOString() }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
});
