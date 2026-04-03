'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';

// ── Types ─────────────────────────────────────────────────────────────────────

type ParseResult = {
  parsed: {
    year: number | null;
    degree: string | null;
    institution: string | null;
    city: string | null;
    saathi_suggestion: string | null;
  };
  college: {
    id: string;
    name: string;
    city: string;
    state: string;
    university: string | null;
    naac_grade: string | null;
    score: number;
  } | null;
  course: { id: string; name: string; saathi_slug: string | null; score: number } | null;
  confidence: number;
  subjects: Record<string, string[]> | null;
  saathi_suggestion: string | null;
  alternatives: { id: string; name: string; city: string; state: string; score: number }[];
};

type Props = {
  currentSaathiId?: string;
  onConfirmed: (data: {
    collegeId: string | null;
    courseId: string | null;
    year: number | null;
    currentSubjects: string[];
    saathiSuggestion: string | null;
    rawInput: string;
  }) => void;
  onSaathiSwitch?: (slug: string) => void;
  primaryColor?: string;
};

const EXAMPLES = [
  '2nd Year B.Tech CSE from NIT Surat',
  'Final year MBBS, AIIMS Delhi',
  'MBA 1st sem, Symbiosis Pune',
  'LLB 3rd year GLC Mumbai',
  '4th yr B.Pharm, LM College Ahmedabad',
];

// ── SmartEducationInput ───────────────────────────────────────────────────────

