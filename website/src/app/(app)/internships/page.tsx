'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { SAATHIS } from '@/constants/saathis';
import {
  computeMatchScore,
  buildSoulSnapshot,
  type PostingForMatch,
  type SoulForMatch,
} from '@/lib/intern-matching';

// ── Types ─────────────────────────────────────────────────────────────────────

type Posting = {
  id: string;
  posted_by: string;
  posting_type: 'institution' | 'research';
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
  company_logo_url: string | null;
  industry: string | null;
  research_area: string | null;
  project_title: string | null;
  expected_outcome: string | null;
  listing_plan: string;
  total_applications: number;
  created_at: string;
  expires_at: string;
  // enriched
  my_application?: { status: string } | null;
  match_score?: number;
  poster?: { full_name: string | null };
  faculty_profile?: { institution_name: string; designation: string | null } | null;
};

type MyApplication = {
  id: string;
  posting_id: string;
  status: string;
  match_score: number;
  created_at: string;
  cover_note: string | null;
  research_statement: string | null;
  posting?: Posting;
};

type ActiveTab = 'company' | 'research';

// ── Helpers ───────────────────────────────────────────────────────────────────

function MatchBadge({ score }: { score: number }) {
  const [bg, color] =
    score >= 80 ? ['rgba(201,153,58,0.15)', '#E5B86A'] :
    score >= 60 ? ['rgba(34,197,94,0.12)', '#4ADE80'] :
                  ['rgba(255,255,255,0.06)', 'rgba(255,255,255,0.4)'];
  return (
    <span className="text-xs font-bold px-2.5 py-1 rounded-full"
      style={{ background: bg, border: `0.5px solid ${color}40`, color }}>
      {score}% match
    </span>
  );
}

function ApplicationStatusBadge({ status }: { status: string }) {
  const map: Record<string, { color: string; label: string }> = {
    applied:      { color: '#FACC15', label: '⏳ Applied' },
    shortlisted:  { color: '#38BDF8', label: '⭐ Shortlisted' },
    interviewing: { color: '#C084FC', label: '🎙 Interviewing' },
    selected:     { color: '#4ADE80', label: '🎉 Selected' },
    rejected:     { color: '#F87171', label: '✕ Not selected' },
    withdrawn:    { color: 'rgba(255,255,255,0.35)', label: 'Withdrawn' },
  };
  const s = map[status] ?? map.applied;
  return (
    <span className="text-xs font-bold px-2.5 py-1 rounded-full"
      style={{ background: `${s.color}18`, border: `0.5px solid ${s.color}50`, color: s.color }}>
      {s.label}
    </span>
  );
}

function DeadlineTag({ deadline }: { deadline: string | null }) {
  if (!deadline) return null;
  const days = Math.ceil((new Date(deadline).getTime() - Date.now()) / 86400000);
  if (days < 0) return <span className="text-[10px] font-semibold" style={{ color: '#F87171' }}>Deadline passed</span>;
  const color = days <= 3 ? '#F87171' : days <= 7 ? '#FACC15' : 'rgba(255,255,255,0.35)';
  return <span className="text-[10px] font-semibold" style={{ color }}>⏰ {days}d left</span>;
}

// ── Company Apply Modal ───────────────────────────────────────────────────────

