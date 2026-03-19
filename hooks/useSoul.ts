import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './useAuth';
import type { SoulProfile } from '../types';

type UseSoulResult = {
  soul: SoulProfile | null;
  loading: boolean;
  error: string | null;
  refresh: () => void;
};

/**
 * useSoul
 *
 * Client-side hook — fetches the student soul profile for a given Saathi vertical.
 * Uses the authenticated user's session (anon key + RLS).
 * Does NOT assemble the system prompt — that is server-side only (lib/soul.ts).
 */
export function useSoul(saathiId: string | null): UseSoulResult {
  const { user } = useAuth();
  const [soul, setSoul] = useState<SoulProfile | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  const refresh = () => setTick((t) => t + 1);

  useEffect(() => {
    if (!user || !saathiId) {
      setSoul(null);
      return;
    }

    let cancelled = false;

    const fetchSoul = async () => {
      setLoading(true);
      setError(null);

      const { data, error: fetchError } = await supabase
        .from('student_soul')
        .select(
          'display_name, ambition_level, preferred_tone, enrolled_subjects, future_subjects, future_research_area, top_topics, struggle_topics, last_session_summary, session_count'
        )
        .eq('user_id', user.id)
        .eq('vertical_id', saathiId)
        .maybeSingle();

      if (cancelled) return;

      if (fetchError) {
        setError(fetchError.message);
        setLoading(false);
        return;
      }

      if (!data) {
        setSoul(null);
        setLoading(false);
        return;
      }

      const row = data as Record<string, unknown>;
      const tone = row.preferred_tone;

      setSoul({
        userId: user.id,
        saathiId,
        displayName: typeof row.display_name === 'string' ? row.display_name : 'Student',
        ambitionLevel:
          typeof row.ambition_level === 'string' ? row.ambition_level : 'medium',
        preferredTone:
          tone === 'formal' || tone === 'casual' || tone === 'neutral' ? tone : 'neutral',
        enrolledSubjects: Array.isArray(row.enrolled_subjects)
          ? (row.enrolled_subjects as string[])
          : [],
        futureSubjects: Array.isArray(row.future_subjects)
          ? (row.future_subjects as string[])
          : [],
        futureResearchArea:
          typeof row.future_research_area === 'string' ? row.future_research_area : '',
        topTopics: Array.isArray(row.top_topics) ? (row.top_topics as string[]) : [],
        struggleTopics: Array.isArray(row.struggle_topics)
          ? (row.struggle_topics as string[])
          : [],
        lastSessionSummary:
          typeof row.last_session_summary === 'string' ? row.last_session_summary : null,
        sessionCount: typeof row.session_count === 'number' ? row.session_count : 0,
      });

      setLoading(false);
    };

    void fetchSoul();

    return () => {
      cancelled = true;
    };
  }, [user, saathiId, tick]);

  return { soul, loading, error, refresh };
}
