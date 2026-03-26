'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { SAATHIS } from '@/constants/saathis';
import type { Profile } from '@/types';

// ── Types ─────────────────────────────────────────────────────────────────────

type VerificationStatus = 'pending' | 'verified' | 'rejected';

type InstitutionProfile = {
  id: string;
  org_name: string;
  org_type: string;
  website: string | null;
  contact_person: string | null;
  contact_email: string;
  city: string | null;
  description: string | null;
  verification_status: VerificationStatus;
};

type Listing = {
  id: string;
  title: string;
  description: string;
  required_saathi_slug: string | null;
  required_academic_level: string | null;
  required_flame_stage: string;
  required_min_profile_pct: number;
  skills_needed: string[];
  stipend_amount: number | null;
  stipend_currency: string;
  is_remote: boolean;
  seats_available: number;
  application_deadline: string | null;
  status: string;
  total_applicants: number;
  views_count: number;
  duration_months: number | null;
  created_at: string;
};

type Applicant = {
  id: string;
  listing_id: string;
  student_user_id: string;
  match_score: number;
  score_breakdown: Record<string, number>;
  created_at: string;
  student_name?: string;
  student_city?: string;
  student_academic_level?: string;
  student_completeness?: number;
};

type DashboardView = 'listings' | 'post' | 'applicants';

const DURATIONS = [1, 2, 3, 6] as const;
const ORG_TYPES = ['university', 'company', 'ngo', 'government', 'other'] as const;

// ── Helper ────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: VerificationStatus }) {
  if (status === 'verified') return (
    <span className="text-xs px-2.5 py-1 rounded-full font-bold" style={{ background: 'rgba(34,197,94,0.15)', border: '0.5px solid rgba(34,197,94,0.4)', color: '#4ADE80' }}>✓ Verified</span>
  );
  if (status === 'rejected') return (
    <span className="text-xs px-2.5 py-1 rounded-full font-bold" style={{ background: 'rgba(239,68,68,0.15)', border: '0.5px solid rgba(239,68,68,0.4)', color: '#F87171' }}>✕ Rejected</span>
  );
  return (
    <span className="text-xs px-2.5 py-1 rounded-full font-bold" style={{ background: 'rgba(234,179,8,0.12)', border: '0.5px solid rgba(234,179,8,0.4)', color: '#FACC15' }}>⏳ Pending</span>
  );
}

function MatchBar({ score }: { score: number }) {
  const colour = score >= 80 ? '#4ADE80' : score >= 60 ? '#C9993A' : '#F87171';
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }}>
        <div className="h-1.5 rounded-full transition-all" style={{ width: `${score}%`, background: colour }} />
      </div>
      <span className="text-xs font-bold" style={{ color: colour }}>{score}%</span>
    </div>
  );
}

// ── Post form default ─────────────────────────────────────────────────────────

const emptyForm = {
  title: '',
  description: '',
  required_saathi_slug: '',
  required_academic_level: '',
  required_flame_stage: 'spark',
  required_min_profile_pct: 60,
  skills_needed_raw: '',
  stipend_amount: '',
  is_remote: false,
  city: '',
  seats_available: 1,
  deadline_date: '',
  duration_months: 3,
};
type PostForm = typeof emptyForm;

// ── Main ──────────────────────────────────────────────────────────────────────

