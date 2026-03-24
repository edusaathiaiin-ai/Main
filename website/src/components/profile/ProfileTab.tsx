'use client';

import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import type { Profile } from '@/types';

const EXAM_TARGETS = ['UPSC', 'GATE', 'NEET', 'CA', 'CLAT', 'NET', 'JEE', 'Bar Exam', 'None'];
const ACADEMIC_LEVELS = [
  { value: 'diploma', label: '📜 Diploma / Certificate' },
  { value: 'bachelor', label: '🎓 Bachelor\'s Degree' },
  { value: 'masters', label: '🔬 Master\'s Degree' },
  { value: 'phd', label: '🏛️ PhD / Doctoral' },
  { value: 'professional', label: '⚕️ Professional Programme' },
  { value: 'competitive', label: '🎯 Competitive Exam Prep' },
  { value: 'professional_learner', label: '💼 Working Professional' },
  { value: 'exploring', label: '🌱 Just Exploring' },
];
const LEARNING_STYLES = [
  { value: 'visual', label: '👁 Visual', desc: 'Diagrams & mind maps' },
  { value: 'practice', label: '✍️ Practice', desc: 'Problems & exercises' },
  { value: 'discussion', label: '💬 Discussion', desc: 'Debate & explain' },
  { value: 'reading', label: '📖 Reading', desc: 'Texts & notes' },
];

interface RawSoul {
  academic_level: string | null;
  depth_calibration: number | null;
  top_topics: string[] | null;
  struggle_topics: string[] | null;
  future_research_area: string | null;
  career_interest: string | null;
  enrolled_subjects: string[] | null;
  future_subjects: string[] | null;
}

interface ProfileTabProps {
  profile: Profile;
  soul: RawSoul | null;
  onSaved: () => void;
}

