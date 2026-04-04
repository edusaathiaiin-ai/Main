'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { SAATHIS } from '@/constants/saathis';

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

type DashboardView = 'listings' | 'post' | 'applicants' | 'intern_finder' | 'intern_finder_post' | 'intern_finder_apps';

// ── Intern Finder types ───────────────────────────────────────────────────────

type InternPosting = {
  id: string;
  title: string;
  description: string;
  responsibilities: string | null;
  requirements: string | null;
  vertical_id: string | null;
  min_depth: number;
  min_academic_level: string;
  preferred_subjects: string[];
  duration_months: number | null;
  stipend_monthly: number | null;
  is_paid: boolean;
  offers_coauthorship: boolean;
  offers_certificate: boolean;
  location: string | null;
  is_remote: boolean;
  work_mode: string;
  total_seats: number;
  seats_filled: number;
  application_deadline: string | null;
  status: string;
  company_name: string | null;
  industry: string | null;
  listing_plan: string;
  total_applications: number;
  created_at: string;
};

type InternApplicant = {
  id: string;
  posting_id: string;
  student_id: string;
  cover_note: string | null;
  research_statement: string | null;
  match_score: number;
  status: string;
  soul_snapshot: Record<string, unknown> | null;
  created_at: string;
  student_name?: string;
  student_city?: string;
  student_academic_level?: string;
  soul_depth?: number;
  soul_topics?: string[];
  soul_research_area?: string | null;
};

const WORK_MODES = ['onsite', 'remote', 'hybrid'] as const;
const LISTING_PLANS = [
  { id: 'basic', label: 'Basic', price: '₹999', desc: 'Standard listing, manual browsing' },
  { id: 'featured', label: 'Featured ★', price: '₹2,999', desc: 'Top placement + top-10 matches delivered to your inbox', recommended: true },
  { id: 'corporate', label: 'Corporate', price: '₹4,999/mo', desc: 'Unlimited postings + priority support' },
] as const;

