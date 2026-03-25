'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { SAATHIS } from '@/constants/saathis';
import { useAuthStore } from '@/stores/authStore';
import {
  ACADEMIC_LEVEL_CARDS,
  instantCalibrate,
  type AcademicLevel,
  type AcademicLevelCard,
} from '@/lib/instantSoulCalibration';
import type { Saathi, Profile } from '@/types';

// ── Types ─────────────────────────────────────────────────────────────────────

type DbUserRole = 'student' | 'faculty' | 'public' | 'institution';
type OnboardStep = 'loading' | 'role_extra' | 'academic' | 'saathi' | 'profile';

type MinProfile = {
  id: string;
  role: DbUserRole | null;
  primary_saathi_id: string | null;
  full_name: string | null;
  academic_level: string | null;
};

type ProfileForm = {
  fullName: string;
  city: string;
  institution: string;
  examTarget: string;
  futureResearch: string;
  // Level-specific
  previousDegree: string;
  thesisArea: string;
  prepDuration: string;
  currentYear: number | null;
  totalYears: number | null;
  // Faculty-specific
  facultySubject: string;
  facultyYears: string;
  // Institution-specific
  orgName: string;
  orgType: string;
  orgContactEmail: string;
};

// ── Constants ─────────────────────────────────────────────────────────────────

const CITIES = [
  'Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Hyderabad',
  'Ahmedabad', 'Pune', 'Kolkata', 'Jaipur', 'Surat',
  'Vadodara', 'Rajkot', 'Nagpur', 'Lucknow', 'Bhopal',
  'Indore', 'Patna', 'Chandigarh', 'Kochi', 'Coimbatore', 'Other',
];

const PREP_DURATIONS = [
  'Just started', '3–6 months', '6–12 months', '1–2 years', '2+ years',
];

// All 24 Saathis are now live
const LIVE_SAATHIS = { has: (_id: string) => true };

// ── Animation presets ─────────────────────────────────────────────────────────

const spring = { type: 'spring', stiffness: 300, damping: 30 } as const;

const stepVariants = {
  enter: { x: 60, opacity: 0 },
  center: { x: 0, opacity: 1, transition: { duration: 0.3 } },
  exit: { x: -60, opacity: 0, transition: { duration: 0.2 } },
};

const cardItem = {
  enter: { opacity: 0, y: 16 },
  center: { opacity: 1, y: 0, transition: { duration: 0.28 } },
};

// ── Step Indicator ────────────────────────────────────────────────────────────

