'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { SAATHIS } from '@/constants/saathis';
import { RESEARCH_APPLICATION_STATUS } from '@/constants/db-enums';

// ── Types ─────────────────────────────────────────────────────────────────────

type ResearchProject = {
  id: string;
  faculty_id: string;
  vertical_id: string;
  title: string;
  description: string;
  what_you_will_do: string;
  what_you_will_get: string;
  required_subjects: string[];
  preferred_academic_level: string | null;
  duration_months: number | null;
  is_remote: boolean;
  seats_available: number;
  includes_stipend: boolean;
  stipend_amount: number | null;
  includes_authorship: boolean;
  includes_certificate: boolean;
  includes_letter: boolean;
  status: string;
  total_applicants: number;
  created_at: string;
  faculty?: {
    full_name: string | null;
    city: string | null;
  };
  faculty_profile?: {
    institution_name: string;
    designation: string | null;
    subject_expertise: string[];
  };
  my_application?: { status: string } | null;
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function BenefitChip({ icon, label, highlight }: { icon: string; label: string; highlight?: boolean }) {
  return (
    <span
      className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full"
      style={{
        background: highlight ? 'rgba(201,153,58,0.15)' : 'rgba(255,255,255,0.05)',
        border: `0.5px solid ${highlight ? 'rgba(201,153,58,0.4)' : 'rgba(255,255,255,0.12)'}`,
        color: highlight ? '#E5B86A' : 'rgba(255,255,255,0.55)',
      }}
    >
      {icon} {label}
    </span>
  );
}

function ApplicationStatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; border: string; color: string; label: string }> = {
    pending:     { bg: 'rgba(234,179,8,0.1)',    border: 'rgba(234,179,8,0.35)',    color: '#FACC15', label: '⏳ Applied' },
    shortlisted: { bg: 'rgba(14,165,233,0.12)',  border: 'rgba(14,165,233,0.4)',   color: '#38BDF8', label: '⭐ Shortlisted' },
    accepted:    { bg: 'rgba(34,197,94,0.12)',   border: 'rgba(34,197,94,0.4)',    color: '#4ADE80', label: '✓ Accepted' },
    rejected:    { bg: 'rgba(239,68,68,0.1)',    border: 'rgba(239,68,68,0.3)',    color: '#F87171', label: '✕ Not selected' },
    withdrawn:   { bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.35)', label: 'Withdrawn' },
  };
  const s = cfg[status] ?? cfg.pending;
  return (
    <span className="text-xs font-bold px-2.5 py-1 rounded-full"
      style={{ background: s.bg, border: `0.5px solid ${s.border}`, color: s.color }}>
      {s.label}
    </span>
  );
}

// ── Apply Modal ───────────────────────────────────────────────────────────────