export default function ProfileTab({ profile, soul, onSaved }: ProfileTabProps) {
  const [fullName, setFullName] = useState(profile.full_name ?? '');
  const [city, setCity] = useState(profile.city ?? '');
  const [institution, setInstitution] = useState(profile.institution_name ?? '');
  const [academicLevel, setAcademicLevel] = useState(soul?.academic_level ?? 'bachelor');
  const [examTarget, setExamTarget] = useState(profile.exam_target ?? '');
  const [learningStyle, setLearningStyle] = useState<string>('');
  const [researchArea, setResearchArea] = useState(soul?.future_research_area ?? '');
  const [careerInterest, setCareerInterest] = useState(soul?.career_interest ?? '');
  const [enrolledChips, setEnrolledChips] = useState<string[]>(soul?.enrolled_subjects ?? []);
  const [futureChips, setFutureChips] = useState<string[]>(soul?.future_subjects ?? []);
  const [newChip, setNewChip] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Profile completeness meter
  const completeness = useMemo(() => {
    let score = 0;
    if (fullName.trim()) score += 15;
    if (city.trim()) score += 10;
    if (institution.trim()) score += 10;
    if (academicLevel) score += 10;
    if (examTarget) score += 10;
    if (researchArea.trim()) score += 15;
    if (careerInterest.trim()) score += 15;
    if (enrolledChips.length > 0) score += 10;
    if (futureChips.length > 0) score += 5;
    return Math.min(100, score);
  }, [fullName, city, institution, academicLevel, examTarget, researchArea, careerInterest, enrolledChips, futureChips]);

  function addChip(list: string[], setList: (v: string[]) => void, max = 5) {
    const val = newChip.trim();
    if (!val || list.includes(val) || list.length >= max) return;
    setList([...list, val]);
    setNewChip('');
  }

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    try {
      const supabase = createClient();
      await supabase.from('profiles').update({
        full_name: fullName.trim().slice(0, 100) || null,
        city: city.trim().slice(0, 100) || null,
        institution_name: institution.trim().slice(0, 200) || null,
        exam_target: examTarget || null,
      }).eq('id', profile.id);

      if (profile.primary_saathi_id) {
        await supabase.from('student_soul').upsert({
          user_id: profile.id,
          vertical_id: profile.primary_saathi_id,
          display_name: fullName.trim() || null,
          academic_level: academicLevel,
          future_research_area: researchArea.trim().slice(0, 500) || null,
          career_interest: careerInterest.trim().slice(0, 300) || null,
          enrolled_subjects: enrolledChips,
          future_subjects: futureChips,
          profile_update_acknowledged: false,
        }, { onConflict: 'user_id,vertical_id' });
      }

      setToast('✓ Profile updated. Your Saathi will acknowledge this in your next session.');
      setTimeout(() => setToast(null), 5000);
      onSaved();
    } catch (e) {
      setToast('⚠️ Failed to save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  const inputStyle = {
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.1)',
    color: '#fff',
    fontFamily: 'var(--font-dm-sans)',
  };

  const labelStyle = { color: 'rgba(255,255,255,0.45)' };

  return (
    <div className="space-y-8">
      {/* Toast */}
      {toast && (
        <motion.div
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
          className="rounded-xl px-4 py-3 text-sm"
          style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)', color: '#4ADE80' }}
        >
          {toast}
        </motion.div>
      )}

      {/* ── Identity ────────────────────────────────────────────── */}
      <section>
        <h3 className="font-playfair text-lg font-bold text-white mb-4">Identity</h3>

        {/* Avatar */}
        <div className="flex items-center gap-4 mb-6">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold"
            style={{ background: 'rgba(201,153,58,0.2)', color: '#C9993A', border: '2px solid rgba(201,153,58,0.4)' }}
          >
            {(fullName || profile.email || 'U').charAt(0).toUpperCase()}
          </div>
          <div>
            <p className="font-semibold text-white">{fullName || 'Your name'}</p>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{profile.email}</p>
            <div className="flex gap-2 mt-1.5">
              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold" style={{ background: 'rgba(201,153,58,0.2)', color: '#C9993A' }}>
                {profile.plan_id?.toUpperCase() ?? 'FREE'}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.4)' }}>
                Member since {new Date(profile.created_at).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: 'Full name', value: fullName, setter: setFullName, placeholder: 'Your full name' },
            { label: 'City', value: city, setter: setCity, placeholder: 'Your city' },
          ].map(({ label, value, setter, placeholder }) => (
            <div key={label}>
              <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>{label}</label>
              <input
                value={value} onChange={(e) => setter(e.target.value)}
                placeholder={placeholder}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                style={inputStyle}
              />
            </div>
          ))}

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>Email (read only)</label>
            <input value={profile.email} readOnly
              className="w-full rounded-xl px-4 py-3 text-sm outline-none"
              style={{ ...inputStyle, opacity: 0.5, cursor: 'not-allowed' }}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>Institution</label>
            <input
              value={institution} onChange={(e) => setInstitution(e.target.value)}
              placeholder="College / University"
              className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
              style={inputStyle}
            />
          </div>
        </div>
      </section>

      {/* ── Academic Journey ─────────────────────────────────────── */}
      <section>
        <h3 className="font-playfair text-lg font-bold text-white mb-4">Academic Journey</h3>
        <div className="mb-4">
          <label className="block text-xs font-semibold mb-2" style={labelStyle}>Academic level</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {ACADEMIC_LEVELS.map((lvl) => {
              const active = academicLevel === lvl.value;
              return (
                <button key={lvl.value}
                  onClick={() => setAcademicLevel(lvl.value)}
                  className="rounded-xl px-3 py-2.5 text-xs font-semibold text-left transition-all"
                  style={{
                    background: active ? 'rgba(201,153,58,0.15)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${active ? 'rgba(201,153,58,0.5)' : 'rgba(255,255,255,0.08)'}`,
                    color: active ? '#E5B86A' : 'rgba(255,255,255,0.5)',
                  }}
                >
                  {lvl.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Learning Preferences ─────────────────────────────────── */}
      <section>
        <h3 className="font-playfair text-lg font-bold text-white mb-4">Learning Preferences</h3>

        <div className="mb-4">
          <label className="block text-xs font-semibold mb-2" style={labelStyle}>Learning style</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {LEARNING_STYLES.map((s) => {
              const active = learningStyle === s.value;
              return (
                <button key={s.value} onClick={() => setLearningStyle(active ? '' : s.value)}
                  className="rounded-xl px-3 py-3 text-center transition-all"
                  style={{
                    background: active ? 'rgba(201,153,58,0.12)' : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${active ? 'rgba(201,153,58,0.4)' : 'rgba(255,255,255,0.08)'}`,
                  }}
                >
                  <div className="text-xl mb-1">{s.label.split(' ')[0]}</div>
                  <div className="text-xs font-semibold" style={{ color: active ? '#E5B86A' : 'rgba(255,255,255,0.5)' }}>
                    {s.label.split(' ').slice(1).join(' ')}
                  </div>
                  <div className="text-[10px] mt-0.5" style={{ color: 'rgba(255,255,255,0.3)' }}>{s.desc}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold mb-2" style={labelStyle}>Exam target</label>
          <div className="flex flex-wrap gap-2">
            {EXAM_TARGETS.map((exam) => {
              const active = examTarget === exam;
              return (
                <button key={exam} onClick={() => setExamTarget(active ? '' : exam)}
                  className="px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all"
                  style={{
                    background: active ? 'rgba(201,153,58,0.2)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${active ? 'rgba(201,153,58,0.5)' : 'rgba(255,255,255,0.08)'}`,
                    color: active ? '#C9993A' : 'rgba(255,255,255,0.5)',
                  }}
                >
                  {exam}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Interests ───────────────────────────────────────────── */}
      <section>
        <h3 className="font-playfair text-lg font-bold text-white mb-4">Interests</h3>

        {/* Current subjects chips */}
        {[
          { label: 'Current subjects (max 5)', list: enrolledChips, setList: setEnrolledChips },
          { label: 'Interest areas (max 5)', list: futureChips, setList: setFutureChips },
        ].map(({ label, list, setList }) => (
          <div key={label} className="mb-4">
            <label className="block text-xs font-semibold mb-2" style={labelStyle}>{label}</label>
            <div className="flex flex-wrap gap-2 mb-2">
              {list.map((chip) => (
                <button key={chip} onClick={() => setList(list.filter((c) => c !== chip))}
                  className="px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1"
                  style={{ background: 'rgba(201,153,58,0.15)', border: '1px solid rgba(201,153,58,0.35)', color: '#C9993A' }}
                >
                  {chip} <span style={{ opacity: 0.6 }}>×</span>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                value={newChip} onChange={(e) => setNewChip(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addChip(list, setList); } }}
                placeholder="Add topic → Enter"
                className="flex-1 rounded-xl px-3 py-2 text-xs outline-none"
                style={inputStyle}
              />
              <button onClick={() => addChip(list, setList)}
                className="px-3 py-2 rounded-xl text-xs font-bold"
                style={{ background: 'rgba(201,153,58,0.2)', color: '#C9993A' }}
              >
                +
              </button>
            </div>
          </div>
        ))}

        <div>
          <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>Future research area</label>
          <textarea value={researchArea} onChange={(e) => setResearchArea(e.target.value.slice(0, 500))}
            placeholder="What research area excites you most?"
            rows={3}
            className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none"
            style={inputStyle}
          />
        </div>

        <div className="mt-4">
          <label className="block text-xs font-semibold mb-1.5" style={labelStyle}>Career interest / direction</label>
          <textarea value={careerInterest} onChange={(e) => setCareerInterest(e.target.value.slice(0, 300))}
            placeholder="Industry, academia, research, entrepreneurship..."
            rows={2}
            className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none"
            style={inputStyle}
          />
        </div>
      </section>

      {/* ── Completeness meter ──────────────────────────────────── */}
      <div className="rounded-xl p-4" style={{ background: 'rgba(201,153,58,0.05)', border: '1px solid rgba(201,153,58,0.15)' }}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold" style={{ color: 'rgba(255,255,255,0.5)' }}>
            Your Saathi knows <span style={{ color: '#C9993A' }}>{completeness}%</span> of your journey
          </p>
          <p className="text-xs font-bold" style={{ color: '#C9993A' }}>{completeness}/100</p>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
          <motion.div
            className="h-full rounded-full"
            style={{ background: 'linear-gradient(90deg, #C9993A, #E5B86A)' }}
            animate={{ width: `${completeness}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      {/* Save button */}
      <button
        onClick={handleSave} disabled={saving}
        className="w-full rounded-xl py-4 text-sm font-bold transition-all disabled:opacity-60 hover:brightness-110"
        style={{ background: '#C9993A', color: '#060F1D' }}
      >
        {saving ? 'Saving...' : 'Save changes'}
      </button>
    </div>
  );
}
