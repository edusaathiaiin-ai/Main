'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { useAuthStore } from '@/stores/authStore';
import { SAATHIS } from '@/constants/saathis';
import type { Profile } from '@/types';

// ── Types ─────────────────────────────────────────────────────────────────────

type VerificationStatus = 'pending' | 'verified' | 'rejected';

type FacultyProfile = {
  id: string;
  institution_name: string;
  department: string;
  designation: string | null;
  subject_expertise: string[];
  years_experience: number;
  verification_status: VerificationStatus;
  verified_at: string | null;
  rejection_reason: string | null;
};

type BoardQuestion = {
  id: string;
  vertical_id: string;
  body: string;
  ai_answer: string | null;
  faculty_verified: boolean;
  created_at: string;
  is_anonymous: boolean;
};

type MyAnswer = {
  id: string;
  body: string;
  created_at: string;
  faculty_verified: boolean;
  question_id: string;
  question_body?: string;
};

type FacultyTab = 'questions' | 'my_answers';
type QuestionFilter = 'unanswered' | 'all' | 'my_answers_tab';

// ── Verification badge ────────────────────────────────────────────────────────

function VerificationBadge({ status }: { status: VerificationStatus }) {
  if (status === 'verified') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full"
        style={{ background: 'rgba(34,197,94,0.15)', border: '0.5px solid rgba(34,197,94,0.4)', color: '#4ADE80' }}>
        ✓ Faculty Verified
      </span>
    );
  }
  if (status === 'rejected') {
    return (
      <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full"
        style={{ background: 'rgba(239,68,68,0.15)', border: '0.5px solid rgba(239,68,68,0.4)', color: '#F87171' }}>
        ✕ Please resubmit
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-full"
      style={{ background: 'rgba(234,179,8,0.15)', border: '0.5px solid rgba(234,179,8,0.4)', color: '#FACC15' }}>
      ⏳ Verification pending
    </span>
  );
}

// ── Skill chip ────────────────────────────────────────────────────────────────