export default function InstitutionPage() {
  const router = useRouter();
  const { profile } = useAuthStore();

  const [inst, setInst] = useState<InstitutionProfile | null>(null);
  const [listings, setListings] = useState<Listing[]>([]);
  const [view, setView] = useState<DashboardView>('listings');
  const [selectedListing, setSelectedListing] = useState<string | null>(null);
  const [applicants, setApplicants] = useState<Applicant[]>([]);
  const [form, setForm] = useState<PostForm>(emptyForm);
  const [loading, setLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  const [posted, setPosted] = useState(false);

  // Stats derived from listings
  const totalApplicants = listings.reduce((s, l) => s + l.total_applicants, 0);
  const activeListings = listings.filter((l) => l.status === 'active').length;

  useEffect(() => {
    if (!profile) return;
    const supabase = createClient();

    async function load() {
      setLoading(true);
      const [{ data: instData }, { data: listData }] = await Promise.all([
        supabase.from('institution_profiles').select('*').eq('user_id', profile!.id).maybeSingle(),
        supabase.from('intern_listings').select('*').eq('institution_user_id', profile!.id).order('created_at', { ascending: false }),
      ]);
      setInst(instData as InstitutionProfile | null);
      setListings((listData ?? []) as Listing[]);
      setLoading(false);
    }

    load();
  }, [profile]);

  useEffect(() => {
    if (!selectedListing || view !== 'applicants') return;
    const supabase = createClient();

    async function loadApplicants() {
      const { data } = await supabase
        .from('intern_matches')
        .select(`
          id, listing_id, student_user_id, match_score, score_breakdown, created_at
        `)
        .eq('listing_id', selectedListing)
        .order('match_score', { ascending: false })
        .limit(50);

      if (!data?.length) { setApplicants([]); return; }

      // Fetch profile details for each student
      const ids = data.map((m) => m.student_user_id);
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, full_name, city, academic_level, profile_completeness_pct')
        .in('id', ids);

      const profileMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));

      const enriched: Applicant[] = data.map((m) => {
        const p = profileMap[m.student_user_id];
        return {
          ...m,
          score_breakdown: (m.score_breakdown as Record<string, number>) ?? {},
          student_name: p?.full_name ?? 'Student',
          student_city: p?.city ?? '',
          student_academic_level: p?.academic_level ?? '',
          student_completeness: p?.profile_completeness_pct ?? 0,
        };
      });

      setApplicants(enriched);
    }

    loadApplicants();
  }, [selectedListing, view]);

  async function postListing() {
    if (!profile || !form.title.trim() || !form.description.trim()) return;
    setPosting(true);
    const supabase = createClient();

    const { data: listing } = await supabase.from('intern_listings').insert({
      institution_user_id: profile.id,
      institution_id: inst?.id ?? null,
      title: form.title.trim(),
      description: form.description.trim(),
      required_saathi_slug: form.required_saathi_slug || null,
      required_academic_level: form.required_academic_level || null,
      required_flame_stage: form.required_flame_stage,
      required_min_profile_pct: form.required_min_profile_pct,
      skills_needed: form.skills_needed_raw.split(',').map((s) => s.trim()).filter(Boolean),
      stipend_amount: form.stipend_amount ? parseInt(form.stipend_amount) : null,
      stipend_currency: 'INR',
      is_remote: form.is_remote,
      seats_available: form.seats_available,
      application_deadline: form.deadline_date || null,
      duration_months: form.duration_months,
      status: 'active',
    }).select().maybeSingle();

    // Trigger matching engine
    if (listing?.id) {
      fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/match-interns`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
        },
        body: JSON.stringify({ listing_id: listing.id }),
      }).catch(() => {}); // fire-and-forget
    }

    setPosting(false);
    setPosted(true);
    setForm(emptyForm);
    // Reload listings
    const { data: updated } = await supabase.from('intern_listings')
      .select('*').eq('user_id', profile.id).order('created_at', { ascending: false });
    setListings((updated ?? []) as Listing[]);
    setTimeout(() => { setPosted(false); setView('listings'); }, 2000);
  }

  const setF = <K extends keyof PostForm>(key: K, val: PostForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: '#060F1D' }}>
        <div className="w-10 h-10 rounded-full border-2 border-white/10 animate-spin" style={{ borderTopColor: '#C9993A' }} />
      </main>
    );
  }

  return (
    <main className="min-h-screen" style={{ background: 'linear-gradient(180deg, #060F1D 0%, #0B1F3A 60%, #060F1D 100%)' }}>
      {/* Top nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <span className="font-playfair text-xl font-bold" style={{ color: '#C9993A' }}>EdUsaathiAI</span>
        <button
          onClick={async () => {
            const sb = createClient();
            await sb.auth.signOut();
            router.push('/login');
          }}
          className="text-xs px-3 py-1.5 rounded-lg"
          style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}
        >
          Sign out
        </button>
      </nav>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start justify-between gap-4 flex-wrap mb-6"
        >
          <div>
            <p className="text-xs font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {inst?.org_type ? inst.org_type.charAt(0).toUpperCase() + inst.org_type.slice(1) : 'Institution'} · {inst?.city ?? ''}
            </p>
            <h1 className="font-playfair text-3xl font-bold text-white mb-2">
              {inst?.org_name ?? 'Your Organisation'}
            </h1>
            <StatusBadge status={inst?.verification_status ?? 'pending'} />
          </div>

          <button
            onClick={() => setView('post')}
            className="px-5 py-3 rounded-xl text-sm font-bold transition-all"
            style={{ background: '#C9993A', color: '#060F1D' }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#E5B86A')}
            onMouseLeave={(e) => (e.currentTarget.style.background = '#C9993A')}
          >
            + Post Internship
          </button>
        </motion.div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Active Listings', value: activeListings },
            { label: 'Total Applicants', value: totalApplicants },
            { label: 'Total Listings', value: listings.length },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-2xl p-4 text-center"
              style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.07)' }}>
              <p className="font-playfair text-3xl font-bold text-white">{value}</p>
              <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>{label}</p>
            </div>
          ))}
        </div>

        {/* LISTINGS VIEW */}
        {view === 'listings' && (
          <div>
            <h2 className="font-playfair text-xl text-white mb-4">Active Listings</h2>
            {listings.length === 0 ? (
              <div className="text-center py-20">
                <p className="font-playfair text-2xl text-white/30 mb-3">No listings yet</p>
                <p className="text-sm text-white/20 mb-6">Post your first internship to start matching students.</p>
                <button
                  onClick={() => setView('post')}
                  className="px-6 py-3 rounded-xl text-sm font-bold"
                  style={{ background: '#C9993A', color: '#060F1D' }}
                >
                  Post Now →
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {listings.map((l) => (
                  <div
                    key={l.id}
                    className="rounded-2xl p-5"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.08)' }}
                  >
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1.5">
                          <h3 className="text-white font-semibold">{l.title}</h3>
                          {l.required_saathi_slug && (
                            <span className="text-xs px-2 py-0.5 rounded-full font-medium"
                              style={{ background: 'rgba(201,153,58,0.12)', color: '#E5B86A' }}>
                              {l.required_saathi_slug}
                            </span>
                          )}
                        </div>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                          {l.total_applicants} applicants · {l.seats_available} seats ·{' '}
                          {l.is_remote ? 'Remote' : 'On-site'}
                          {l.stipend_amount ? ` · ₹${l.stipend_amount}/mo` : ' · Unpaid'}
                        </p>
                        {l.application_deadline && (
                          <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
                            Deadline: {new Date(l.application_deadline).toLocaleDateString('en-IN')}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => { setSelectedListing(l.id); setView('applicants'); }}
                          className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                          style={{ background: 'rgba(201,153,58,0.15)', color: '#E5B86A' }}
                        >
                          View Applicants
                        </button>
                        <span className="text-xs px-2.5 py-1 rounded-full"
                          style={{
                            background: l.status === 'active' ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)',
                            color: l.status === 'active' ? '#4ADE80' : 'rgba(255,255,255,0.3)',
                          }}>
                          {l.status}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* POST VIEW */}
        {view === 'post' && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => setView('listings')}
                className="text-sm transition-colors"
                style={{ color: 'rgba(255,255,255,0.35)' }}
              >
                ← Back
              </button>
              <h2 className="font-playfair text-xl text-white">Post Internship</h2>
            </div>

            <AnimatePresence>
              {posted && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mb-4 p-4 rounded-xl text-sm"
                  style={{ background: 'rgba(34,197,94,0.1)', border: '0.5px solid rgba(34,197,94,0.3)', color: '#4ADE80' }}
                >
                  ✓ Posted! Matching engine running — top students will be notified.
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-4 max-w-2xl">
              {/* Title */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Title <span style={{ color: '#C9993A' }}>*</span></label>
                <input
                  value={form.title}
                  onChange={(e) => setF('title', e.target.value)}
                  placeholder="e.g. Research Intern — Fluid Mechanics"
                  className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)' }}
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Description <span style={{ color: '#C9993A' }}>*</span></label>
                <textarea
                  value={form.description}
                  onChange={(e) => setF('description', e.target.value)}
                  placeholder="What will the intern work on? What can they expect?"
                  rows={4}
                  maxLength={500}
                  className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none resize-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)' }}
                />
                <p className="text-xs mt-1 text-right" style={{ color: 'rgba(255,255,255,0.25)' }}>{form.description.length}/500</p>
              </div>

              {/* Saathi */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Subject Area (Saathi)</label>
                <select
                  value={form.required_saathi_slug}
                  onChange={(e) => setF('required_saathi_slug', e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none appearance-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)', color: form.required_saathi_slug ? '#fff' : 'rgba(255,255,255,0.35)' }}
                >
                  <option value="">Any subject</option>
                  {SAATHIS.map((s) => <option key={s.id} value={s.id} style={{ background: '#0B1F3A' }}>{s.name}</option>)}
                </select>
              </div>

              {/* Academic level */}
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>Academic level required</label>
                <div className="flex flex-wrap gap-2">
                  {['bachelor', 'masters', 'phd', 'any'].map((lvl) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setF('required_academic_level', lvl === 'any' ? '' : lvl)}
                      className="rounded-full px-4 py-2 text-sm font-medium transition-all"
                      style={{
                        background: (form.required_academic_level === lvl || (lvl === 'any' && !form.required_academic_level)) ? '#C9993A' : 'rgba(255,255,255,0.05)',
                        border: `0.5px solid ${(form.required_academic_level === lvl || (lvl === 'any' && !form.required_academic_level)) ? '#C9993A' : 'rgba(255,255,255,0.1)'}`,
                        color: (form.required_academic_level === lvl || (lvl === 'any' && !form.required_academic_level)) ? '#060F1D' : 'rgba(255,255,255,0.6)',
                      }}
                    >
                      {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Min profile completeness */}
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Min profile completeness: <span style={{ color: '#E5B86A' }}>{form.required_min_profile_pct}%</span>
                </label>
                <input
                  type="range" min={40} max={90} step={5}
                  value={form.required_min_profile_pct}
                  onChange={(e) => setF('required_min_profile_pct', parseInt(e.target.value))}
                  className="w-full"
                />
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>Students below this threshold won&apos;t see your listing.</p>
              </div>

              {/* Skills */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Skills needed (comma-separated)</label>
                <input
                  value={form.skills_needed_raw}
                  onChange={(e) => setF('skills_needed_raw', e.target.value)}
                  placeholder="e.g. Python, Research writing, Data analysis"
                  className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)' }}
                />
              </div>

              {/* Stipend */}
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Stipend (₹/mo)</label>
                  <input
                    type="number" min="0"
                    value={form.stipend_amount}
                    onChange={(e) => setF('stipend_amount', e.target.value)}
                    placeholder="Leave blank = unpaid"
                    className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)' }}
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Seats available</label>
                  <input
                    type="number" min="1"
                    value={form.seats_available}
                    onChange={(e) => setF('seats_available', parseInt(e.target.value) || 1)}
                    className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)' }}
                  />
                </div>
              </div>

              {/* Duration + Remote */}
              <div className="flex gap-3 flex-wrap">
                <div>
                  <label className="block text-xs font-medium mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>Duration</label>
                  <div className="flex gap-2">
                    {DURATIONS.map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setF('duration_months', d)}
                        className="px-3 py-2 rounded-lg text-sm transition-all"
                        style={{
                          background: form.duration_months === d ? 'rgba(201,153,58,0.2)' : 'rgba(255,255,255,0.05)',
                          border: `0.5px solid ${form.duration_months === d ? '#C9993A' : 'rgba(255,255,255,0.1)'}`,
                          color: form.duration_months === d ? '#E5B86A' : 'rgba(255,255,255,0.6)',
                        }}
                      >
                        {d}mo
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>Location</label>
                  <button
                    type="button"
                    onClick={() => setF('is_remote', !form.is_remote)}
                    className="flex items-center gap-2 text-sm"
                    style={{ color: form.is_remote ? '#4ADE80' : 'rgba(255,255,255,0.4)' }}
                  >
                    <span className="w-10 h-5 rounded-full transition-all relative flex items-center"
                      style={{ background: form.is_remote ? '#4ADE80' : 'rgba(255,255,255,0.1)' }}>
                      <span className="w-4 h-4 rounded-full bg-white absolute transition-all"
                        style={{ left: form.is_remote ? '22px' : '2px' }} />
                    </span>
                    Remote
                  </button>
                </div>
              </div>

              {/* Deadline */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Application deadline</label>
                <input
                  type="date"
                  value={form.deadline_date}
                  onChange={(e) => setF('deadline_date', e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)' }}
                />
              </div>

              {/* Submit */}
              <button
                onClick={postListing}
                disabled={!form.title.trim() || !form.description.trim() || posting}
                className="w-full py-4 rounded-xl text-base font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: '#C9993A', color: '#060F1D' }}
              >
                {posting ? 'Posting…' : 'Find Matching Students →'}
              </button>
            </div>
          </div>
        )}

        {/* APPLICANTS VIEW */}
        {view === 'applicants' && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <button
                onClick={() => { setView('listings'); setSelectedListing(null); }}
                className="text-sm transition-colors"
                style={{ color: 'rgba(255,255,255,0.35)' }}
              >
                ← Listings
              </button>
              <h2 className="font-playfair text-xl text-white">Applicants</h2>
              <span className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>({applicants.length} matched)</span>
            </div>

            {applicants.length === 0 ? (
              <div className="text-center py-20">
                <p className="font-playfair text-xl text-white/30">No applicants yet</p>
                <p className="text-sm text-white/20 mt-2">Matching runs after you post. Check back shortly.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {applicants.map((a) => (
                  <div
                    key={a.id}
                    className="rounded-2xl p-5"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.08)' }}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div>
                        <p className="text-white font-semibold">{a.student_name}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                          {a.student_academic_level} · {a.student_city}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>Profile {a.student_completeness}% complete</p>
                      </div>
                    </div>
                    <MatchBar score={a.match_score} />
                    {Object.keys(a.score_breakdown).length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2">
                        {Object.entries(a.score_breakdown).map(([k, v]) => (
                          <span key={k} className="text-xs px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>
                            {k.replace(/_/g, ' ')}: +{v}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