export function SmartEducationInput({
  currentSaathiId,
  onConfirmed,
  onSaathiSwitch,
  primaryColor = '#C9993A',
}: Props) {
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exampleIdx, setExampleIdx] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const [autoAdding, setAutoAdding] = useState(false);
  const [communityAdded, setCommunityAdded] = useState(false);

  // Rotate examples every 3s
  useEffect(() => {
    const t = setInterval(() => setExampleIdx((i) => (i + 1) % EXAMPLES.length), 3000);
    return () => clearInterval(t);
  }, []);

  // ── Call parse-education Edge Function on blur ──────────────────────────────

  async function handleBlur() {
    const trimmed = value.trim();
    if (!trimmed || loading || confirmed) return;
    if (trimmed.length < 8) return; // too short to parse

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const supabase = createClient();
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error('Not authenticated');

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/parse-education`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({ rawInput: trimmed }),
        }
      );

      if (!res.ok) throw new Error(`Parse failed: ${res.status}`);
      const data: ParseResult = await res.json();
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not parse. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  // ── Confirmation ────────────────────────────────────────────────────────────

  function handleConfirm() {
    if (!result) return;
    const subjects = result.subjects
      ? Object.values(result.subjects).flat()
      : [];
    setConfirmed(true);
    onConfirmed({
      collegeId: result.college?.id ?? null,
      courseId: result.course?.id ?? null,
      year: result.parsed.year,
      currentSubjects: subjects,
      saathiSuggestion: result.saathi_suggestion,
      rawInput: value.trim(),
    });
  }

  function handleCorrect() {
    setResult(null);
    setConfirmed(false);
    setCommunityAdded(false);
  }

  // ── Phase 2: Auto-add unknown college via community sourcing ────────────────

  async function handleAutoAdd() {
    if (!result) return;
    const institutionName = result.parsed.institution ?? value.trim();
    if (!institutionName) return;

    setAutoAdding(true);
    setError(null);
    try {
      const supabase = createClient();
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error('Not authenticated');

      const res = await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/auto-add-college`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.session.access_token}`,
          },
          body: JSON.stringify({
            institution_name: institutionName,
            city: result.parsed.city ?? undefined,
            courses: result.parsed.degree ? [result.parsed.degree] : [],
          }),
        }
      );
      if (!res.ok) throw new Error(`auto-add failed: ${res.status}`);
      const data = await res.json();

      // Update result with the new/found college and confirm
      setResult((prev) => prev ? {
        ...prev,
        college: data.college ? {
          id: data.college.id,
          name: data.college.name,
          city: data.college.city ?? '',
          state: data.college.state ?? '',
          university: null,
          naac_grade: null,
          score: 1,
        } : prev.college,
        confidence: 90,
      } : prev);
      setCommunityAdded(data.action === 'added');
      setConfirmed(true);
      const subjects = result.subjects ? Object.values(result.subjects).flat() : [];
      onConfirmed({
        collegeId: data.college?.id ?? null,
        courseId: result.course?.id ?? null,
        year: result.parsed.year,
        currentSubjects: subjects,
        saathiSuggestion: result.saathi_suggestion,
        rawInput: value.trim(),
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add college.');
    } finally {
      setAutoAdding(false);
    }
  }

  // ── Subject list preview ────────────────────────────────────────────────────

  function getSubjectPreview(result: ParseResult): string {
    if (!result.subjects) return '';
    const all = Object.values(result.subjects).flat();
    if (all.length === 0) return '';
    const preview = all.slice(0, 3).join(', ');
    return all.length > 3 ? `${preview} +${all.length - 3} more` : preview;
  }

  const showSaathiNudge =
    result &&
    result.saathi_suggestion &&
    currentSaathiId &&
    result.saathi_suggestion !== currentSaathiId;

  return (
    <div className="w-full">
      {/* Label */}
      <label
        className="block text-xs font-semibold mb-1.5 tracking-wide"
        style={{ color: 'rgba(255,255,255,0.5)' }}
      >
        Tell us about your education
      </label>

      {/* Textarea */}
      <div className="relative">
        <textarea
          value={value}
          onChange={(e) => { setValue(e.target.value); setResult(null); setConfirmed(false); }}
          onBlur={handleBlur}
          rows={2}
          disabled={confirmed}
          placeholder={`e.g. "${EXAMPLES[exampleIdx]}"`}
          className="w-full rounded-xl px-4 py-3.5 text-sm text-white outline-none resize-none transition-all"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: `0.5px solid ${result ? (result.confidence >= 85 ? 'rgba(34,197,94,0.4)' : result.confidence >= 60 ? `${primaryColor}66` : 'rgba(239,68,68,0.35)') : 'rgba(255,255,255,0.1)'}`,
            fontFamily: 'var(--font-dm-sans)',
            opacity: confirmed ? 0.6 : 1,
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = `${primaryColor}80`)}
        />

        {/* Loading spinner overlay */}
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <div
              className="w-4 h-4 rounded-full border-2 border-white/10 animate-spin"
              style={{ borderTopColor: primaryColor }}
            />
          </div>
        )}
      </div>

      {/* Hint */}
      {!loading && !result && (
        <p className="text-[10px] mt-1.5" style={{ color: 'rgba(255,255,255,0.25)' }}>
          Just type naturally — we&#39;ll figure it out
        </p>
      )}

      {/* Error */}
      {error && (
        <p className="text-[11px] mt-2" style={{ color: '#FCA5A5' }}>⚠️ {error}</p>
      )}

      {/* ── Result cards ─────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {result && !confirmed && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.25 }}
            className="mt-3 space-y-2"
          >
            {/* ── HIGH confidence (≥85) — green confirmation card ─────────────── */}
            {result.confidence >= 85 && (
              <div
                className="rounded-xl p-4"
                style={{ background: 'rgba(34,197,94,0.08)', border: '0.5px solid rgba(34,197,94,0.25)' }}
              >
                <p className="text-xs font-semibold mb-2" style={{ color: '#4ADE80' }}>
                  ✓ We understood:
                </p>
                <p className="text-sm text-white font-medium mb-0.5">
                  {result.parsed.year ? `${result.parsed.year}${['st','nd','rd','th'][Math.min(result.parsed.year-1,3)]} Year ` : ''}{result.parsed.degree}
                </p>
                {result.college && (
                  <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    at {result.college.name}, {result.college.city}
                    {result.college.university ? ` (${result.college.university})` : ''}
                  </p>
                )}
                {getSubjectPreview(result) && (
                  <p className="text-[10px] mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>
                    📚 {getSubjectPreview(result)}
                  </p>
                )}
                <p className="text-[11px] font-medium mb-2" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  Is this right?
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={handleConfirm}
                    className="flex-1 py-2 rounded-lg text-xs font-bold transition-all"
                    style={{ background: 'rgba(34,197,94,0.2)', border: '0.5px solid rgba(34,197,94,0.4)', color: '#4ADE80' }}
                  >
                    Yes, that&#39;s me ✓
                  </button>
                  <button
                    onClick={handleCorrect}
                    className="flex-1 py-2 rounded-lg text-xs font-medium transition-all"
                    style={{ background: 'rgba(255,255,255,0.05)', border: '0.5px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)' }}
                  >
                    Let me correct this
                  </button>
                </div>
              </div>
            )}

            {/* ── MEDIUM confidence (60–84) — "Did you mean" ──────────────────── */}
            {result.confidence >= 60 && result.confidence < 85 && (
              <div
                className="rounded-xl p-4"
                style={{ background: `${primaryColor}0d`, border: `0.5px solid ${primaryColor}44` }}
              >
                <p className="text-xs font-semibold mb-2" style={{ color: primaryColor }}>
                  Did you mean…
                </p>
                {result.college && (
                  <button
                    onClick={handleConfirm}
                    className="w-full text-left rounded-lg px-3 py-2.5 mb-2 transition-all"
                    style={{ background: `${primaryColor}15`, border: `0.5px solid ${primaryColor}33` }}
                  >
                    <p className="text-sm text-white font-medium">
                      {result.college.name}
                    </p>
                    <p className="text-[10px]" style={{ color: 'rgba(255,255,255,0.4)' }}>
                      {result.college.city}, {result.college.state}
                      {result.college.naac_grade ? ` · NAAC ${result.college.naac_grade}` : ''}
                    </p>
                  </button>
                )}
                {/* Alternatives */}
                {result.alternatives.slice(0, 2).map((alt) => (
                  <button
                    key={alt.id}
                    onClick={() => {
                      setResult((prev) => prev ? { ...prev, college: { ...alt, university: null, naac_grade: null }, confidence: 90 } : prev);
                    }}
                    className="w-full text-left rounded-lg px-3 py-2 mb-1.5 transition-all"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.08)' }}
                  >
                    <p className="text-xs text-white/70">{alt.name}</p>
                    <p className="text-[10px] text-white/35">{alt.city}, {alt.state}</p>
                  </button>
                ))}
                <button
                  onClick={handleCorrect}
                  className="text-[11px] mt-1"
                  style={{ color: 'rgba(255,255,255,0.35)' }}
                >
                  None of these — let me retype
                </button>
              </div>
            )}

            {/* ── LOW confidence (<60) — manual selection ─────────────────────── */}
            {result.confidence < 60 && (
              <div
                className="rounded-xl p-4"
                style={{ background: 'rgba(239,68,68,0.06)', border: '0.5px solid rgba(239,68,68,0.2)' }}
              >
                <p className="text-xs font-semibold mb-1" style={{ color: '#FCA5A5' }}>
                  We weren&#39;t sure — can you help us?
                </p>
                <p className="text-[10px] mb-3" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Select the closest match below, or retype more details.
                </p>
                {[result.college, ...result.alternatives].filter(Boolean).slice(0, 3).map((c) => (
                  <button
                    key={c!.id}
                    onClick={() => {
                      setResult((prev) => prev ? { ...prev, college: { ...c!, university: null, naac_grade: null }, confidence: 90 } : prev);
                    }}
                    className="w-full text-left rounded-lg px-3 py-2.5 mb-2 transition-all"
                    style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.1)' }}
                  >
                    <p className="text-xs text-white font-medium">{c!.name}</p>
                    <p className="text-[10px] text-white/35">{c!.city}, {c!.state}</p>
                  </button>
                ))}

                {/* Phase 2 — Community add button */}
                <button
                  onClick={handleAutoAdd}
                  disabled={autoAdding}
                  className="w-full mt-1 py-2 rounded-lg text-[11px] font-medium transition-all flex items-center justify-center gap-1.5"
                  style={{
                    background: 'rgba(99,102,241,0.12)',
                    border: '0.5px solid rgba(99,102,241,0.3)',
                    color: '#A5B4FC',
                    opacity: autoAdding ? 0.6 : 1,
                  }}
                >
                  {autoAdding ? (
                    <>
                      <span className="w-3 h-3 rounded-full border border-indigo-400/30 border-t-indigo-400 animate-spin" />
                      Adding to database…
                    </>
                  ) : (
                    '🌍 My college isn\'t listed — add it'
                  )}
                </button>

                <button
                  onClick={handleCorrect}
                  className="text-[11px] mt-2"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                >
                  Retype with more details →
                </button>
              </div>
            )}
          </motion.div>
        )}

        {/* ── Confirmed state ────────────────────────────────────────────────── */}
        {confirmed && result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-2 flex items-center gap-2 flex-wrap"
          >
            <span className="text-xs" style={{ color: '#4ADE80' }}>
              ✓ Saved: {result.parsed.degree} · Year {result.parsed.year}
            </span>
            {communityAdded && (
              <span
                className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
                style={{ background: 'rgba(99,102,241,0.2)', color: '#A5B4FC', border: '0.5px solid rgba(99,102,241,0.3)' }}
              >
                🌍 Added to EdUsaathiAI DB
              </span>
            )}
            <button
              onClick={handleCorrect}
              className="text-[10px] underline"
              style={{ color: 'rgba(255,255,255,0.3)' }}
            >
              edit
            </button>
          </motion.div>
        )}

        {/* ── Saathi mismatch nudge ────────────────────────────────────────── */}
        {showSaathiNudge && result && (
          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-2 rounded-xl p-3.5"
            style={{ background: 'rgba(79,70,229,0.1)', border: '0.5px solid rgba(79,70,229,0.25)' }}
          >
            <p className="text-xs text-white/70 mb-2">
              💡 Based on your course,{' '}
              <span className="font-semibold text-white capitalize">{result.saathi_suggestion}</span>{' '}
              might be a better match for you.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => onSaathiSwitch?.(result.saathi_suggestion!)}
                className="flex-1 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                style={{ background: 'rgba(79,70,229,0.25)', border: '0.5px solid rgba(79,70,229,0.4)', color: '#818CF8' }}
              >
                Switch to {result.saathi_suggestion}
              </button>
              <button
                onClick={() => setResult((prev) => prev ? { ...prev, saathi_suggestion: null } : prev)}
                className="flex-1 py-1.5 rounded-lg text-[11px] transition-all"
                style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.4)' }}
              >
                Keep current
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