function SubjectTag({ label }: { label: string }) {
  return (
    <span className="text-xs px-2.5 py-1 rounded-full font-medium"
      style={{ background: 'rgba(201,153,58,0.12)', border: '0.5px solid rgba(201,153,58,0.3)', color: '#E5B86A' }}>
      {label}
    </span>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function FacultyPage() {
  const router = useRouter();
  const { profile } = useAuthStore();

  const [faculty, setFaculty] = useState<FacultyProfile | null>(null);
  const [questions, setQuestions] = useState<BoardQuestion[]>([]);
  const [myAnswers, setMyAnswers] = useState<MyAnswer[]>([]);
  const [tab, setTab] = useState<FacultyTab>('questions');
  const [qFilter, setQFilter] = useState<QuestionFilter>('unanswered');
  const [loading, setLoading] = useState(true);
  const [answerText, setAnswerText] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<string | null>(null);
  const [expandedAi, setExpandedAi] = useState<Set<string>>(new Set());

  // Load faculty profile
  useEffect(() => {
    if (!profile) return;
    const supabase = createClient();

    async function load() {
      setLoading(true);
      const { data } = await supabase
        .from('faculty_profiles')
        .select('*')
        .eq('user_id', profile!.id)
        .maybeSingle();
      setFaculty(data as FacultyProfile | null);
      setLoading(false);
    }

    load();
  }, [profile]);

  // Load questions for faculty's subject area
  useEffect(() => {
    if (!faculty) return;
    const supabase = createClient();

    async function loadQuestions() {
      const saathi = SAATHIS.find((s) =>
        faculty!.subject_expertise.some((e) =>
          s.name.toLowerCase().includes(e.toLowerCase().split(' ')[0]) ||
          e.toLowerCase().includes(s.name.toLowerCase().split(' ')[0])
        )
      ) ?? SAATHIS[0];

      let q = supabase
        .from('board_questions')
        .select('*')
        .eq('vertical_id', saathi.id)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(30);

      if (qFilter === 'unanswered') q = q.is('ai_answer', null);

      const { data } = await q;
      setQuestions((data ?? []) as BoardQuestion[]);
    }

    loadQuestions();
  }, [faculty, qFilter]);

  // Load my answers
  useEffect(() => {
    if (!profile || tab !== 'my_answers') return;
    const supabase = createClient();

    async function loadMyAnswers() {
      const { data } = await supabase
        .from('board_answers')
        .select('id, body, created_at, faculty_verified, question_id')
        .eq('user_id', profile!.id)
        .eq('is_faculty_answer', true)
        .order('created_at', { ascending: false })
        .limit(50);

      setMyAnswers((data ?? []) as MyAnswer[]);
    }

    loadMyAnswers();
  }, [profile, tab]);

  async function submitAnswer(questionId: string) {
    if (!profile || !answerText[questionId]?.trim()) return;
    setSubmitting(questionId);
    const supabase = createClient();

    await supabase.from('board_answers').insert({
      question_id: questionId,
      user_id: profile.id,
      body: answerText[questionId].trim(),
      is_faculty_answer: true,
      faculty_verified: faculty?.verification_status === 'verified',
    });

    setAnswerText((prev) => ({ ...prev, [questionId]: '' }));
    setSubmitting(null);
    // Remove answered question from list
    setQuestions((prev) => prev.filter((q) => q.id !== questionId));
  }

  function toggleAi(id: string) {
    setExpandedAi((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: '#060F1D' }}>
        <div className="w-10 h-10 rounded-full border-2 border-white/10 animate-spin" style={{ borderTopColor: '#C9993A' }} />
      </main>
    );
  }

  const displayName = profile?.full_name ?? 'Faculty';
  const designation = faculty?.designation ?? 'Faculty';

  return (
    <main className="min-h-screen" style={{ background: 'linear-gradient(180deg, #060F1D 0%, #0B1F3A 60%, #060F1D 100%)' }}>
      {/* Top nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <span className="font-playfair text-xl font-bold" style={{ color: '#C9993A' }}>EdUsaathiAI</span>
        <div className="flex items-center gap-4">
          <button
            onClick={() => router.push('/chat')}
            className="text-sm transition-colors"
            style={{ color: 'rgba(255,255,255,0.4)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#fff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.4)')}
          >
            Open Saathi →
          </button>
          <button
            onClick={async () => {
              const supabase = createClient();
              await supabase.auth.signOut();
              router.push('/login');
            }}
            className="text-xs px-3 py-1.5 rounded-lg transition-colors"
            style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)' }}
          >
            Sign out
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Header card */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-6 mb-6"
          style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.08)' }}
        >
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-xs font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
                {designation} · {faculty?.institution_name ?? 'Institution'}
              </p>
              <h1 className="font-playfair text-3xl font-bold text-white mb-2">
                Welcome, {displayName.split(' ')[0]}
              </h1>
              <div className="flex flex-wrap items-center gap-2">
                <VerificationBadge status={faculty?.verification_status ?? 'pending'} />
                {faculty?.subject_expertise.map((s) => <SubjectTag key={s} label={s} />)}
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>{faculty?.years_experience ?? 0} yrs experience</p>
              <p className="text-sm font-medium mt-1 text-white/60">{faculty?.department ?? 'Department'}</p>
            </div>
          </div>

          {/* Pending info card */}
          {faculty?.verification_status === 'pending' && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1, transition: { delay: 0.2 } }}
              className="mt-4 rounded-xl p-4"
              style={{ background: 'rgba(201,153,58,0.08)', border: '0.5px solid rgba(201,153,58,0.25)' }}
            >
              <p className="text-sm" style={{ color: '#E5B86A' }}>
                📋 Your faculty application is under review. Our team verifies within 48 hours.
                <br />
                <span className="text-xs opacity-70 mt-1 block">You have full access while you wait. Answers will be marked as &ldquo;pending verification&rdquo;.</span>
              </p>
            </motion.div>
          )}
          {faculty?.verification_status === 'rejected' && faculty.rejection_reason && (
            <div className="mt-4 rounded-xl p-4" style={{ background: 'rgba(239,68,68,0.08)', border: '0.5px solid rgba(239,68,68,0.25)' }}>
              <p className="text-sm" style={{ color: '#F87171' }}>Reason: {faculty.rejection_reason}</p>
            </div>
          )}
        </motion.div>

        {/* Tab bar */}
        <div className="flex gap-1 mb-6 p-1 rounded-xl" style={{ background: 'rgba(255,255,255,0.04)', border: '0.5px solid rgba(255,255,255,0.06)', width: 'fit-content' }}>
          {(['questions', 'my_answers'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className="px-5 py-2 rounded-lg text-sm font-medium transition-all duration-200"
              style={{
                background: tab === t ? '#C9993A' : 'transparent',
                color: tab === t ? '#060F1D' : 'rgba(255,255,255,0.45)',
              }}
            >
              {t === 'questions' ? '❓ Questions' : '✍️ My Answers'}
            </button>
          ))}
        </div>

        {/* Questions tab */}
        {tab === 'questions' && (
          <div>
            {/* Filter bar */}
            <div className="flex gap-2 mb-5">
              {(['unanswered', 'all'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setQFilter(f)}
                  className="px-4 py-2 rounded-full text-sm font-medium transition-all"
                  style={{
                    background: qFilter === f ? 'rgba(201,153,58,0.2)' : 'rgba(255,255,255,0.04)',
                    border: `0.5px solid ${qFilter === f ? 'rgba(201,153,58,0.5)' : 'rgba(255,255,255,0.08)'}`,
                    color: qFilter === f ? '#E5B86A' : 'rgba(255,255,255,0.45)',
                  }}
                >
                  {f === 'unanswered' ? 'Unanswered' : 'All Questions'}
                </button>
              ))}
            </div>

            {questions.length === 0 ? (
              <div className="text-center py-20">
                <p className="font-playfair text-xl text-white/30 mb-2">No questions right now</p>
                <p className="text-sm text-white/20">Check back soon — students ask every day.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {questions.map((q) => (
                  <motion.div
                    key={q.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl p-5"
                    style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.08)' }}
                  >
                    {/* Question */}
                    <p className="text-white text-sm leading-relaxed mb-3">{q.body}</p>
                    <p className="text-xs mb-3" style={{ color: 'rgba(255,255,255,0.25)' }}>
                      {new Date(q.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>

                    {/* AI answer toggle */}
                    {q.ai_answer && (
                      <button
                        onClick={() => toggleAi(q.id)}
                        className="text-xs mb-3 underline underline-offset-2"
                        style={{ color: 'rgba(255,255,255,0.35)' }}
                      >
                        {expandedAi.has(q.id) ? '▲ Hide AI answer' : '▼ See AI answer first'}
                      </button>
                    )}
                    <AnimatePresence>
                      {expandedAi.has(q.id) && q.ai_answer && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mb-3 p-3 rounded-xl text-xs leading-relaxed"
                          style={{ background: 'rgba(255,255,255,0.04)', color: 'rgba(255,255,255,0.55)' }}
                        >
                          {q.ai_answer}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Answer input */}
                    <div className="mt-1">
                      <textarea
                        value={answerText[q.id] ?? ''}
                        onChange={(e) => setAnswerText((prev) => ({ ...prev, [q.id]: e.target.value }))}
                        placeholder="Add your expert answer…"
                        rows={3}
                        className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none resize-none transition-all"
                        style={{
                          background: 'rgba(255,255,255,0.05)',
                          border: '0.5px solid rgba(255,255,255,0.1)',
                        }}
                        onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(201,153,58,0.5)')}
                        onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
                      />
                      <div className="flex justify-end mt-2">
                        <button
                          onClick={() => submitAnswer(q.id)}
                          disabled={!answerText[q.id]?.trim() || submitting === q.id}
                          className="px-5 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                          style={{ background: '#C9993A', color: '#060F1D' }}
                        >
                          {submitting === q.id ? 'Posting…' : 'Post Answer →'}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* My Answers tab */}
        {tab === 'my_answers' && (
          <div className="space-y-4">
            {myAnswers.length === 0 ? (
              <div className="text-center py-20">
                <p className="font-playfair text-xl text-white/30 mb-2">No answers yet</p>
                <p className="text-sm text-white/20">Answer student questions in the Questions tab.</p>
              </div>
            ) : (
              myAnswers.map((a) => (
                <div
                  key={a.id}
                  className="rounded-2xl p-5"
                  style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.08)' }}
                >
                  <div className="flex items-center gap-2 mb-3">
                    {a.faculty_verified ? (
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: 'rgba(34,197,94,0.15)', color: '#4ADE80' }}>✓ Verified</span>
                    ) : (
                      <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: 'rgba(234,179,8,0.12)', color: '#FACC15' }}>Pending</span>
                    )}
                    <span className="text-xs" style={{ color: 'rgba(255,255,255,0.25)' }}>
                      {new Date(a.created_at).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                  <p className="text-sm text-white leading-relaxed">{a.body}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </main>
  );
}