function CompanyApplyModal({
  posting,
  onClose,
  onSuccess,
}: {
  posting: Posting;
  onClose: () => void;
  onSuccess: (postingId: string) => void;
}) {
  const { profile } = useAuthStore();
  const [coverNote, setCoverNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const MAX = 200;

  async function submit() {
    if (!profile) return;
    setSubmitting(true);
    setError(null);
    const supabase = createClient();
    const { data: soul } = await supabase
      .from('student_soul')
      .select('depth_calibration, future_research_area, top_topics, enrolled_subjects')
      .eq('user_id', profile.id)
      .maybeSingle();

    const soulData: SoulForMatch = {
      depth_calibration: soul?.depth_calibration ?? 0,
      future_research_area: soul?.future_research_area ?? null,
      top_topics: soul?.top_topics ?? [],
      enrolled_subjects: soul?.enrolled_subjects ?? [],
    };
    const postingData: PostingForMatch = {
      posting_type: posting.posting_type,
      vertical_id: posting.vertical_id,
      min_depth: posting.min_depth,
      min_academic_level: posting.min_academic_level,
      preferred_subjects: posting.preferred_subjects,
      research_area: posting.research_area,
    };
    const score = computeMatchScore(postingData, soulData, profile);

    const { error: err } = await supabase.from('intern_applications').insert({
      posting_id: posting.id,
      student_id: profile.id,
      cover_note: coverNote.trim() || null,
      soul_snapshot: buildSoulSnapshot(soulData),
      match_score: score,
      status: 'applied',
    });
    setSubmitting(false);
    if (err) {
      setError(err.code === '23505' ? 'You have already applied to this position.' : 'Something went wrong. Please try again.');
    } else {
      onSuccess(posting.id);
    }
  }

  const saathi = SAATHIS.find((s) => s.id === posting.vertical_id);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
        className="w-full max-w-md rounded-2xl p-6"
        style={{ background: '#0B1F3A', border: '0.5px solid rgba(255,255,255,0.1)' }}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-playfair text-lg font-bold text-white">{posting.title}</h3>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {posting.company_name ?? saathi?.name ?? 'Organisation'}
              {posting.location ? ` · ${posting.location}` : ''}
            </p>
          </div>
          <button onClick={onClose} className="text-2xl leading-none" style={{ color: 'rgba(255,255,255,0.3)' }}>×</button>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Cover note <span style={{ color: 'rgba(255,255,255,0.3)' }}>(optional, max {MAX} chars)</span>
          </label>
          <textarea
            rows={4}
            value={coverNote}
            onChange={(e) => { if (e.target.value.length <= MAX) setCoverNote(e.target.value); }}
            placeholder="Why are you a great fit? What can you contribute?"
            className="w-full rounded-xl px-4 py-3 text-sm resize-none outline-none"
            style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.12)', color: '#fff' }}
          />
          <p className="text-[10px] text-right mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>
            {MAX - coverNote.length} remaining
          </p>
        </div>

        {error && <p className="text-xs mb-3 px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#F87171', border: '0.5px solid rgba(239,68,68,0.25)' }}>{error}</p>}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', border: '0.5px solid rgba(255,255,255,0.1)' }}>
            Cancel
          </button>
          <button onClick={submit} disabled={submitting}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold"
            style={{ background: submitting ? 'rgba(99,102,241,0.2)' : 'linear-gradient(135deg, #6366F1, #4F46E5)', color: submitting ? 'rgba(255,255,255,0.3)' : '#fff', cursor: submitting ? 'not-allowed' : 'pointer' }}>
            {submitting ? 'Submitting…' : 'Apply Now →'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Research Apply Modal ──────────────────────────────────────────────────────

function ResearchApplyModal({
  posting,
  onClose,
  onSuccess,
}: {
  posting: Posting;
  onClose: () => void;
  onSuccess: (postingId: string) => void;
}) {
  const { profile } = useAuthStore();
  const [statement, setStatement] = useState('');
  const [whyProject, setWhyProject] = useState('');
  const [priorExp, setPriorExp] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!profile || statement.trim().length < 30) {
      setError('Please write at least 30 characters for your research statement.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const supabase = createClient();
    const { data: soul } = await supabase
      .from('student_soul')
      .select('depth_calibration, future_research_area, top_topics, enrolled_subjects')
      .eq('user_id', profile.id)
      .maybeSingle();

    const soulData: SoulForMatch = {
      depth_calibration: soul?.depth_calibration ?? 0,
      future_research_area: soul?.future_research_area ?? null,
      top_topics: soul?.top_topics ?? [],
      enrolled_subjects: soul?.enrolled_subjects ?? [],
    };
    const postingData: PostingForMatch = {
      posting_type: 'research',
      vertical_id: posting.vertical_id,
      min_depth: posting.min_depth,
      min_academic_level: posting.min_academic_level,
      preferred_subjects: posting.preferred_subjects,
      research_area: posting.research_area,
    };
    const score = computeMatchScore(postingData, soulData, profile);

    const { error: err } = await supabase.from('intern_applications').insert({
      posting_id: posting.id,
      student_id: profile.id,
      research_statement: statement.trim(),
      why_this_project: whyProject.trim() || null,
      prior_experience: priorExp.trim() || null,
      soul_snapshot: buildSoulSnapshot(soulData),
      match_score: score,
      status: 'applied',
    });
    setSubmitting(false);
    if (err) {
      setError(err.code === '23505' ? 'You have already applied to this position.' : 'Something went wrong. Please try again.');
    } else {
      onSuccess(posting.id);
    }
  }

  const posterName = posting.poster?.full_name ?? 'the faculty';

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}>
      <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
        className="w-full max-w-lg rounded-2xl p-6 overflow-y-auto max-h-[90vh]"
        style={{ background: '#0B1F3A', border: '0.5px solid rgba(255,255,255,0.1)' }}>
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-playfair text-lg font-bold text-white">{posting.project_title ?? posting.title}</h3>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {posting.faculty_profile?.designation ? `${posting.faculty_profile.designation} · ` : ''}
              {posting.faculty_profile?.institution_name ?? 'Research Position'}
            </p>
          </div>
          <button onClick={onClose} className="text-2xl leading-none ml-4" style={{ color: 'rgba(255,255,255,0.3)' }}>×</button>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Research statement <span style={{ color: '#F87171' }}>*</span>{' '}
              <span style={{ color: 'rgba(255,255,255,0.3)' }}>(max 300 chars)</span>
            </label>
            <textarea rows={4} value={statement}
              onChange={(e) => { if (e.target.value.length <= 300) setStatement(e.target.value); }}
              placeholder="What is your background in this research area? What methods or tools do you bring?"
              className="w-full rounded-xl px-4 py-3 text-sm resize-none outline-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.12)', color: '#fff' }} />
            <p className="text-[10px] text-right mt-1" style={{ color: 'rgba(255,255,255,0.25)' }}>{300 - statement.length} remaining</p>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Why this project? <span style={{ color: 'rgba(255,255,255,0.3)' }}>(max 200 chars)</span>
            </label>
            <textarea rows={3} value={whyProject}
              onChange={(e) => { if (e.target.value.length <= 200) setWhyProject(e.target.value); }}
              placeholder="Why does this specific research excite you?"
              className="w-full rounded-xl px-4 py-3 text-sm resize-none outline-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.12)', color: '#fff' }} />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Prior experience <span style={{ color: 'rgba(255,255,255,0.3)' }}>(optional)</span>
            </label>
            <textarea rows={2} value={priorExp}
              onChange={(e) => setPriorExp(e.target.value)}
              placeholder="Any relevant projects, papers, or coursework"
              className="w-full rounded-xl px-4 py-3 text-sm resize-none outline-none"
              style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.12)', color: '#fff' }} />
          </div>
        </div>

        {error && <p className="text-xs mt-3 px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#F87171', border: '0.5px solid rgba(239,68,68,0.25)' }}>{error}</p>}

        <p className="text-xs mt-4 mb-4 px-3 py-2.5 rounded-xl" style={{ background: 'rgba(168,85,247,0.08)', color: 'rgba(255,255,255,0.5)', border: '0.5px solid rgba(168,85,247,0.2)' }}>
          After submitting, {posterName} will see your soul profile including depth, research dream, and top topics.
          You&apos;ll be notified when they respond.
        </p>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-xl text-sm font-medium"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', border: '0.5px solid rgba(255,255,255,0.1)' }}>
            Cancel
          </button>
          <button onClick={submit} disabled={submitting || statement.trim().length < 30}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold"
            style={{
              background: (submitting || statement.trim().length < 30) ? 'rgba(168,85,247,0.2)' : 'linear-gradient(135deg, #A855F7, #7C3AED)',
              color: (submitting || statement.trim().length < 30) ? 'rgba(255,255,255,0.3)' : '#fff',
              cursor: (submitting || statement.trim().length < 30) ? 'not-allowed' : 'pointer',
            }}>
            {submitting ? 'Submitting…' : 'Submit Application →'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Company Posting Card ──────────────────────────────────────────────────────

function CompanyCard({ posting, onApply }: { posting: Posting; onApply: (p: Posting) => void }) {
  const saathi = SAATHIS.find((s) => s.id === posting.vertical_id);
  const applied = posting.my_application;
  const seatsLeft = posting.total_seats - posting.seats_filled;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-5"
      style={{ background: 'rgba(255,255,255,0.03)', border: `0.5px solid ${posting.listing_plan === 'featured' ? 'rgba(201,153,58,0.4)' : 'rgba(255,255,255,0.08)'}` }}>
      {posting.listing_plan === 'featured' && (
        <div className="text-[10px] font-bold px-2 py-0.5 rounded-full inline-block mb-2"
          style={{ background: 'rgba(201,153,58,0.15)', color: '#C9993A', border: '0.5px solid rgba(201,153,58,0.4)' }}>
          ★ Featured
        </div>
      )}
      <div className="flex items-start gap-3 mb-3">
        {posting.company_logo_url ? (
          <img src={posting.company_logo_url} alt={posting.company_name ?? ''} className="w-10 h-10 rounded-xl object-contain"
            style={{ background: 'rgba(255,255,255,0.06)', padding: '4px' }} />
        ) : (
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-lg"
            style={{ background: saathi ? `${saathi.primary}25` : 'rgba(255,255,255,0.06)' }}>
            🏢
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <h3 className="font-semibold text-white text-sm">{posting.title}</h3>
            {applied && <ApplicationStatusBadge status={applied.status} />}
          </div>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {posting.company_name ?? 'Organisation'}
            {posting.location ? ` · ${posting.location}` : ''}
            {posting.is_remote ? ' · Remote' : ''}
          </p>
        </div>
        {posting.match_score !== undefined && posting.match_score > 0 && (
          <MatchBadge score={posting.match_score} />
        )}
      </div>

      <p className="text-xs leading-relaxed mb-3" style={{ color: 'rgba(255,255,255,0.55)' }}>
        {posting.description.slice(0, 180)}{posting.description.length > 180 ? '…' : ''}
      </p>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {saathi && (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
            style={{ background: `${saathi.primary}20`, color: saathi.accent }}>
            {saathi.emoji} {saathi.name}
          </span>
        )}
        {posting.duration_months && (
          <span className="text-[10px] px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>
            🗓 {posting.duration_months}m
          </span>
        )}
        {posting.is_paid && posting.stipend_monthly ? (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
            style={{ background: 'rgba(74,222,128,0.1)', color: '#4ADE80', border: '0.5px solid rgba(74,222,128,0.25)' }}>
            ₹{posting.stipend_monthly.toLocaleString('en-IN')}/mo
          </span>
        ) : (
          <span className="text-[10px] px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.3)' }}>
            Unpaid
          </span>
        )}
        {posting.work_mode !== 'onsite' && (
          <span className="text-[10px] px-2 py-0.5 rounded-full capitalize"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>
            {posting.work_mode}
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {seatsLeft > 0 ? `${seatsLeft} seat${seatsLeft > 1 ? 's' : ''} left` : 'Full'}
          </span>
          <DeadlineTag deadline={posting.application_deadline} />
        </div>
        {!applied ? (
          <button onClick={() => onApply(posting)}
            className="px-4 py-1.5 rounded-xl text-xs font-bold"
            style={{ background: 'linear-gradient(135deg, #6366F1, #4F46E5)', color: '#fff' }}>
            Apply Now →
          </button>
        ) : (
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Applied ✓</span>
        )}
      </div>
    </motion.div>
  );
}

// ── Research Posting Card ─────────────────────────────────────────────────────

function ResearchCard({ posting, onApply }: { posting: Posting; onApply: (p: Posting) => void }) {
  const saathi = SAATHIS.find((s) => s.id === posting.vertical_id);
  const applied = posting.my_application;
  const seatsLeft = posting.total_seats - posting.seats_filled;

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-5"
      style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(168,85,247,0.2)' }}>
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            {saathi && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                style={{ background: `${saathi.primary}20`, color: saathi.accent }}>
                {saathi.emoji} {saathi.name}
              </span>
            )}
            {posting.offers_coauthorship && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
                style={{ background: 'rgba(201,153,58,0.15)', color: '#E5B86A', border: '0.5px solid rgba(201,153,58,0.35)' }}>
                ✍️ Co-authorship
              </span>
            )}
            {applied && <ApplicationStatusBadge status={applied.status} />}
          </div>
          <h3 className="font-playfair text-base font-bold text-white">
            {posting.project_title ?? posting.title}
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {posting.poster?.full_name ?? 'Faculty'}
            {posting.faculty_profile?.designation ? ` · ${posting.faculty_profile.designation}` : ''}
            {posting.faculty_profile?.institution_name ? ` · ${posting.faculty_profile.institution_name}` : ''}
          </p>
        </div>
        {posting.match_score !== undefined && posting.match_score > 0 && (
          <MatchBadge score={posting.match_score} />
        )}
      </div>

      {posting.research_area && (
        <p className="text-xs mb-2 font-medium" style={{ color: '#C084FC' }}>
          🔬 {posting.research_area}
        </p>
      )}

      <p className="text-xs leading-relaxed mb-3" style={{ color: 'rgba(255,255,255,0.55)' }}>
        {posting.description.slice(0, 200)}{posting.description.length > 200 ? '…' : ''}
      </p>

      {posting.responsibilities && (
        <div className="mb-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.06)' }}>
          <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>What you&apos;ll do</p>
          <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>{posting.responsibilities}</p>
        </div>
      )}

      {posting.expected_outcome && (
        <p className="text-xs mb-3 italic" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Outcome: {posting.expected_outcome}
        </p>
      )}

      <div className="flex flex-wrap gap-1.5 mb-4">
        {posting.is_paid && posting.stipend_monthly ? (
          <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold"
            style={{ background: 'rgba(74,222,128,0.1)', color: '#4ADE80', border: '0.5px solid rgba(74,222,128,0.25)' }}>
            ₹{posting.stipend_monthly.toLocaleString('en-IN')}/mo
          </span>
        ) : (
          <span className="text-[10px] px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.3)' }}>
            Unpaid
          </span>
        )}
        {posting.duration_months && (
          <span className="text-[10px] px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>
            {posting.duration_months}m
          </span>
        )}
        {posting.offers_certificate && (
          <span className="text-[10px] px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>
            📜 Certificate
          </span>
        )}
        {posting.min_depth > 0 && (
          <span className="text-[10px] px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}>
            Depth {posting.min_depth}+
          </span>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
            {seatsLeft > 0 ? `${seatsLeft} seat${seatsLeft > 1 ? 's' : ''} left` : 'Full'} · {posting.total_applications} applied
          </span>
        </div>
        {!applied ? (
          <button onClick={() => onApply(posting)}
            className="px-4 py-1.5 rounded-xl text-xs font-bold"
            style={{ background: 'linear-gradient(135deg, #A855F7, #7C3AED)', color: '#fff' }}>
            Apply →
          </button>
        ) : (
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Applied ✓</span>
        )}
      </div>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function InternshipsPage() {
  const { profile } = useAuthStore();
  const [activeTab, setActiveTab] = useState<ActiveTab>('company');
  const [postings, setPostings] = useState<Posting[]>([]);
  const [myApplications, setMyApplications] = useState<MyApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [soulData, setSoulData] = useState<SoulForMatch | null>(null);
  const [applyTarget, setApplyTarget] = useState<Posting | null>(null);
  const [successPostingId, setSuccessPostingId] = useState<string | null>(null);

  // Filters
  const [filterVertical, setFilterVertical] = useState<string>('all');
  const [filterPaid, setFilterPaid] = useState(false);
  const [filterRemote, setFilterRemote] = useState(false);
  const [filterCoauthor, setFilterCoauthor] = useState(false);

  const loadData = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    const supabase = createClient();

    const [{ data: soul }, { data: postingData }, { data: myApps }] = await Promise.all([
      supabase
        .from('student_soul')
        .select('depth_calibration, future_research_area, top_topics, enrolled_subjects')
        .eq('user_id', profile.id)
        .maybeSingle(),
      supabase
        .from('internship_postings')
        .select(`
          *,
          poster:profiles!internship_postings_posted_by_fkey(full_name),
          faculty_profile:faculty_profiles(institution_name, designation)
        `)
        .eq('status', 'open')
        .order('listing_plan', { ascending: false }) // featured first
        .order('created_at', { ascending: false })
        .limit(60),
      supabase
        .from('intern_applications')
        .select('*, posting:internship_postings(*)')
        .eq('student_id', profile.id)
        .order('created_at', { ascending: false }),
    ]);

    const resolved: SoulForMatch = {
      depth_calibration: soul?.depth_calibration ?? 0,
      future_research_area: soul?.future_research_area ?? null,
      top_topics: soul?.top_topics ?? [],
      enrolled_subjects: soul?.enrolled_subjects ?? [],
    };
    setSoulData(resolved);

    const appMap = new Map((myApps ?? []).map((a) => [a.posting_id, a]));

    const enriched: Posting[] = (postingData ?? []).map((p) => {
      const postingMatch: PostingForMatch = {
        posting_type: p.posting_type,
        vertical_id: p.vertical_id,
        min_depth: p.min_depth,
        min_academic_level: p.min_academic_level,
        preferred_subjects: p.preferred_subjects,
        research_area: p.research_area,
      };
      return {
        ...p,
        faculty_profile: Array.isArray(p.faculty_profile) ? p.faculty_profile[0] ?? null : p.faculty_profile,
        match_score: computeMatchScore(postingMatch, resolved, profile),
        my_application: appMap.get(p.id) ?? null,
      } as Posting;
    });

    setPostings(enriched);
    setMyApplications((myApps ?? []) as MyApplication[]);
    setLoading(false);
  }, [profile]);

  useEffect(() => { loadData(); }, [loadData]);

  function handleApplySuccess(postingId: string) {
    setApplyTarget(null);
    setSuccessPostingId(postingId);
    // Optimistically mark as applied
    setPostings((prev) =>
      prev.map((p) =>
        p.id === postingId
          ? { ...p, my_application: { status: 'applied' }, total_applications: p.total_applications + 1 }
          : p
      )
    );
    setTimeout(() => setSuccessPostingId(null), 5000);
  }

  const companyPostings = postings
    .filter((p) => p.posting_type === 'institution')
    .filter((p) => filterVertical === 'all' || p.vertical_id === filterVertical)
    .filter((p) => !filterPaid || p.is_paid)
    .filter((p) => !filterRemote || p.is_remote)
    .sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0));

  const researchPostings = postings
    .filter((p) => p.posting_type === 'research')
    .filter((p) => filterVertical === 'all' || p.vertical_id === filterVertical)
    .filter((p) => !filterPaid || p.is_paid)
    .filter((p) => !filterCoauthor || p.offers_coauthorship)
    .sort((a, b) => (b.match_score ?? 0) - (a.match_score ?? 0));

  const verticals = Array.from(
    new Set(postings.filter((p) => p.posting_type === activeTab.replace('company', 'institution').replace('research', 'research')).map((p) => p.vertical_id).filter(Boolean))
  ).map((id) => SAATHIS.find((s) => s.id === id)).filter(Boolean);

  return (
    <div className="min-h-screen" style={{ background: '#060F1D', color: '#fff' }}>
      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-6">
          <h1 className="font-playfair text-3xl font-bold text-white mb-1">
            Internships & Research 🎯
          </h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Soul-matched opportunities · sorted by your profile
          </p>
        </div>

        {/* Success toast */}
        <AnimatePresence>
          {successPostingId && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
              className="mb-4 px-4 py-3 rounded-xl text-sm font-semibold"
              style={{ background: 'rgba(99,102,241,0.15)', border: '0.5px solid rgba(99,102,241,0.4)', color: '#818CF8' }}>
              ✓ Application submitted! You&apos;ll be notified when they respond.
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tabs */}
        <div className="flex gap-1 mb-5 p-1 rounded-2xl" style={{ background: 'rgba(255,255,255,0.04)' }}>
          {[
            { id: 'company' as const, label: '🏢 Company Internships', count: companyPostings.length },
            { id: 'research' as const, label: '🔬 Research Positions', count: researchPostings.length },
          ].map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className="flex-1 py-2.5 rounded-xl text-xs font-semibold transition-all"
              style={{
                background: activeTab === tab.id ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: activeTab === tab.id ? '#fff' : 'rgba(255,255,255,0.4)',
              }}>
              {tab.label}
              {tab.count > 0 && (
                <span className="ml-1.5 text-[9px] px-1.5 py-0.5 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.1)' }}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Filter bar */}
        <div className="flex flex-wrap gap-2 mb-5">
          <button onClick={() => setFilterVertical('all')}
            className="text-xs font-semibold px-3 py-1.5 rounded-full"
            style={{ background: filterVertical === 'all' ? '#C9993A' : 'rgba(255,255,255,0.06)', color: filterVertical === 'all' ? '#060F1D' : 'rgba(255,255,255,0.5)' }}>
            All fields
          </button>
          {verticals.map((s) => s && (
            <button key={s.id} onClick={() => setFilterVertical(s.id)}
              className="text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{ background: filterVertical === s.id ? s.primary : 'rgba(255,255,255,0.06)', color: filterVertical === s.id ? '#fff' : 'rgba(255,255,255,0.5)' }}>
              {s.emoji} {s.name}
            </button>
          ))}
          <button onClick={() => setFilterPaid((v) => !v)}
            className="text-xs font-semibold px-3 py-1.5 rounded-full"
            style={{ background: filterPaid ? 'rgba(74,222,128,0.15)' : 'rgba(255,255,255,0.06)', color: filterPaid ? '#4ADE80' : 'rgba(255,255,255,0.4)', border: `0.5px solid ${filterPaid ? 'rgba(74,222,128,0.35)' : 'transparent'}` }}>
            💰 Paid only
          </button>
          <button onClick={() => setFilterRemote((v) => !v)}
            className="text-xs font-semibold px-3 py-1.5 rounded-full"
            style={{ background: filterRemote ? 'rgba(14,165,233,0.15)' : 'rgba(255,255,255,0.06)', color: filterRemote ? '#38BDF8' : 'rgba(255,255,255,0.4)', border: `0.5px solid ${filterRemote ? 'rgba(14,165,233,0.35)' : 'transparent'}` }}>
            🌐 Remote
          </button>
          {activeTab === 'research' && (
            <button onClick={() => setFilterCoauthor((v) => !v)}
              className="text-xs font-semibold px-3 py-1.5 rounded-full"
              style={{ background: filterCoauthor ? 'rgba(201,153,58,0.15)' : 'rgba(255,255,255,0.06)', color: filterCoauthor ? '#E5B86A' : 'rgba(255,255,255,0.4)', border: `0.5px solid ${filterCoauthor ? 'rgba(201,153,58,0.35)' : 'transparent'}` }}>
              ✍️ Co-authorship
            </button>
          )}
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl animate-pulse"
                style={{ background: 'rgba(255,255,255,0.03)', height: '180px' }} />
            ))}
          </div>
        ) : activeTab === 'company' ? (
          companyPostings.length === 0 ? (
            <div className="rounded-2xl p-12 text-center"
              style={{ background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.06)' }}>
              <p className="text-4xl mb-4">🏢</p>
              <p className="font-playfair text-xl text-white mb-2">No company internships yet</p>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Institutions are setting up postings. Check back soon!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {companyPostings.map((p) => (
                <CompanyCard key={p.id} posting={p} onApply={setApplyTarget} />
              ))}
            </div>
          )
        ) : (
          researchPostings.length === 0 ? (
            <div className="rounded-2xl p-12 text-center"
              style={{ background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.06)' }}>
              <p className="text-4xl mb-4">🔬</p>
              <p className="font-playfair text-xl text-white mb-2">No research positions yet</p>
              <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
                Faculty are setting up research openings. Check back soon!
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {researchPostings.map((p) => (
                <ResearchCard key={p.id} posting={p} onApply={setApplyTarget} />
              ))}
            </div>
          )
        )}

        {/* ── My Applications ─────────────────────────────────────────────── */}
        {myApplications.length > 0 && (
          <div className="mt-12">
            <h2 className="font-playfair text-xl font-bold text-white mb-4">My Applications</h2>
            <div className="space-y-3">
              {myApplications.map((app) => {
                const p = app.posting;
                return (
                  <div key={app.id} className="rounded-2xl p-4"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.07)' }}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-white text-sm truncate">
                          {p?.project_title ?? p?.title ?? 'Position'}
                        </p>
                        <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                          {p?.company_name ?? p?.faculty_profile?.institution_name ?? 'Organisation'}
                          {' · '}Applied {new Date(app.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <MatchBadge score={app.match_score} />
                        <ApplicationStatusBadge status={app.status} />
                      </div>
                    </div>
                    {app.status === 'selected' && (
                      <div className="mt-2 px-3 py-2 rounded-xl text-xs font-semibold"
                        style={{ background: 'rgba(34,197,94,0.1)', color: '#4ADE80', border: '0.5px solid rgba(34,197,94,0.3)' }}>
                        🎉 Congratulations! You were selected. This will be added to your soul profile.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <AnimatePresence>
        {applyTarget && applyTarget.posting_type === 'institution' && (
          <CompanyApplyModal posting={applyTarget} onClose={() => setApplyTarget(null)} onSuccess={handleApplySuccess} />
        )}
        {applyTarget && applyTarget.posting_type === 'research' && (
          <ResearchApplyModal posting={applyTarget} onClose={() => setApplyTarget(null)} onSuccess={handleApplySuccess} />
        )}
      </AnimatePresence>
    </div>
  );
}