function StepIndicator({ step }: { step: OnboardStep }) {
  const steps: Exclude<OnboardStep, 'loading'>[] = ['academic', 'saathi', 'profile'];
  const labels = ['Academic Level', 'Your Saathi', 'Your Profile'];
  const currentIdx = steps.indexOf(step as Exclude<OnboardStep, 'loading'>);
  return (
    <div className="flex items-center gap-2">
      {steps.map((s, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <div key={s} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <motion.div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold"
                animate={{
                  background: done ? '#C9993A' : active ? 'rgba(201,153,58,0.2)' : 'rgba(255,255,255,0.06)',
                  borderColor: done || active ? '#C9993A' : 'rgba(255,255,255,0.12)',
                  color: done ? '#060F1D' : active ? '#C9993A' : 'rgba(255,255,255,0.25)',
                }}
                style={{ border: '1.5px solid' }}
                transition={spring}
              >
                {done ? '✓' : i + 1}
              </motion.div>
              <span className="text-[9px] hidden sm:block" style={{ color: active ? '#C9993A' : 'rgba(255,255,255,0.25)' }}>
                {labels[i]}
              </span>
            </div>
            {i < steps.length - 1 && (
              <motion.div
                className="h-px w-8 mb-3"
                animate={{ background: done ? '#C9993A' : 'rgba(255,255,255,0.1)' }}
                transition={spring}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 text-sm transition-colors duration-150"
      style={{ color: 'rgba(255,255,255,0.35)' }}
      onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
      onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
    >
      ← Back
    </button>
  );
}

function InputField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
        {label}{required && <span className="ml-0.5" style={{ color: '#C9993A' }}>*</span>}
      </label>
      {children}
    </div>
  );
}

const inputStyle = {
  background: 'rgba(255,255,255,0.05)',
  border: '0.5px solid rgba(255,255,255,0.1)',
  color: '#fff',
} as const;

// ── Step 0: Academic Level ────────────────────────────────────────────────────

function AcademicLevelStep({
  onContinue,
  saving,
}: {
  onContinue: (level: AcademicLevel, yearIdx: number | null, examTarget: string | null) => Promise<void>;
  saving: boolean;
}) {
  const [selected, setSelected] = useState<AcademicLevelCard | null>(null);
  const [yearIdx, setYearIdx] = useState<number | null>(null);
  const [examTarget, setExamTarget] = useState<string | null>(null);

  const canProceed = !!selected && (
    selected.yearOptions.length === 0 ||
    yearIdx !== null ||
    examTarget !== null
  );

  function handleCardClick(card: AcademicLevelCard) {
    setSelected(card);
    setYearIdx(null);
    setExamTarget(null);
  }

  async function handleContinue() {
    if (!selected) return;
    const resolvedYear = selected.id === 'competitive' ? null : yearIdx;
    const resolvedExam = selected.id === 'competitive' ? examTarget : null;
    await onContinue(selected.id, resolvedYear, resolvedExam);
  }

  return (
    <div className="flex flex-col items-center w-full px-4 py-8 max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="font-playfair text-4xl md:text-5xl font-bold text-white mb-3">
          Where are you right now?
        </h1>
        <p className="text-white/50 text-lg">Your Saathi calibrates instantly to your level</p>
      </motion.div>

      {/* 8 Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full mb-6">
        {ACADEMIC_LEVEL_CARDS.map((card, i) => {
          const isSelected = selected?.id === card.id;
          return (
            <motion.button
              key={card.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0, transition: { delay: i * 0.06 } }}
              onClick={() => handleCardClick(card)}
              whileHover={{ y: -4, transition: { duration: 0.18 } }}
              className="relative text-left rounded-2xl p-4 outline-none transition-shadow"
              style={{
                background: isSelected ? `${card.color}22` : 'rgba(255,255,255,0.03)',
                border: `1.5px solid ${isSelected ? card.color : 'rgba(255,255,255,0.07)'}`,
                boxShadow: isSelected ? `0 0 24px ${card.color}33` : undefined,
              }}
            >
              {isSelected && (
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-3 right-3 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                  style={{ background: card.color, color: '#fff' }}
                >
                  ✓
                </motion.div>
              )}
              <span className="text-3xl mb-2 block">{card.emoji}</span>
              <p className="text-white font-semibold text-sm mb-0.5">{card.title}</p>
              <p className="text-[11px] mb-1.5" style={{ color: 'rgba(255,255,255,0.45)' }}>{card.subtitle}</p>
              <p className="text-[10px] px-2 py-0.5 rounded-full inline-block" style={{ background: `${card.color}22`, color: card.color }}>
                {card.durationHint}
              </p>
            </motion.button>
          );
        })}
      </div>

      {/* Sub-question — appears inline below cards when card is selected */}
      <AnimatePresence mode="wait">
        {selected && selected.yearOptions.length > 0 && (
          <motion.div
            key={selected.id}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="w-full mb-6 overflow-hidden"
          >
            <div className="rounded-2xl p-5" style={{ background: `${selected.color}12`, border: `1px solid ${selected.color}33` }}>
              <p className="text-sm font-semibold mb-3 text-white">{selected.yearQuestion}</p>
              <div className="flex flex-wrap gap-2">
                {selected.yearOptions.map((opt, i) => {
                  const isYearActive = selected.id === 'competitive' ? examTarget === opt : yearIdx === i;
                  return (
                    <button
                      key={opt}
                      onClick={() => {
                        if (selected.id === 'competitive') {
                          setExamTarget(opt);
                          setYearIdx(null);
                        } else {
                          setYearIdx(i);
                          setExamTarget(null);
                        }
                      }}
                      className="rounded-full px-4 py-2 text-sm font-medium transition-all duration-150"
                      style={{
                        background: isYearActive ? selected.color : 'rgba(255,255,255,0.06)',
                        border: `0.5px solid ${isYearActive ? selected.color : 'rgba(255,255,255,0.12)'}`,
                        color: isYearActive ? '#fff' : 'rgba(255,255,255,0.6)',
                      }}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        animate={{
          opacity: canProceed ? 1 : 0.4,
          background: canProceed && selected ? selected.color : 'rgba(255,255,255,0.1)',
        }}
        onClick={handleContinue}
        disabled={!canProceed || saving}
        className="w-full max-w-xs rounded-xl py-4 text-base font-semibold text-white transition-all duration-200 disabled:cursor-not-allowed"
      >
        {saving ? (
          <span className="flex items-center justify-center gap-2">
            <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
            Calibrating…
          </span>
        ) : canProceed ? `Continue as ${selected?.title} →` : 'Select your level to continue'}
      </motion.button>
    </div>
  );
}

// ── Step 1: Saathi Picker ─────────────────────────────────────────────────────

function SaathiStep({
  onContinue,
  onBack,
  saving,
}: {
  onContinue: (saathiId: string) => Promise<void>;
  onBack: () => void;
  saving: boolean;
}) {
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Saathi | null>(null);

  const filtered = useMemo(() => {
    if (!search.trim()) return SAATHIS;
    const q = search.toLowerCase();
    return SAATHIS.filter(
      (s) => s.name.toLowerCase().includes(q) || s.tagline.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <div className="flex flex-col items-center w-full px-4 py-8">
      <motion.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-6">
        <h2 className="font-playfair text-4xl md:text-5xl font-bold text-white mb-3">Pick your Saathi</h2>
        <p className="text-white/50 text-base">Your primary subject companion. <span className="text-white/30">Add more later.</span></p>
      </motion.div>

      <div className="w-full max-w-md mb-6">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search subjects…"
          className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
          style={inputStyle}
          onFocus={(e) => (e.currentTarget.style.outline = '1.5px solid #C9993A')}
          onBlur={(e) => (e.currentTarget.style.outline = 'none')}
        />
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 w-full max-w-4xl mb-8">
        {filtered.map((saathi) => {
          const isSelected = selected?.id === saathi.id;
          const isLive = LIVE_SAATHIS.has(saathi.id);
          return (
            <motion.button
              key={saathi.id}
              variants={cardItem}
              onClick={() => setSelected(saathi)}
              whileHover={{ y: -4, transition: { duration: 0.18 } }}
              className="relative text-left rounded-xl p-4 outline-none"
              style={{
                background: isSelected ? `${saathi.primary}33` : 'rgba(255,255,255,0.03)',
                border: `1.5px solid ${isSelected ? '#C9993A' : 'rgba(255,255,255,0.07)'}`,
                boxShadow: isSelected ? '0 0 20px rgba(201,153,58,0.2)' : undefined,
              }}
            >
              <div className="absolute top-2 right-2">
                {isSelected ? (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{ background: '#C9993A', color: '#060F1D' }}
                  >✓</motion.div>
                ) : isLive ? (
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: 'rgba(34,197,94,0.15)', border: '0.5px solid rgba(34,197,94,0.4)', color: '#4ADE80' }}>
                    LIVE ✓
                  </span>
                ) : null}
              </div>
              <span className="text-[40px] mb-2 block leading-none">{saathi.emoji}</span>
              <p className="text-white font-bold text-xs mb-0.5 leading-tight">{saathi.name}</p>
              <p className="text-[10px] leading-relaxed line-clamp-2" style={{ color: 'rgba(255,255,255,0.38)' }}>{saathi.tagline}</p>
            </motion.button>
          );
        })}
      </div>

      <div className="flex flex-col items-center gap-3">
        <motion.button
          animate={{
            opacity: selected ? 1 : 0.4,
            background: selected?.primary ?? 'rgba(255,255,255,0.1)',
          }}
          onClick={() => selected && onContinue(selected.id)}
          disabled={!selected || saving}
          className="w-full max-w-xs rounded-xl py-4 text-base font-semibold text-white disabled:cursor-not-allowed"
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
              Saving…
            </span>
          ) : selected ? `Begin with ${selected.name} →` : 'Choose a Saathi to continue'}
        </motion.button>
        <BackButton onClick={onBack} />
      </div>
    </div>
  );
}

// ── Step 2: Profile Form (level-adaptive) ─────────────────────────────────────

function ProfileStep({
  academicLevel,
  examTargetFromLevel,
  onContinue,
  onSkip,
  onBack,
  saving,
}: {
  academicLevel: AcademicLevel;
  examTargetFromLevel: string | null;
  onContinue: (form: ProfileForm) => Promise<void>;
  onSkip: () => void;
  onBack: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState<ProfileForm>({
    fullName: '',
    city: '',
    institution: '',
    examTarget: examTargetFromLevel ?? '',
    futureResearch: '',
    previousDegree: '',
    thesisArea: '',
    prepDuration: '',
    currentYear: null,
    totalYears: null,
    facultySubject: '',
    facultyYears: '',
    orgName: '',
    orgType: '',
    orgContactEmail: '',
  });

  const set = (key: keyof ProfileForm) => (val: string | number | null) =>
    setForm((prev) => ({ ...prev, [key]: val }));

  const canSubmit = form.fullName.trim().length > 0 && form.city !== '';

  const isPhD = academicLevel === 'phd' || academicLevel === 'postdoc';
  const isMasters = academicLevel === 'masters';
  const isCompetitive = academicLevel === 'competitive';
  const isProfessional = academicLevel === 'professional_learner';

  const levelLabel: Record<AcademicLevel, string> = {
    diploma: 'Diploma / Certificate',
    bachelor: "Bachelor's",
    masters: "Master's",
    phd: 'PhD / Doctorate',
    professional: 'Professional Programme',
    postdoc: 'Postdoc',
    competitive: 'Exam Prep',
    professional_learner: 'Working Professional',
    exploring: 'Explorer',
  };

  return (
    <div className="flex flex-col items-center w-full px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-xl mb-6"
      >
        {/* Level badge */}
        <div className="mb-4">
          <span className="text-[11px] font-bold px-3 py-1 rounded-full" style={{ background: 'rgba(201,153,58,0.15)', border: '0.5px solid rgba(201,153,58,0.3)', color: '#C9993A' }}>
            {levelLabel[academicLevel]} · Soul calibrated ✓
          </span>
        </div>
        <h2 className="font-playfair text-3xl md:text-4xl font-bold text-white mb-2">
          Tell your Saathi about you
        </h2>
        <p className="text-sm mb-6" style={{ color: 'rgba(255,255,255,0.4)' }}>
          The more you share, the more personal your Saathi becomes.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1, transition: { delay: 0.12 } }}
        className="w-full max-w-xl space-y-4"
      >
        {/* Full name */}
        <InputField label="Full name" required>
          <input
            type="text"
            value={form.fullName}
            onChange={(e) => set('fullName')(e.target.value)}
            placeholder="Your name as your Saathi will call you"
            className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
            style={inputStyle}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(201,153,58,0.6)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
          />
        </InputField>

        {/* City */}
        <InputField label="City" required>
          <select
            value={form.city}
            onChange={(e) => set('city')(e.target.value)}
            className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all appearance-none"
            style={{ ...inputStyle, color: form.city ? '#fff' : 'rgba(255,255,255,0.35)' }}
          >
            <option value="" disabled style={{ background: '#0B1F3A' }}>Select your city</option>
            {CITIES.map((c) => (
              <option key={c} value={c} style={{ background: '#0B1F3A', color: '#fff' }}>{c}</option>
            ))}
          </select>
        </InputField>

        {/* Institution */}
        <InputField label={isPhD ? 'Institution & Department' : 'Institution / College'}>
          <input
            type="text"
            value={form.institution}
            onChange={(e) => set('institution')(e.target.value)}
            placeholder={isPhD ? 'e.g. IIT Bombay, Dept. of Electrical Engineering' : 'e.g. Mumbai University, NLU, AIIMS'}
            className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
            style={inputStyle}
            onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(201,153,58,0.6)')}
            onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
          />
        </InputField>

        {/* ── Level-adaptive fields ── */}

        {/* Masters: previous degree + specialisation */}
        {isMasters && (
          <>
            <InputField label="What did you complete before this?">
              <input
                type="text"
                value={form.previousDegree}
                onChange={(e) => set('previousDegree')(e.target.value)}
                placeholder="e.g. B.Tech Mech from NIT Surat"
                className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(201,153,58,0.6)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
            </InputField>
            <InputField label="Your specialisation / thesis area">
              <input
                type="text"
                value={form.thesisArea}
                onChange={(e) => set('thesisArea')(e.target.value)}
                placeholder="e.g. Thermal Engineering / Heat Transfer"
                className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(201,153,58,0.6)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
            </InputField>
          </>
        )}

        {/* PhD: thesis topic (required) + previous degree */}
        {isPhD && (
          <>
            <InputField label="Your thesis topic / research area" required>
              <textarea
                value={form.thesisArea}
                onChange={(e) => set('thesisArea')(e.target.value)}
                placeholder="What is your research question? Even a rough statement is fine."
                rows={3}
                className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all resize-none"
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(201,153,58,0.6)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
            </InputField>
            <InputField label="Your previous degree">
              <input
                type="text"
                value={form.previousDegree}
                onChange={(e) => set('previousDegree')(e.target.value)}
                placeholder="e.g. M.Tech from IIT Delhi"
                className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(201,153,58,0.6)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
            </InputField>
          </>
        )}

        {/* Competitive: exam target (pre-filled) + prep duration + optional subject */}
        {isCompetitive && (
          <>
            <InputField label="Target exam">
              <input
                type="text"
                value={form.examTarget}
                onChange={(e) => set('examTarget')(e.target.value)}
                placeholder="UPSC / GATE / NEET / CA…"
                className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(201,153,58,0.6)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
            </InputField>
            <InputField label="How long have you been preparing?">
              <div className="flex flex-wrap gap-2 mt-0.5">
                {PREP_DURATIONS.map((d) => {
                  const isActive = form.prepDuration === d;
                  return (
                    <button
                      key={d}
                      type="button"
                      onClick={() => set('prepDuration')(isActive ? '' : d)}
                      className="rounded-full px-4 py-2 text-sm font-medium transition-all duration-150"
                      style={{
                        background: isActive ? '#C9993A' : 'rgba(255,255,255,0.05)',
                        border: `0.5px solid ${isActive ? '#C9993A' : 'rgba(255,255,255,0.1)'}`,
                        color: isActive ? '#060F1D' : 'rgba(255,255,255,0.6)',
                      }}
                    >
                      {d}
                    </button>
                  );
                })}
              </div>
            </InputField>
          </>
        )}

        {/* Working professional: role + upskilling area */}
        {isProfessional && (
          <>
            <InputField label="Your current role / industry">
              <input
                type="text"
                value={form.previousDegree}
                onChange={(e) => set('previousDegree')(e.target.value)}
                placeholder="e.g. Software Engineer at Infosys"
                className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(201,153,58,0.6)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
            </InputField>
            <InputField label="What are you upskilling in?">
              <input
                type="text"
                value={form.thesisArea}
                onChange={(e) => set('thesisArea')(e.target.value)}
                placeholder="e.g. Machine Learning, Corporate Law, Finance"
                className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
                style={inputStyle}
                onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(201,153,58,0.6)')}
                onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
            </InputField>
          </>
        )}

        {/* Future research (for bachelor/diploma) or "What brings you here?" (exploring) */}
        {!isPhD && !isMasters && !isCompetitive && !isProfessional && (
          <InputField label={academicLevel === 'exploring' ? 'What are you curious about?' : 'Future research / career dream'}>
            <textarea
              value={form.futureResearch}
              onChange={(e) => set('futureResearch')(e.target.value)}
              placeholder={
                academicLevel === 'exploring'
                  ? 'Tell us what brings you here today'
                  : 'What excites you most, even if it feels far away?'
              }
              rows={3}
              className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all resize-none"
              style={inputStyle}
              onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(201,153,58,0.6)')}
              onBlur={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)')}
            />
          </InputField>
        )}

        {/* Submit */}
        <motion.button
          animate={{ opacity: canSubmit ? 1 : 0.45 }}
          onClick={() => canSubmit && onContinue(form)}
          disabled={!canSubmit || saving}
          className="w-full rounded-xl py-4 text-base font-semibold mt-2 transition-colors duration-200 disabled:cursor-not-allowed"
          style={{ background: '#C9993A', color: '#060F1D' }}
          onMouseEnter={(e) => { if (canSubmit && !saving) e.currentTarget.style.background = '#E5B86A'; }}
          onMouseLeave={(e) => (e.currentTarget.style.background = '#C9993A')}
        >
          {saving ? (
            <span className="flex items-center justify-center gap-2">
              <span className="w-4 h-4 rounded-full border-2 border-[#060F1D]/30 border-t-[#060F1D] animate-spin" />
              Setting up your Saathi…
            </span>
          ) : 'Begin Your Journey →'}
        </motion.button>

        <div className="flex items-center justify-between">
          <BackButton onClick={onBack} />
          <button
            onClick={onSkip}
            className="text-xs underline underline-offset-2 transition-colors duration-150"
            style={{ color: 'rgba(255,255,255,0.25)' }}
            onMouseEnter={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.45)')}
            onMouseLeave={(e) => (e.currentTarget.style.color = 'rgba(255,255,255,0.25)')}
          >
            Skip for now — I&apos;ll complete this later
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Main Onboard Page ─────────────────────────────────────────────────────────

export default function OnboardPage() {
  return (
    <Suspense fallback={
      <main className="min-h-screen flex items-center justify-center" style={{ background: '#060F1D' }}>
        <div className="w-10 h-10 rounded-full border-2 border-white/10 animate-spin" style={{ borderTopColor: '#C9993A' }} />
      </main>
    }>
      <OnboardInner />
    </Suspense>
  );
}

function OnboardInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { setProfile } = useAuthStore();
  const [step, setStep] = useState<OnboardStep>('loading');
  const [profile, setLocalProfile] = useState<MinProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [urlRole, setUrlRole] = useState<DbUserRole | null>(null);
  // Academic level state (carried through all steps)
  const [academicLevel, setAcademicLevel] = useState<AcademicLevel>('bachelor');
  const [currentYear, setCurrentYear] = useState<number | null>(null);
  const [totalYears, setTotalYears] = useState<number | null>(null);
  const [examTargetFromLevel, setExamTargetFromLevel] = useState<string | null>(null);

  // ── Mount — runs ONCE only ────────────────────────────────────────────────
  const initRef = useRef(false);
  useEffect(() => {
    // Strict-mode / double-mount guard — ensures loadProfile runs exactly once
    if (initRef.current) return;
    initRef.current = true;

    // Read searchParams synchronously before async work (avoids stale closure)
    const roleParam = searchParams.get('role') as DbUserRole | null;
    if (roleParam) setUrlRole(roleParam);

    let cancelled = false;

    async function loadProfile() {
      const supabase = createClient();

      // ── Auth check ──────────────────────────────────────────────────────────
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.replace('/login'); return; }

      // ── Fetch profile with max 3 retries (3 s gap) — never infinite ─────────
      let data: {
        id: string;
        role: DbUserRole | null;
        primary_saathi_id: string | null;
        full_name: string | null;
        academic_level: string | null;
      } | null = null;

      for (let attempt = 0; attempt < 3; attempt++) {
        if (cancelled) return;
        const { data: row, error } = await supabase
          .from('profiles')
          .select('id, role, primary_saathi_id, full_name, academic_level')
          .eq('id', session.user.id)
          .single();

        if (!error && row) { data = row as unknown as MinProfile; break; }

        if (attempt < 2) {
          // Wait 3 s before next attempt
          await new Promise((r) => setTimeout(r, 3000));
        }
      }

      if (cancelled) return;

      if (!data) {
        // Profile still missing after 3 attempts — session is broken, back to login
        router.replace('/login?error=profile_missing');
        return;
      }

      const p = data as MinProfile;
      setLocalProfile(p);

      // Faculty and institution skip the academic level step
      const effectiveRole = roleParam ?? p.role;
      const skipAcademic = effectiveRole === 'faculty' || effectiveRole === 'institution';

      // Resume at the right step
      if (!p.primary_saathi_id) {
        setStep(skipAcademic ? 'saathi' : (p.academic_level ? 'saathi' : 'academic'));
      } else if (!p.full_name) {
        setStep('profile');
      } else {
        router.replace('/chat');
      }
    }

    loadProfile().catch(() => {
      if (!cancelled) router.replace('/login?error=profile_missing');
    });

    return () => { cancelled = true; };
  }, []); // ← EMPTY — runs exactly once on mount only

  // ── Step 0: Academic level ─────────────────────────────────────────────────
  async function handleAcademicLevel(
    level: AcademicLevel,
    yearIdx: number | null,
    examTarget: string | null,
  ) {
    setSaving(true);
    const supabase = createClient();

    // Compute year numbers from year index
    const card = ACADEMIC_LEVEL_CARDS.find((c) => c.id === level)!;
    const compYearIdx = yearIdx ?? 0;
    const compCurrentYear = level === 'competitive' || card.yearOptions.length === 0
      ? null
      : compYearIdx + 1;
    const compTotalYears = card.yearOptions.length > 0 && level !== 'competitive'
      ? card.yearOptions.length
      : null;

    // Map level → role (respect URL role override)
    const role: DbUserRole = urlRole ?? (card.mapToRole === 'public' ? 'public' : 'student');

    // Save academic_level + role to profiles
    await supabase.from('profiles').update({
      academic_level: level,
      role,
      exam_target: examTarget ?? undefined,
    }).eq('id', profile!.id);

    setAcademicLevel(level);
    setCurrentYear(compCurrentYear);
    setTotalYears(compTotalYears);
    setExamTargetFromLevel(examTarget);
    setLocalProfile((p) => p ? { ...p, academic_level: level, role } : p);
    setSaving(false);
    setStep('saathi');
  }

  // ── Step 1: Saathi selection ───────────────────────────────────────────────
  async function handleSaathi(saathiId: string) {
    setSaving(true);
    const supabase = createClient();
    await supabase.from('profiles').update({ primary_saathi_id: saathiId }).eq('id', profile!.id);
    setLocalProfile((p) => p ? { ...p, primary_saathi_id: saathiId } : p);
    setSaving(false);
    setStep('profile');
  }

  // ── Step 2: Profile form ───────────────────────────────────────────────────
  async function handleProfile(form: ProfileForm) {
    setSaving(true);
    const supabase = createClient();
    const userId = profile!.id;

    // Run calibration
    const calibration = instantCalibrate({
      academicLevel,
      currentYear,
      totalYears,
      examTarget: form.examTarget || examTargetFromLevel || null,
      previousDegree: form.previousDegree.trim() || null,
    });

    // Update profiles
    await supabase.from('profiles').update({
      full_name: form.fullName.trim(),
      city: form.city,
      institution_name: form.institution.trim() || null,
      academic_level: academicLevel,
      exam_target: form.examTarget || null,
      previous_degree: form.previousDegree.trim() || null,
      thesis_area: form.thesisArea.trim() || null,
      // Faculty / Institution extra fields (stored in metadata columns if they exist, no-op otherwise)
      ...(urlRole === 'faculty' ? { role: 'faculty' } : {}),
      ...(urlRole === 'institution' ? { role: 'institution' } : {}),
      is_active: true,
    }).eq('id', userId);

    // Upsert student_soul with calibrated values
    if (profile?.primary_saathi_id) {
      await supabase.from('student_soul').upsert(
        {
          user_id: userId,
          vertical_id: profile.primary_saathi_id,
          display_name: form.fullName.trim(),
          academic_level: academicLevel,
          depth_calibration: calibration.depth_calibration,
          peer_mode: calibration.peer_mode,
          exam_mode: calibration.exam_mode,
          ambition_level: calibration.ambition_level,
          flame_stage: calibration.flame_stage,
          career_discovery_stage: calibration.career_discovery_stage,
          prior_knowledge_base: calibration.prior_knowledge_base,
          future_research_area: form.thesisArea.trim() || form.futureResearch.trim() || null,
          preferred_tone: 'neutral',
          enrolled_subjects: [],
          future_subjects: [],
          top_topics: [],
          struggle_topics: [],
          session_count: 0,
        },
        { onConflict: 'user_id,vertical_id' }
      );
    }

    setProfile({
      ...profile,
      id: userId,
      full_name: form.fullName.trim(),
      city: form.city,
      institution_name: form.institution.trim() || null,
      is_active: true,
    } as unknown as Profile);

    setSaving(false);
    router.push('/chat');
  }

  function goBack() {
    if (step === 'saathi') {
      const skipAcademic = urlRole === 'faculty' || urlRole === 'institution';
      setStep(skipAcademic ? 'saathi' : 'academic');
    } else if (step === 'profile') setStep('saathi');
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  if (step === 'loading') {
    return (
      <main className="min-h-screen flex items-center justify-center" style={{ background: '#060F1D' }}>
        <div className="w-10 h-10 rounded-full border-2 border-white/10 animate-spin" style={{ borderTopColor: '#C9993A' }} />
      </main>
    );
  }

  return (
    <main
      className="min-h-screen relative overflow-x-hidden"
      style={{ background: 'linear-gradient(180deg, #060F1D 0%, #0B1F3A 55%, #060F1D 100%)' }}
    >
      {/* Ambient glow */}
      <div
        className="absolute pointer-events-none"
        style={{
          width: 800, height: 800,
          top: '20%', left: '50%',
          transform: 'translate(-50%, -50%)',
          background: 'radial-gradient(circle, rgba(201,153,58,0.06) 0%, transparent 70%)',
        }}
      />

      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-6 py-5 max-w-5xl mx-auto">
        <span className="font-playfair text-xl font-bold" style={{ color: '#C9993A' }}>
          EdUsaathiAI
        </span>
        {step !== 'academic' && <StepIndicator step={step} />}
      </div>

      {/* Step content */}
      <div className="relative z-10">
        <AnimatePresence mode="wait">
          {step === 'academic' && (
            <motion.div key="academic" variants={stepVariants} initial="enter" animate="center" exit="exit">
              <AcademicLevelStep onContinue={handleAcademicLevel} saving={saving} />
            </motion.div>
          )}
          {step === 'saathi' && (
            <motion.div key="saathi" variants={stepVariants} initial="enter" animate="center" exit="exit">
              <SaathiStep onContinue={handleSaathi} onBack={goBack} saving={saving} />
            </motion.div>
          )}
          {step === 'profile' && (
            <motion.div key="profile" variants={stepVariants} initial="enter" animate="center" exit="exit">
              <ProfileStep
                academicLevel={academicLevel}
                examTargetFromLevel={examTargetFromLevel}
                onContinue={handleProfile}
                onSkip={() => router.push('/chat')}
                onBack={goBack}
                saving={saving}
              />
              {/* Faculty extra fields */}
              {urlRole === 'faculty' && (
                <div className="max-w-xl mx-auto px-4 pb-8">
                  <div className="rounded-2xl p-5 mt-4" style={{background:'rgba(22,163,74,0.08)',border:'0.5px solid rgba(22,163,74,0.25)'}}>
                    <p className="text-sm font-semibold mb-4" style={{color:'#4ADE80'}}>👨‍🏫 Faculty verification info</p>
                    <div className="space-y-3">
                      <input placeholder="Your institution and subject area (e.g. IIT Bombay · Physics)" className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none" style={{background:'rgba(255,255,255,0.05)',border:'0.5px solid rgba(255,255,255,0.1)'}} />
                      <input placeholder="Years of teaching experience" type="number" min="0" className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none" style={{background:'rgba(255,255,255,0.05)',border:'0.5px solid rgba(255,255,255,0.1)'}} />
                    </div>
                    <p className="text-xs mt-3" style={{color:'rgba(255,255,255,0.3)'}}>Submitted for admin review. You&apos;ll receive a Faculty Verified badge within 48 hours.</p>
                  </div>
                </div>
              )}
              {/* Institution extra fields */}
              {urlRole === 'institution' && (
                <div className="max-w-xl mx-auto px-4 pb-8">
                  <div className="rounded-2xl p-5 mt-4" style={{background:'rgba(124,58,237,0.08)',border:'0.5px solid rgba(124,58,237,0.25)'}}>
                    <p className="text-sm font-semibold mb-4" style={{color:'#A78BFA'}}>🏢 Institution registration</p>
                    <div className="space-y-3">
                      <input placeholder="Organisation name" className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none" style={{background:'rgba(255,255,255,0.05)',border:'0.5px solid rgba(255,255,255,0.1)'}} />
                      <select className="w-full rounded-xl px-4 py-3 text-sm outline-none appearance-none" style={{background:'rgba(255,255,255,0.05)',border:'0.5px solid rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.7)'}}>
                        <option value="" style={{background:'#0B1F3A'}}>Type: University / Company / NGO / Other</option>
                        {['University','Company','NGO','Government','Other'].map(t => <option key={t} value={t} style={{background:'#0B1F3A'}}>{t}</option>)}
                      </select>
                      <input placeholder="Primary contact email" type="email" className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none" style={{background:'rgba(255,255,255,0.05)',border:'0.5px solid rgba(255,255,255,0.1)'}} />
                    </div>
                    <p className="text-xs mt-3" style={{color:'rgba(255,255,255,0.3)'}}>Flagged for admin verification. Our team will reach out within 24 hours.</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