function ApplyModal({
  project,
  onClose,
  onSuccess,
}: {
  project: ResearchProject;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const { profile } = useAuthStore();
  const [statement, setStatement] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const MAX = 600;
  const remaining = MAX - statement.length;

  async function handleSubmit() {
    if (!profile || statement.trim().length < 50) {
      setError('Please write at least 50 characters explaining why you want to join.');
      return;
    }
    setSubmitting(true);
    setError(null);
    const supabase = createClient();
    const { error: err } = await supabase.from('research_applications').insert({
      project_id: project.id,
      student_id: profile.id,
      statement: statement.trim(),
      status: RESEARCH_APPLICATION_STATUS.PENDING,
    });
    setSubmitting(false);
    if (err) {
      if (err.code === '23505') {
        setError('You have already applied to this project.');
      } else {
        setError('Something went wrong. Please try again.');
      }
    } else {
      onSuccess();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="w-full max-w-lg rounded-2xl p-6"
        style={{ background: '#0B1F3A', border: '0.5px solid rgba(255,255,255,0.1)' }}
      >
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="font-playfair text-lg text-white font-bold">{project.title}</h3>
            <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {project.faculty_profile?.institution_name ?? 'Research Lab'} ·{' '}
              {SAATHIS.find((s) => s.id === project.vertical_id)?.name ?? project.vertical_id}
            </p>
          </div>
          <button onClick={onClose} className="text-2xl leading-none" style={{ color: 'rgba(255,255,255,0.3)' }}>×</button>
        </div>

        <div className="mb-4 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.07)' }}>
          <p className="text-xs font-semibold mb-1" style={{ color: '#C9993A' }}>What you&apos;ll get</p>
          <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>{project.what_you_will_get}</p>
        </div>

        <div className="mb-1">
          <label className="block text-xs font-semibold mb-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Statement of Purpose <span style={{ color: 'rgba(255,255,255,0.3)' }}>— why you, why this project?</span>
          </label>
          <textarea
            value={statement}
            onChange={(e) => {
              if (e.target.value.length <= MAX) setStatement(e.target.value);
            }}
            rows={6}
            placeholder="Tell the faculty what excites you about this project, what relevant experience or skills you bring, and what you hope to contribute and learn..."
            className="w-full rounded-xl px-4 py-3 text-sm resize-none outline-none"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '0.5px solid rgba(255,255,255,0.12)',
              color: '#fff',
            }}
          />
        </div>
        <div className="flex justify-between items-center mb-4">
          <p className="text-[10px]" style={{ color: remaining < 50 ? '#F87171' : 'rgba(255,255,255,0.25)' }}>
            {remaining} characters remaining
          </p>
          {statement.length > 0 && statement.length < 50 && (
            <p className="text-[10px]" style={{ color: '#F59E0B' }}>Write at least {50 - statement.length} more chars</p>
          )}
        </div>

        {error && (
          <p className="text-xs mb-3 px-3 py-2 rounded-lg" style={{ background: 'rgba(239,68,68,0.1)', color: '#F87171', border: '0.5px solid rgba(239,68,68,0.25)' }}>
            {error}
          </p>
        )}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.5)', border: '0.5px solid rgba(255,255,255,0.1)' }}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || statement.trim().length < 50}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold"
            style={{
              background: submitting || statement.trim().length < 50
                ? 'rgba(168,85,247,0.2)'
                : 'linear-gradient(135deg, #A855F7, #7C3AED)',
              color: submitting || statement.trim().length < 50 ? 'rgba(255,255,255,0.3)' : '#fff',
              cursor: submitting || statement.trim().length < 50 ? 'not-allowed' : 'pointer',
            }}
          >
            {submitting ? 'Submitting…' : 'Submit Application'}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Project Card ──────────────────────────────────────────────────────────────

function ProjectCard({
  project,
  onApply,
}: {
  project: ResearchProject;
  onApply: (p: ResearchProject) => void;
}) {
  const saathi = SAATHIS.find((s) => s.id === project.vertical_id);
  const applied = project.my_application;
  const seatsLeft = project.seats_available - project.total_applicants;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-5"
      style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.08)' }}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            {saathi && (
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
                style={{ background: `${saathi.primary}20`, color: saathi.accent, border: `0.5px solid ${saathi.primary}40` }}>
                {saathi.emoji} {saathi.name}
              </span>
            )}
            {project.is_remote && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{ background: 'rgba(74,222,128,0.1)', color: '#4ADE80', border: '0.5px solid rgba(74,222,128,0.25)' }}>
                🌐 Remote
              </span>
            )}
            {project.preferred_academic_level && (
              <span className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.45)', border: '0.5px solid rgba(255,255,255,0.1)' }}>
                {project.preferred_academic_level}
              </span>
            )}
          </div>
          <h3 className="font-playfair text-base font-bold text-white leading-snug">{project.title}</h3>
          <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {project.faculty_profile?.designation
              ? `${project.faculty_profile.designation} · `
              : ''}
            {project.faculty_profile?.institution_name ?? 'Research Lab'}
            {project.faculty?.city ? ` · ${project.faculty.city}` : ''}
          </p>
        </div>
        {applied && <ApplicationStatusBadge status={applied.status} />}
      </div>

      {/* Description */}
      <p className="text-xs leading-relaxed mb-3" style={{ color: 'rgba(255,255,255,0.55)' }}>
        {project.description.slice(0, 220)}{project.description.length > 220 ? '…' : ''}
      </p>

      {/* What you'll do */}
      <div className="mb-3 p-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.06)' }}>
        <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'rgba(255,255,255,0.3)' }}>What you&apos;ll do</p>
        <p className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.6)' }}>{project.what_you_will_do}</p>
      </div>

      {/* Benefits */}
      <div className="flex flex-wrap gap-1.5 mb-4">
        {project.includes_authorship && <BenefitChip icon="✍️" label="Co-authorship" highlight />}
        {project.includes_stipend && project.stipend_amount && (
          <BenefitChip icon="💰" label={`₹${project.stipend_amount.toLocaleString('en-IN')}/mo`} highlight />
        )}
        {project.includes_certificate && <BenefitChip icon="📜" label="Certificate" />}
        {project.includes_letter && <BenefitChip icon="📄" label="Recommendation letter" />}
        {project.duration_months && <BenefitChip icon="🗓" label={`${project.duration_months}m duration`} />}
      </div>

      {/* Required subjects */}
      {project.required_subjects.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {project.required_subjects.slice(0, 5).map((s) => (
            <span key={s} className="text-[10px] px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(201,153,58,0.08)', color: '#C9993A', border: '0.5px solid rgba(201,153,58,0.2)' }}>
              {s}
            </span>
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between">
        <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.25)' }}>
          {project.total_applicants} applied ·{' '}
          {seatsLeft > 0 ? `${seatsLeft} seat${seatsLeft > 1 ? 's' : ''} left` : 'Full'}
        </p>
        {!applied ? (
          <button
            onClick={() => onApply(project)}
            className="px-4 py-2 rounded-xl text-xs font-bold transition-all"
            style={{ background: 'linear-gradient(135deg, #A855F7, #7C3AED)', color: '#fff' }}
          >
            Apply →
          </button>
        ) : (
          <span className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>Application submitted</span>
        )}
      </div>
    </motion.div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ResearchPage() {
  const { profile } = useAuthStore();
  const [projects, setProjects] = useState<ResearchProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedVertical, setSelectedVertical] = useState<string>('all');
  const [filterAuthorship, setFilterAuthorship] = useState(false);
  const [filterStipend, setFilterStipend] = useState(false);
  const [applyTarget, setApplyTarget] = useState<ResearchProject | null>(null);
  const [successId, setSuccessId] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    loadProjects();
  }, [profile]); // eslint-disable-line react-hooks/exhaustive-deps

  async function loadProjects() {
    setLoading(true);
    const supabase = createClient();

    // Fetch open projects with faculty info
    const { data: projectData } = await supabase
      .from('research_projects')
      .select(`
        *,
        faculty:profiles!research_projects_faculty_id_fkey(full_name, city),
        faculty_profile:faculty_profiles!inner(institution_name, designation, subject_expertise)
      `)
      .eq('status', 'open')
      .order('created_at', { ascending: false })
      .limit(50);

    if (!projectData) { setLoading(false); return; }

    // Fetch my applications to overlay status
    const { data: myApps } = await supabase
      .from('research_applications')
      .select('project_id, status')
      .eq('student_id', profile!.id);

    const appMap = new Map((myApps ?? []).map((a) => [a.project_id, a]));

    const enriched: ResearchProject[] = (projectData as ResearchProject[]).map((p) => ({
      ...p,
      my_application: appMap.get(p.id) ?? null,
    }));

    setProjects(enriched);
    setLoading(false);
  }

  function handleApplySuccess() {
    if (!applyTarget) return;
    setSuccessId(applyTarget.id);
    setApplyTarget(null);
    // Update local state so card reflects applied status
    setProjects((prev) =>
      prev.map((p) =>
        p.id === successId || p.id === applyTarget?.id
          ? { ...p, my_application: { status: RESEARCH_APPLICATION_STATUS.PENDING }, total_applicants: p.total_applicants + 1 }
          : p
      )
    );
    setTimeout(() => setSuccessId(null), 4000);
  }

  const filtered = projects.filter((p) => {
    if (selectedVertical !== 'all' && p.vertical_id !== selectedVertical) return false;
    if (filterAuthorship && !p.includes_authorship) return false;
    if (filterStipend && !p.includes_stipend) return false;
    return true;
  });

  // Unique verticals present in the project list
  const verticals = Array.from(new Set(projects.map((p) => p.vertical_id)))
    .map((id) => SAATHIS.find((s) => s.id === id))
    .filter(Boolean);

  return (
    <div className="min-h-screen" style={{ background: '#060F1D', color: '#fff' }}>
      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Header */}
        <div className="mb-8">
          <h1 className="font-playfair text-3xl font-bold text-white mb-2">
            Research Projects 🔬
          </h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>
            Collaborate with faculty, contribute to real research, and build your academic profile.
          </p>
        </div>

        {/* Success toast */}
        <AnimatePresence>
          {successId && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 px-4 py-3 rounded-xl text-sm font-semibold"
              style={{ background: 'rgba(168,85,247,0.15)', border: '0.5px solid rgba(168,85,247,0.4)', color: '#C084FC' }}
            >
              ✓ Application submitted! The faculty will review and reach out.
            </motion.div>
          )}
        </AnimatePresence>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setSelectedVertical('all')}
            className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
            style={{
              background: selectedVertical === 'all' ? '#C9993A' : 'rgba(255,255,255,0.06)',
              color: selectedVertical === 'all' ? '#060F1D' : 'rgba(255,255,255,0.5)',
              border: '0.5px solid transparent',
            }}
          >
            All fields
          </button>
          {verticals.map((s) => s && (
            <button
              key={s.id}
              onClick={() => setSelectedVertical(s.id)}
              className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
              style={{
                background: selectedVertical === s.id ? s.primary : 'rgba(255,255,255,0.06)',
                color: selectedVertical === s.id ? '#fff' : 'rgba(255,255,255,0.5)',
                border: `0.5px solid ${selectedVertical === s.id ? s.accent + '40' : 'transparent'}`,
              }}
            >
              {s.emoji} {s.name}
            </button>
          ))}

          {/* Benefit filters */}
          <button
            onClick={() => setFilterAuthorship((v) => !v)}
            className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
            style={{
              background: filterAuthorship ? 'rgba(201,153,58,0.2)' : 'rgba(255,255,255,0.06)',
              color: filterAuthorship ? '#E5B86A' : 'rgba(255,255,255,0.4)',
              border: `0.5px solid ${filterAuthorship ? 'rgba(201,153,58,0.4)' : 'transparent'}`,
            }}
          >
            ✍️ Co-authorship
          </button>
          <button
            onClick={() => setFilterStipend((v) => !v)}
            className="text-xs font-semibold px-3 py-1.5 rounded-full transition-all"
            style={{
              background: filterStipend ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.06)',
              color: filterStipend ? '#4ADE80' : 'rgba(255,255,255,0.4)',
              border: `0.5px solid ${filterStipend ? 'rgba(74,222,128,0.35)' : 'transparent'}`,
            }}
          >
            💰 With stipend
          </button>
        </div>

        {/* Content */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-2xl p-5 animate-pulse"
                style={{ background: 'rgba(255,255,255,0.03)', height: '200px' }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl p-12 text-center"
            style={{ background: 'rgba(255,255,255,0.02)', border: '0.5px solid rgba(255,255,255,0.06)' }}>
            <p className="text-4xl mb-4">🔬</p>
            <p className="font-playfair text-xl text-white mb-2">No projects found</p>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {projects.length === 0
                ? 'Faculty are setting up research projects. Check back soon!'
                : 'Try removing some filters.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((project) => (
              <ProjectCard
                key={project.id}
                project={project}
                onApply={setApplyTarget}
              />
            ))}
          </div>
        )}
      </div>

      {/* Apply modal */}
      <AnimatePresence>
        {applyTarget && (
          <ApplyModal
            project={applyTarget}
            onClose={() => setApplyTarget(null)}
            onSuccess={handleApplySuccess}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
