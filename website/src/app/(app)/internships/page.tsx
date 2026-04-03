'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { SAATHIS } from '@/constants/saathis';

// ── Types ─────────────────────────────────────────────────────────────────────

type InternListing = {
  id: string;
  title: string;
  description: string;
  required_saathi_slug: string | null;
  required_academic_level: string | null;
  stipend_amount: number | null;
  stipend_currency: string;
  is_remote: boolean;
  seats_available: number;
  application_deadline: string | null;
  duration_months: number | null;
  status: string;
  institution_name?: string;
};

type InternMatch = {
  id: string;
  listing_id: string;
  match_score: number;
  score_breakdown: Record<string, number>;
  listing?: InternListing;
  applied?: boolean;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function ScorePill({ score }: { score: number }) {
  const [bg, border, color] =
    score >= 80 ? ['rgba(34,197,94,0.15)', 'rgba(34,197,94,0.4)', '#4ADE80'] :
    score >= 60 ? ['rgba(201,153,58,0.15)', 'rgba(201,153,58,0.4)', '#E5B86A'] :
                  ['rgba(239,68,68,0.12)', 'rgba(239,68,68,0.3)', '#F87171'];
  return (
    <span className="text-xs font-bold px-2.5 py-1 rounded-full"
      style={{ background: bg, border: `0.5px solid ${border}`, color }}>
      {score}% match
    </span>
  );
}

function LockedCard({ completeness }: { completeness: number }) {
  const router = useRouter();
  return (
    <div className="rounded-2xl p-8 text-center"
      style={{ background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.07)' }}>
      <p className="text-4xl mb-4">🔒</p>
      <p className="font-playfair text-xl text-white mb-2">Internship matches locked</p>
      <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>
        Complete 60% of your profile to unlock internship matches
      </p>
      {/* Progress bar */}
      <div className="max-w-xs mx-auto mb-6">
        <div className="flex justify-between text-xs mb-1.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
          <span>Profile completeness</span>
          <span style={{ color: '#E5B86A' }}>{completeness}%</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.08)' }}>
          <div
            className="h-2 rounded-full transition-all duration-500"
            style={{ width: `${completeness}%`, background: 'linear-gradient(90deg, #C9993A, #E5B86A)' }}
          />
        </div>
        <p className="text-xs mt-1.5 text-right" style={{ color: 'rgba(255,255,255,0.25)' }}>
          {60 - completeness}% more needed
        </p>
      </div>
      <button
        onClick={() => router.push('/profile')}
        className="px-6 py-3 rounded-xl text-sm font-bold"
        style={{ background: '#C9993A', color: '#060F1D' }}
      >
        Complete Profile →
      </button>
    </div>
  );
}

// ── Apply modal ───────────────────────────────────────────────────────────────

function ApplyModal({
  match,
  onClose,
  onApplied,
}: {
  match: InternMatch;
  onClose: () => void;
  onApplied: (matchId: string) => void;
}) {
  const { profile } = useAuthStore();
  const [applying, setApplying] = useState(false);

  async function handleApply() {
    if (!profile || !match.listing) return;
    setApplying(true);
    const supabase = createClient();
    await supabase.from('intern_interests').upsert({
      listing_id: match.listing_id,
      student_user_id: profile.id,
      status: 'applied',
    }, { onConflict: 'listing_id,student_user_id' });
    setApplying(false);
    onApplied(match.id);
    onClose();
  }

  const l = match.listing!;
  const saathi = l.required_saathi_slug ? SAATHIS.find((s) => s.id === l.required_saathi_slug) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(6,15,29,0.9)' }}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="w-full max-w-md rounded-2xl p-6"
        style={{ background: '#0B1F3A', border: '0.5px solid rgba(255,255,255,0.1)' }}
      >
        <h2 className="font-playfair text-2xl font-bold text-white mb-1">{l.title}</h2>
        <p className="text-sm mb-4" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {l.is_remote ? 'Remote' : 'On-site'}
          {l.stipend_amount ? ` · ₹${l.stipend_amount}/mo` : ' · Unpaid'}
          {l.duration_months ? ` · ${l.duration_months} months` : ''}
        </p>

        <div className="rounded-xl p-4 mb-5" style={{ background: 'rgba(201,153,58,0.08)', border: '0.5px solid rgba(201,153,58,0.2)' }}>
          <p className="text-xs font-semibold mb-2" style={{ color: '#E5B86A' }}>This is what they&apos;ll see about you:</p>
          <div className="text-sm space-y-1" style={{ color: 'rgba(255,255,255,0.6)' }}>
            <p>👤 {profile?.full_name}</p>
            <p>🎓 {profile?.academic_level ?? 'Student'} · {profile?.city}</p>
            {saathi && <p>{saathi.emoji} {saathi.name} student</p>}
            {profile?.profile_completeness_pct !== undefined && (
              <p>⚡ {profile.profile_completeness_pct}% profile complete</p>
            )}
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl text-sm"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            disabled={applying}
            className="flex-1 py-3 rounded-xl text-sm font-bold disabled:opacity-50"
            style={{ background: '#C9993A', color: '#060F1D' }}
          >
            {applying ? 'Applying…' : 'Confirm & Apply →'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function InternshipsPage() {
  const router = useRouter();
  const { profile } = useAuthStore();

  const [matches, setMatches] = useState<InternMatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [applying, setApplying] = useState<InternMatch | null>(null);
  const [filterSaathi, setFilterSaathi] = useState('');

  const completeness = profile?.profile_completeness_pct ?? 0;
  const unlocked = completeness >= 60;

  useEffect(() => {
    async function run() {
    if (!profile || !unlocked) { setLoading(false); return; }
    const supabase = createClient();

    async function loadMatches() {
      setLoading(true);
      const [{ data: matchData }, { data: appliedData }] = await Promise.all([
        supabase
          .from('intern_matches')
          .select('id, listing_id, match_score, score_breakdown')
          .eq('student_user_id', profile!.id)
          .order('match_score', { ascending: false })
          .limit(30),
        supabase
          .from('intern_interests')
          .select('listing_id')
          .eq('student_user_id', profile!.id),
      ]);

      const appliedIds = new Set((appliedData ?? []).map((a) => a.listing_id));

      if (!matchData?.length) { setMatches([]); setLoading(false); return; }

      const listingIds = matchData.map((m) => m.listing_id);
      const { data: listingData } = await supabase
        .from('intern_listings')
        .select('id, title, description, required_saathi_slug, required_academic_level, stipend_amount, stipend_currency, is_remote, seats_available, application_deadline, duration_months, status')
        .in('id', listingIds)
        .eq('status', 'active');

      const listingMap = Object.fromEntries((listingData ?? []).map((l) => [l.id, l]));

      const enriched: InternMatch[] = (matchData ?? []).map((m) => ({
        ...m,
        score_breakdown: (m.score_breakdown as Record<string, number>) ?? {},
        listing: listingMap[m.listing_id] as InternListing | undefined,
        applied: appliedIds.has(m.listing_id),
      })).filter((m) => m.listing);

      setMatches(enriched);
      setLoading(false);
    }

    loadMatches();
    }
    void run();
  }, [profile, unlocked]);

  function markApplied(matchId: string) {
    setMatches((prev) => prev.map((m) => m.id === matchId ? { ...m, applied: true } : m));
  }

  const filtered = filterSaathi
    ? matches.filter((m) => m.listing?.required_saathi_slug === filterSaathi)
    : matches;

  return (
    <main className="min-h-screen" style={{ background: 'linear-gradient(180deg, #060F1D 0%, #0B1F3A 60%, #060F1D 100%)' }}>
      {/* Top nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <span className="font-playfair text-xl font-bold" style={{ color: '#C9993A' }}>EdUsaathiAI</span>
        <button
          onClick={() => router.push('/chat')}
          className="text-sm transition-colors"
          style={{ color: 'rgba(255,255,255,0.4)' }}
        >
          ← Back to Chat
        </button>
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-8">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <p className="text-xs font-semibold mb-1" style={{ color: '#C9993A' }}>MATCHED FOR YOU</p>
          <h1 className="font-playfair text-3xl font-bold text-white mb-2">Internship Matches</h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Ranked by how well your soul profile aligns with each opportunity.
          </p>
        </motion.div>

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-10 h-10 rounded-full border-2 border-white/10 animate-spin" style={{ borderTopColor: '#C9993A' }} />
          </div>
        ) : !unlocked ? (
          <LockedCard completeness={completeness} />
        ) : matches.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-playfair text-2xl text-white/30 mb-2">No matches yet</p>
            <p className="text-sm text-white/20">New internships are added regularly. Check back soon.</p>
          </div>
        ) : (
          <>
            {/* Filter */}
            <div className="flex gap-2 flex-wrap mb-6">
              <button
                onClick={() => setFilterSaathi('')}
                className="px-4 py-2 rounded-full text-sm font-medium transition-all"
                style={{
                  background: !filterSaathi ? 'rgba(201,153,58,0.2)' : 'rgba(255,255,255,0.04)',
                  border: `0.5px solid ${!filterSaathi ? 'rgba(201,153,58,0.5)' : 'rgba(255,255,255,0.08)'}`,
                  color: !filterSaathi ? '#E5B86A' : 'rgba(255,255,255,0.45)',
                }}
              >
                All ({matches.length})
              </button>
              {Array.from(new Set(matches.map((m) => m.listing?.required_saathi_slug).filter(Boolean))).map((slug) => {
                const s = SAATHIS.find((x) => x.id === slug);
                return s ? (
                  <button
                    key={slug}
                    onClick={() => setFilterSaathi(slug!)}
                    className="px-4 py-2 rounded-full text-sm font-medium transition-all"
                    style={{
                      background: filterSaathi === slug ? 'rgba(201,153,58,0.2)' : 'rgba(255,255,255,0.04)',
                      border: `0.5px solid ${filterSaathi === slug ? 'rgba(201,153,58,0.5)' : 'rgba(255,255,255,0.08)'}`,
                      color: filterSaathi === slug ? '#E5B86A' : 'rgba(255,255,255,0.45)',
                    }}
                  >
                    {s.emoji} {s.name}
                  </button>
                ) : null;
              })}
            </div>

            {/* Cards */}
            <div className="space-y-4">
              {filtered.map((m) => {
                const l = m.listing!;
                const saathi = l.required_saathi_slug ? SAATHIS.find((s) => s.id === l.required_saathi_slug) : null;
                return (
                  <motion.div
                    key={m.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl p-5"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.08)' }}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          {saathi && <span className="text-base">{saathi.emoji}</span>}
                          <h3 className="text-white font-semibold">{l.title}</h3>
                        </div>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                          {l.is_remote ? 'Remote' : 'On-site'}
                          {l.stipend_amount ? ` · ₹${l.stipend_amount.toLocaleString('en-IN')}/mo` : ' · Unpaid'}
                          {l.duration_months ? ` · ${l.duration_months} months` : ''}
                          {l.application_deadline ? ` · Deadline ${new Date(l.application_deadline).toLocaleDateString('en-IN')}` : ''}
                        </p>
                      </div>
                      <ScorePill score={m.match_score} />
                    </div>

                    <p className="text-sm mb-4 line-clamp-2" style={{ color: 'rgba(255,255,255,0.55)' }}>{l.description}</p>

                    {/* Score breakdown */}
                    <div className="flex flex-wrap gap-1.5 mb-4">
                      {Object.entries(m.score_breakdown).map(([k, v]) => (
                        <span key={k} className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: 'rgba(201,153,58,0.08)', color: '#E5B86A' }}>
                          {k.replace(/_/g, ' ')} +{v}
                        </span>
                      ))}
                    </div>

                    <button
                      onClick={() => !m.applied && setApplying(m)}
                      disabled={m.applied}
                      className="px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:cursor-default"
                      style={{
                        background: m.applied ? 'rgba(34,197,94,0.12)' : '#C9993A',
                        color: m.applied ? '#4ADE80' : '#060F1D',
                        border: m.applied ? '0.5px solid rgba(34,197,94,0.3)' : 'none',
                      }}
                    >
                      {m.applied ? '✓ Applied' : 'View & Apply →'}
                    </button>
                  </motion.div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Apply modal */}
      <AnimatePresence>
        {applying && (
          <ApplyModal
            match={applying}
            onClose={() => setApplying(null)}
            onApplied={markApplied}
          />
        )}
      </AnimatePresence>
    </main>
  );
}