const DURATIONS = [1, 2, 3, 6] as const;

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

  // ── Intern Finder state ──────────────────────────────────────────────────────
  const [ifPostings, setIfPostings] = useState<InternPosting[]>([]);
  const [ifApplicants, setIfApplicants] = useState<InternApplicant[]>([]);
  const [ifSelectedPosting, setIfSelectedPosting] = useState<InternPosting | null>(null);
  const [ifLoadingApps, setIfLoadingApps] = useState(false);
  const [ifPosting, setIfPosting] = useState(false);
  const [ifPosted, setIfPosted] = useState(false);
  const [ifForm, setIfForm] = useState({
    title: '', description: '', responsibilities: '', requirements: '',
    vertical_id: '', min_depth: 30, min_academic_level: 'any',
    preferred_subjects_raw: '', duration_months: 3, stipend_monthly: '',
    is_paid: false, offers_coauthorship: false, offers_certificate: true,
    location: '', is_remote: false, work_mode: 'onsite' as typeof WORK_MODES[number],
    total_seats: 1, application_deadline: '', company_name: '', industry: '',
    listing_plan: 'basic' as 'basic' | 'featured' | 'corporate',
  });

  // Stats derived from listings
  const totalApplicants = listings.reduce((s, l) => s + l.total_applicants, 0);
  const activeListings = listings.filter((l) => l.status === 'active').length;

  // Role guard — institution only
  useEffect(() => {
    if (profile && profile.role !== 'institution') {
      router.replace('/chat');
    }
  }, [profile, router]);

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
    if (view === 'intern_finder' && profile) loadIfPostings();
  }, [view, profile]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // ── Intern Finder helpers ─────────────────────────────────────────────────────

  async function loadIfPostings() {
    if (!profile) return;
    const supabase = createClient();
    const { data } = await supabase
      .from('internship_postings')
      .select('*')
      .eq('posted_by', profile.id)
      .eq('posting_type', 'institution')
      .order('created_at', { ascending: false });
    setIfPostings((data ?? []) as InternPosting[]);
  }

  async function loadIfApplicants(posting: InternPosting) {
    setIfSelectedPosting(posting);
    setView('intern_finder_apps');
    setIfLoadingApps(true);
    const supabase = createClient();
    const { data } = await supabase
      .from('intern_applications')
      .select('id, posting_id, student_id, cover_note, research_statement, match_score, status, soul_snapshot, created_at')
      .eq('posting_id', posting.id)
      .order('match_score', { ascending: false })
      .limit(50);
    if (!data?.length) { setIfApplicants([]); setIfLoadingApps(false); return; }
    const ids = data.map((a) => a.student_id);
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, city, academic_level')
      .in('id', ids);
    const pMap = Object.fromEntries((profiles ?? []).map((p) => [p.id, p]));
    const enriched: InternApplicant[] = data.map((a) => {
      const snap = a.soul_snapshot as Record<string, unknown> | null;
      return {
        ...a,
        student_name: pMap[a.student_id]?.full_name ?? 'Student',
        student_city: pMap[a.student_id]?.city ?? '',
        student_academic_level: pMap[a.student_id]?.academic_level ?? '',
        soul_depth: (snap?.depth as number) ?? 0,
        soul_topics: (snap?.top_topics as string[]) ?? [],
        soul_research_area: (snap?.future_research_area as string) ?? null,
      };
    });
    setIfApplicants(enriched);
    setIfLoadingApps(false);
  }

  async function updateIfAppStatus(appId: string, status: string) {
    const supabase = createClient();
    const { error: appError } = await supabase.from('intern_applications').update({ status }).eq('id', appId);
    if (!appError) {
      setIfApplicants((prev) => prev.map((a) => (a.id === appId ? { ...a, status } : a)));
    }
  }

  async function postIfListing() {
    if (!profile || !ifForm.title.trim() || !ifForm.description.trim()) return;
    setIfPosting(true);
    const supabase = createClient();
    const { error: ifInsertError } = await supabase.from('internship_postings').insert({
      posted_by: profile.id,
      posting_type: 'institution',
      title: ifForm.title.trim(),
      description: ifForm.description.trim(),
      responsibilities: ifForm.responsibilities.trim() || null,
      requirements: ifForm.requirements.trim() || null,
      vertical_id: ifForm.vertical_id || null,
      min_depth: ifForm.min_depth,
      min_academic_level: ifForm.min_academic_level,
      preferred_subjects: ifForm.preferred_subjects_raw.split(',').map((s) => s.trim()).filter(Boolean),
      duration_months: ifForm.duration_months,
      stipend_monthly: ifForm.is_paid && ifForm.stipend_monthly ? parseInt(ifForm.stipend_monthly, 10) : null,
      is_paid: ifForm.is_paid,
      offers_coauthorship: ifForm.offers_coauthorship,
      offers_certificate: ifForm.offers_certificate,
      location: ifForm.location.trim() || null,
      is_remote: ifForm.is_remote,
      work_mode: ifForm.work_mode,
      total_seats: ifForm.total_seats,
      application_deadline: ifForm.application_deadline || null,
      company_name: ifForm.company_name.trim() || (inst?.org_name ?? null),
      industry: ifForm.industry.trim() || null,
      listing_plan: ifForm.listing_plan,
      status: 'open',
    });
    await loadIfPostings();
    setIfPosting(false);
    if (!ifInsertError) setIfPosted(true);
    setIfForm({ title: '', description: '', responsibilities: '', requirements: '', vertical_id: '', min_depth: 30, min_academic_level: 'any', preferred_subjects_raw: '', duration_months: 3, stipend_monthly: '', is_paid: false, offers_coauthorship: false, offers_certificate: true, location: '', is_remote: false, work_mode: 'onsite', total_seats: 1, application_deadline: '', company_name: '', industry: '', listing_plan: 'basic' });
    setTimeout(() => { setIfPosted(false); setView('intern_finder'); }, 2500);
  }

  const setIfF = <K extends keyof typeof ifForm>(key: K, val: typeof ifForm[K]) =>
    setIfForm((prev) => ({ ...prev, [key]: val }));

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

          <div className="flex gap-2">
            <button
              onClick={() => setView(view === 'intern_finder' || view === 'intern_finder_post' || view === 'intern_finder_apps' ? 'listings' : 'intern_finder')}
              className="px-4 py-2.5 rounded-xl text-sm font-bold transition-all"
              style={{
                background: ['intern_finder', 'intern_finder_post', 'intern_finder_apps'].includes(view) ? 'rgba(99,102,241,0.2)' : 'rgba(99,102,241,0.1)',
                color: '#818CF8',
                border: '0.5px solid rgba(99,102,241,0.35)',
              }}
            >
              🎯 Intern Finder
            </button>
            <button
              onClick={() => setView('post')}
              className="px-5 py-3 rounded-xl text-sm font-bold transition-all"
              style={{ background: '#C9993A', color: '#060F1D' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#E5B86A')}
              onMouseLeave={(e) => (e.currentTarget.style.background = '#C9993A')}
            >
              + Post Internship
            </button>
          </div>
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

        {/* ═══ INTERN FINDER — browse new internship_postings system ══════════ */}

        {view === 'intern_finder' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="font-playfair text-xl text-white">Intern Finder</h2>
                <p className="text-xs mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>Soul-matched postings · students sorted by match score</p>
              </div>
              <button
                onClick={() => setView('intern_finder_post')}
                className="px-4 py-2.5 rounded-xl text-sm font-bold"
                style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)', color: '#fff' }}
              >
                + New Posting
              </button>
            </div>

            {ifPostings.length === 0 ? (
              <div className="text-center py-20 rounded-2xl" style={{ background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.06)' }}>
                <p className="text-4xl mb-4">🎯</p>
                <p className="font-playfair text-xl text-white/40 mb-3">No postings yet</p>
                <p className="text-sm text-white/20 mb-6">Post an internship and students will be soul-matched instantly.</p>
                <button onClick={() => setView('intern_finder_post')}
                  className="px-6 py-3 rounded-xl text-sm font-bold"
                  style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)', color: '#fff' }}>
                  Post first internship →
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {ifPostings.map((p) => {
                  const saathi = SAATHIS.find((s) => s.id === p.vertical_id);
                  return (
                    <div key={p.id} className="rounded-2xl p-5"
                      style={{ background: 'rgba(255,255,255,0.03)', border: `0.5px solid ${p.listing_plan === 'featured' ? 'rgba(201,153,58,0.4)' : 'rgba(255,255,255,0.08)'}` }}>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            {p.listing_plan === 'featured' && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                                style={{ background: 'rgba(201,153,58,0.15)', color: '#C9993A' }}>★ Featured</span>
                            )}
                            {saathi && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                                style={{ background: `${saathi.primary}20`, color: saathi.accent }}>
                                {saathi.emoji} {saathi.name}
                              </span>
                            )}
                            <span className="text-[10px] px-2 py-0.5 rounded-full capitalize"
                              style={{ background: p.status === 'open' ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.05)', color: p.status === 'open' ? '#4ADE80' : 'rgba(255,255,255,0.35)' }}>
                              {p.status}
                            </span>
                          </div>
                          <h3 className="font-semibold text-white">{p.title}</h3>
                          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                            {p.total_applications} applied · {p.total_seats} seat{p.total_seats !== 1 ? 's' : ''}
                            {p.is_paid && p.stipend_monthly ? ` · ₹${p.stipend_monthly.toLocaleString('en-IN')}/mo` : ' · Unpaid'}
                            {p.duration_months ? ` · ${p.duration_months}m` : ''}
                          </p>
                        </div>
                        <button
                          onClick={() => loadIfApplicants(p)}
                          className="text-xs px-3 py-1.5 rounded-xl font-semibold shrink-0"
                          style={{ background: 'rgba(99,102,241,0.15)', color: '#818CF8', border: '0.5px solid rgba(99,102,241,0.3)' }}>
                          👥 Applicants →
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ═══ INTERN FINDER — post form ════════════════════════════════════ */}

        {view === 'intern_finder_post' && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setView('intern_finder')} className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>← Back</button>
              <h2 className="font-playfair text-xl text-white">Post New Internship</h2>
            </div>

            {ifPosted && (
              <div className="mb-4 p-4 rounded-xl text-sm"
                style={{ background: 'rgba(34,197,94,0.1)', border: '0.5px solid rgba(34,197,94,0.3)', color: '#4ADE80' }}>
                ✓ Posted! Soul-matching is running. Top students will be notified.
              </div>
            )}

            <div className="space-y-5 max-w-2xl">
              {/* Company name */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Company / Organisation name</label>
                <input value={ifForm.company_name} onChange={(e) => setIfF('company_name', e.target.value)}
                  placeholder={inst?.org_name ?? 'Your company name'}
                  className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)' }} />
              </div>
              {/* Title */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Position title <span style={{ color: '#C9993A' }}>*</span></label>
                <input value={ifForm.title} onChange={(e) => setIfF('title', e.target.value)}
                  placeholder="e.g. Data Science Intern"
                  className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)' }} />
              </div>
              {/* Description */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Description <span style={{ color: '#C9993A' }}>*</span> (max 500 chars)</label>
                <textarea rows={4} value={ifForm.description} onChange={(e) => { if (e.target.value.length <= 500) setIfF('description', e.target.value); }}
                  placeholder="What is the internship about? What can they expect?"
                  className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none resize-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)' }} />
                <p className="text-[10px] text-right mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>{ifForm.description.length}/500</p>
              </div>
              {/* Responsibilities */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Responsibilities (what intern will do)</label>
                <textarea rows={3} value={ifForm.responsibilities} onChange={(e) => setIfF('responsibilities', e.target.value)}
                  placeholder="Daily tasks, projects, meetings..."
                  className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none resize-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)' }} />
              </div>
              {/* Requirements */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Requirements (what they need)</label>
                <textarea rows={2} value={ifForm.requirements} onChange={(e) => setIfF('requirements', e.target.value)}
                  placeholder="Skills, experience, coursework required..."
                  className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none resize-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)' }} />
              </div>
              {/* Subject area */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Subject area (Saathi)</label>
                <select value={ifForm.vertical_id} onChange={(e) => setIfF('vertical_id', e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)', color: ifForm.vertical_id ? '#fff' : 'rgba(255,255,255,0.35)' }}>
                  <option value="">Any subject</option>
                  {SAATHIS.map((s) => <option key={s.id} value={s.id} style={{ background: '#0B1F3A' }}>{s.emoji} {s.name}</option>)}
                </select>
              </div>
              {/* Min depth */}
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Minimum depth calibration: <span style={{ color: '#E5B86A' }}>{ifForm.min_depth}</span>
                </label>
                <input type="range" min={0} max={90} step={5} value={ifForm.min_depth}
                  onChange={(e) => setIfF('min_depth', parseInt(e.target.value))} className="w-full" />
                <p className="text-[10px] mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  Students below this depth won&apos;t see your posting.
                </p>
              </div>
              {/* Academic level */}
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>Academic level</label>
                <div className="flex flex-wrap gap-2">
                  {['any', 'bachelor', 'masters', 'phd'].map((lvl) => (
                    <button key={lvl} type="button" onClick={() => setIfF('min_academic_level', lvl)}
                      className="rounded-full px-4 py-2 text-sm font-medium transition-all"
                      style={{
                        background: ifForm.min_academic_level === lvl ? '#C9993A' : 'rgba(255,255,255,0.05)',
                        color: ifForm.min_academic_level === lvl ? '#060F1D' : 'rgba(255,255,255,0.6)',
                      }}>
                      {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              {/* Preferred subjects */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Preferred subject knowledge (comma-separated)</label>
                <input value={ifForm.preferred_subjects_raw} onChange={(e) => setIfF('preferred_subjects_raw', e.target.value)}
                  placeholder="e.g. Python, Machine Learning, Statistics"
                  className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)' }} />
              </div>
              {/* Logistics row */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Duration (months)</label>
                  <div className="flex gap-2 flex-wrap">
                    {[1, 2, 3, 6].map((d) => (
                      <button key={d} type="button" onClick={() => setIfF('duration_months', d)}
                        className="px-3 py-2 rounded-lg text-sm transition-all"
                        style={{ background: ifForm.duration_months === d ? 'rgba(201,153,58,0.2)' : 'rgba(255,255,255,0.05)', color: ifForm.duration_months === d ? '#E5B86A' : 'rgba(255,255,255,0.6)' }}>
                        {d}mo
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Seats available</label>
                  <input type="number" min={1} value={ifForm.total_seats} onChange={(e) => setIfF('total_seats', parseInt(e.target.value) || 1)}
                    className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)' }} />
                </div>
              </div>
              {/* Stipend */}
              <div>
                <label className="block text-xs font-medium mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>Stipend</label>
                <div className="flex items-center gap-3 mb-2">
                  <button onClick={() => setIfF('is_paid', !ifForm.is_paid)}
                    className="w-10 h-6 rounded-full relative transition-all"
                    style={{ background: ifForm.is_paid ? '#4ADE80' : 'rgba(255,255,255,0.1)' }}>
                    <div className="absolute top-1 w-4 h-4 rounded-full bg-white transition-all"
                      style={{ left: ifForm.is_paid ? '22px' : '2px' }} />
                  </button>
                  <span className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>Paid internship</span>
                </div>
                {ifForm.is_paid && (
                  <input type="number" min={0} value={ifForm.stipend_monthly} onChange={(e) => setIfF('stipend_monthly', e.target.value)}
                    placeholder="Monthly stipend in ₹"
                    className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)' }} />
                )}
              </div>
              {/* Work mode + location */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Work mode</label>
                  <div className="flex flex-wrap gap-2">
                    {WORK_MODES.map((mode) => (
                      <button key={mode} type="button" onClick={() => setIfF('work_mode', mode)}
                        className="px-3 py-2 rounded-lg text-sm capitalize transition-all"
                        style={{ background: ifForm.work_mode === mode ? 'rgba(99,102,241,0.2)' : 'rgba(255,255,255,0.05)', color: ifForm.work_mode === mode ? '#818CF8' : 'rgba(255,255,255,0.5)' }}>
                        {mode}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Location / city</label>
                  <input value={ifForm.location} onChange={(e) => setIfF('location', e.target.value)}
                    placeholder={inst?.city ?? 'City or Remote'}
                    className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)' }} />
                </div>
              </div>
              {/* Deadline */}
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>Application deadline</label>
                <input type="date" value={ifForm.application_deadline} onChange={(e) => setIfF('application_deadline', e.target.value)}
                  className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none"
                  style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)' }} />
              </div>
              {/* Listing plan */}
              <div>
                <label className="block text-xs font-medium mb-3" style={{ color: 'rgba(255,255,255,0.5)' }}>Listing plan</label>
                <div className="space-y-2">
                  {LISTING_PLANS.map((plan) => (
                    <button key={plan.id} type="button" onClick={() => setIfF('listing_plan', plan.id as 'basic' | 'featured' | 'corporate')}
                      className="w-full flex items-center justify-between p-4 rounded-xl text-left transition-all"
                      style={{
                        background: ifForm.listing_plan === plan.id ? 'rgba(201,153,58,0.1)' : 'rgba(255,255,255,0.03)',
                        border: `0.5px solid ${ifForm.listing_plan === plan.id ? 'rgba(201,153,58,0.45)' : 'rgba(255,255,255,0.08)'}`,
                      }}>
                      <div>
                        <p className="text-sm font-bold" style={{ color: ifForm.listing_plan === plan.id ? '#E5B86A' : '#fff' }}>
                          {plan.label}
                          {'recommended' in plan && plan.recommended && (
                            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full"
                              style={{ background: 'rgba(201,153,58,0.2)', color: '#C9993A' }}>Recommended</span>
                          )}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>{plan.desc}</p>
                      </div>
                      <span className="text-sm font-bold shrink-0" style={{ color: '#C9993A' }}>{plan.price}</span>
                    </button>
                  ))}
                </div>
              </div>
              {/* Submit */}
              <button onClick={postIfListing} disabled={!ifForm.title.trim() || !ifForm.description.trim() || ifPosting}
                className="w-full py-4 rounded-xl text-base font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)', color: '#fff' }}>
                {ifPosting ? 'Publishing…' : 'Publish & Find Students →'}
              </button>
            </div>
          </div>
        )}

        {/* ═══ INTERN FINDER — applicants (soul-ranked) ════════════════════ */}

        {view === 'intern_finder_apps' && ifSelectedPosting && (
          <div>
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => { setView('intern_finder'); setIfSelectedPosting(null); }}
                className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>← Postings</button>
              <h2 className="font-playfair text-xl text-white">{ifSelectedPosting.title}</h2>
              <span className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
                ({ifApplicants.length} applicant{ifApplicants.length !== 1 ? 's' : ''})
              </span>
            </div>

            {ifLoadingApps ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => <div key={i} className="rounded-2xl animate-pulse" style={{ background: 'rgba(255,255,255,0.03)', height: '120px' }} />)}
              </div>
            ) : ifApplicants.length === 0 ? (
              <div className="text-center py-20 rounded-2xl" style={{ background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.06)' }}>
                <p className="font-playfair text-xl text-white/30">No applications yet</p>
                <p className="text-sm text-white/20 mt-2">Students will appear here sorted by soul match score.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {ifApplicants.map((a) => (
                  <div key={a.id} className="rounded-2xl p-5"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.08)' }}>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex-1">
                        <p className="font-semibold text-white">{a.student_name}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                          {a.student_academic_level} · {a.student_city}
                          {' · '}Applied {new Date(a.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </p>
                        {a.soul_research_area && (
                          <p className="text-xs mt-1 italic" style={{ color: '#C084FC' }}>
                            Research dream: {a.soul_research_area}
                          </p>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-lg font-bold"
                          style={{ color: a.match_score >= 80 ? '#E5B86A' : a.match_score >= 60 ? '#4ADE80' : '#F87171' }}>
                          {a.match_score}%
                        </p>
                        <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>soul match</p>
                      </div>
                    </div>
                    <MatchBar score={a.match_score} />
                    {a.soul_topics && a.soul_topics.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-2 mb-3">
                        {a.soul_topics.slice(0, 4).map((t) => (
                          <span key={t} className="text-[10px] px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>
                            {t}
                          </span>
                        ))}
                        {a.soul_depth && a.soul_depth > 0 && (
                          <span className="text-[10px] px-2 py-0.5 rounded-full"
                            style={{ background: 'rgba(201,153,58,0.1)', color: '#E5B86A' }}>
                            Depth {a.soul_depth}
                          </span>
                        )}
                      </div>
                    )}
                    {a.cover_note && (
                      <p className="text-xs italic mb-3 px-3 py-2 rounded-xl"
                        style={{ background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.55)' }}>
                        &ldquo;{a.cover_note}&rdquo;
                      </p>
                    )}
                    {a.status === 'applied' && (
                      <div className="flex gap-2">
                        <button onClick={() => updateIfAppStatus(a.id, 'shortlisted')}
                          className="flex-1 py-2 rounded-xl text-xs font-bold"
                          style={{ background: 'rgba(14,165,233,0.15)', color: '#38BDF8', border: '0.5px solid rgba(14,165,233,0.35)' }}>
                          ⭐ Shortlist
                        </button>
                        <button onClick={() => updateIfAppStatus(a.id, 'selected')}
                          className="flex-1 py-2 rounded-xl text-xs font-bold"
                          style={{ background: 'rgba(34,197,94,0.12)', color: '#4ADE80', border: '0.5px solid rgba(34,197,94,0.35)' }}>
                          ✓ Select
                        </button>
                        <button onClick={() => updateIfAppStatus(a.id, 'rejected')}
                          className="flex-1 py-2 rounded-xl text-xs font-bold"
                          style={{ background: 'rgba(239,68,68,0.1)', color: '#F87171', border: '0.5px solid rgba(239,68,68,0.25)' }}>
                          ✕ Decline
                        </button>
                      </div>
                    )}
                    {a.status !== 'applied' && (
                      <span className="text-xs font-bold px-3 py-1.5 rounded-full capitalize"
                        style={{
                          background: a.status === 'selected' ? 'rgba(34,197,94,0.1)' : a.status === 'shortlisted' ? 'rgba(14,165,233,0.1)' : 'rgba(239,68,68,0.08)',
                          color: a.status === 'selected' ? '#4ADE80' : a.status === 'shortlisted' ? '#38BDF8' : '#F87171',
                        }}>
                        {a.status}
                      </span>
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
