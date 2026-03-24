import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Sentry from '@sentry/react-native';

import { SAATHIS } from '@/constants/saathis';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import SmartEducationInput from '@/components/profile/SmartEducationInput';
import { ACADEMIC_LEVEL_CARDS, instantCalibrate, type AcademicLevel, type AcademicLevelCard } from '@/lib/instantSoulCalibration';

// ─── Constants ────────────────────────────────────────────────────────────────

const INDIAN_CITIES = [
  'Agra', 'Ahmedabad', 'Amritsar', 'Aurangabad', 'Bengaluru',
  'Bhopal', 'Chandigarh', 'Chennai', 'Coimbatore', 'Dehradun',
  'Delhi', 'Faridabad', 'Guwahati', 'Gwalior', 'Howrah',
  'Hyderabad', 'Indore', 'Jaipur', 'Jabalpur', 'Jodhpur',
  'Kanpur', 'Kochi', 'Kolkata', 'Lucknow', 'Ludhiana',
  'Madurai', 'Meerut', 'Mumbai', 'Nagpur', 'Nashik',
  'Navi Mumbai', 'Patna', 'Pune', 'Raipur', 'Rajkot',
  'Ranchi', 'Srinagar', 'Surat', 'Thane', 'Thiruvananthapuram',
  'Vadodara', 'Varanasi', 'Vijayawada', 'Visakhapatnam', 'Other',
];

const YEARS_OF_STUDY = [
  '1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year',
  'Masters Year 1', 'Masters Year 2', 'PhD',
  'Working Professional', 'Other',
];

const EXAM_TARGETS = [
  'UPSC', 'GATE', 'NEET', 'CA', 'CLAT', 'NET', 'JEE', 'Bar Exam', 'None',
];

const HIGH_AMBITION_EXAMS = new Set(['UPSC', 'GATE', 'NEET', 'Bar Exam']);

const SUBJECT_NAMES = SAATHIS.map(s => ({ id: s.id, name: s.name, emoji: s.emoji }));

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function ProfileSetupScreen() {
  const router = useRouter();
  const { user, profile, refreshProfile } = useAuth();

  // ── Academic level step (Step 0 — before everything else) ────────────────
  type ProfileSetupStep = 'academic' | 'profile';
  const [setupStep, setSetupStep] = useState<ProfileSetupStep>('academic');
  const [academicLevel, setAcademicLevel] = useState<AcademicLevel>('bachelor');
  const [academicCard, setAcademicCard] = useState<AcademicLevelCard | null>(null);
  const [selectedYearIdx, setSelectedYearIdx] = useState<number | null>(null);
  const [selectedExamTarget, setSelectedExamTarget] = useState<string | null>(null);

  // Form fields
  const [fullName, setFullName] = useState('');
  const [enrolledSubjects, setEnrolledSubjects] = useState<string[]>([]);
  const [futureSubjects, setFutureSubjects] = useState<string[]>([]);
  const [researchArea, setResearchArea] = useState('');
  const [examTarget, setExamTarget] = useState('');

  // Smart education parse result
  const [educationData, setEducationData] = useState<{
    collegeId: string | null;
    courseId: string | null;
    year: number | null;
    currentSubjects: string[];
    saathiSuggestion: string | null;
    rawInput: string;
  } | null>(null);

  // UI state
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Vertical name → DB id map (for student_subjects FK)
  const verticalMapRef = useRef<Record<string, string>>({});

  useEffect(() => {
    // Pre-fetch vertical IDs for subject FK mapping
    supabase
      .from('verticals')
      .select('id, name')
      .then(({ data }) => {
        if (data) {
          const map: Record<string, string> = {};
          for (const v of data) {
            map[v.name as string] = v.id as string;
          }
          verticalMapRef.current = map;
        }
      });
  }, []);

  // Progress: count how many of 6 "desirable" fields are filled
  const progress = useMemo(() => {
    let filled = 0;
    if (fullName.trim()) filled++;
    if (educationData) filled += 2; // college + year bundled
    if (enrolledSubjects.length > 0) filled++;
    if (futureSubjects.length > 0) filled++;
    if (researchArea.trim()) filled++;
    if (examTarget) filled++;
    return Math.round((filled / 7) * 100);
  }, [fullName, educationData, enrolledSubjects, futureSubjects, researchArea, examTarget]);

  // Subject toggle helper
  function toggleSubject(name: string, type: 'enrolled' | 'future') {
    if (type === 'enrolled') {
      setEnrolledSubjects(prev =>
        prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]
      );
    } else {
      setFutureSubjects(prev =>
        prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]
      );
    }
  }

  // Save handler
  async function handleSave() {
    if (!fullName.trim()) {
      setError('Full name is required.');
      return;
    }
    if (!user || !profile) return;

    setSaving(true);
    setError(null);

    try {
      // 1 — Update profiles (includes parsed education fields)
      const { error: profileErr } = await supabase
        .from('profiles')
        .update({
          full_name: fullName.trim().slice(0, 100),
          raw_education_input: educationData?.rawInput ?? null,
          parsed_college_id: educationData?.collegeId ?? null,
          parsed_course_id: educationData?.courseId ?? null,
          parsed_year: educationData?.year ?? null,
          parse_confirmed: !!educationData,
          exam_target: examTarget || null,
        })
        .eq('id', user.id);

      if (profileErr) throw profileErr;

      // 2 — Merge parse-education current subjects into enrolled subjects
      const mergedEnrolled = [
        ...enrolledSubjects,
        ...(educationData?.currentSubjects ?? []).filter(s => !enrolledSubjects.includes(s)),
      ];

      // 2 — Batch insert enrolled subjects
      if (mergedEnrolled.length > 0) {
        const rows = mergedEnrolled.map(name => ({
          user_id: user.id,
          vertical_id: verticalMapRef.current[name] ?? null,
          subject_name: name,
          subject_type: 'enrolled',
          is_primary: name === SAATHIS.find(s => s.id === profile.primary_saathi_id)?.name,
        }));
        const { error: enrollErr } = await supabase
          .from('student_subjects')
          .upsert(rows, { onConflict: 'user_id,vertical_id,subject_name,subject_type' });
        if (enrollErr) throw enrollErr;
      }

      // 3 — Batch insert future subjects
      if (futureSubjects.length > 0) {
        const rows = futureSubjects.map(name => ({
          user_id: user.id,
          vertical_id: verticalMapRef.current[name] ?? null,
          subject_name: name,
          subject_type: 'future',
          is_primary: false,
        }));
        const { error: futureErr } = await supabase
          .from('student_subjects')
          .upsert(rows, { onConflict: 'user_id,vertical_id,subject_name,subject_type' });
        if (futureErr) throw futureErr;
      }

      // 4 — Create student_soul row with calibration
      if (profile.primary_saathi_id) {
        const calibration = instantCalibrate({
          academicLevel,
          currentYear: academicLevel === 'competitive' || !academicCard?.yearOptions.length
            ? null
            : (selectedYearIdx !== null ? selectedYearIdx + 1 : null),
          totalYears: academicCard?.yearOptions.length
            ? academicCard.yearOptions.length
            : null,
          examTarget: selectedExamTarget ?? (examTarget || null),
          previousDegree: null,
        });

        const { error: soulErr } = await supabase.from('student_soul').upsert(
          {
            user_id: user.id,
            vertical_id: profile.primary_saathi_id,
            display_name: fullName.trim(),
            academic_level: academicLevel,
            depth_calibration: calibration.depth_calibration,
            peer_mode: calibration.peer_mode,
            exam_mode: calibration.exam_mode,
            ambition_level: calibration.ambition_level,
            flame_stage: calibration.flame_stage,
            career_discovery_stage: calibration.career_discovery_stage,
            prior_knowledge_base: calibration.prior_knowledge_base,
            enrolled_subjects: mergedEnrolled,
            future_subjects: futureSubjects,
            future_research_area: researchArea.trim().slice(0, 500) || null,
          },
          { onConflict: 'user_id,vertical_id' }
        );
        if (soulErr) throw soulErr;
      }

      await refreshProfile();
      router.replace('/(tabs)/home');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save profile. Please try again.';
      setError(msg);
      Sentry.captureException(err, { tags: { action: 'profile_setup_save' } });
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-cream"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 60, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Header */}
        <Text
          className="text-3xl text-navy"
          style={{ fontFamily: 'PlayfairDisplay-Bold' }}
        >
          Tell your Saathi{'\n'}about you
        </Text>
        <Text
          className="text-sm text-navy/60 mt-2"
          style={{ fontFamily: 'DMSans-Regular' }}
        >
          The more you share, the more personal your Saathi becomes.
        </Text>

        {/* Progress bar */}
        <View className="mt-6 mb-8">
          <View className="flex-row justify-between mb-1.5">
            <Text
              className="text-xs text-navy/50"
              style={{ fontFamily: 'DMSans-Regular' }}
            >
              Profile completeness
            </Text>
            <Text
              className="text-xs"
              style={{ fontFamily: 'DMSans-Medium', color: '#C9993A' }}
            >
              {progress}%
            </Text>
          </View>
          <View className="h-1.5 rounded-full bg-navy/10 overflow-hidden">
            <View
              className="h-full rounded-full"
              style={{ width: `${progress}%`, backgroundColor: '#C9993A' }}
            />
          </View>
        </View>

        {/* ── Full name ─────────────────────────────────────────────── */}
        <Label text="Full name" required />
        <TextInput
          className="rounded-xl border border-navy/20 px-4 py-3.5 text-navy text-base mb-5 bg-white"
          style={{ fontFamily: 'DMSans-Regular' }}
          placeholder="Your full name"
          placeholderTextColor="#0B1F3A55"
          autoCapitalize="words"
          autoCorrect={false}
          maxLength={100}
          value={fullName}
          onChangeText={text => setFullName(text.replace(/[<>]/g, '').slice(0, 100))}
        />

        {/* ── Smart Education Input — replaces city + institution + year ── */}
        <SmartEducationInput
          currentSaathiId={profile?.primary_saathi_id ?? undefined}
          primaryColor="#C9993A"
          onConfirmed={(data) => setEducationData(data)}
          onSaathiSwitch={(slug) => {
            // Future: prompt to switch saathi from onboarding
            console.log('[ProfileSetup] Saathi switch suggested:', slug);
          }}
        />

        {/* ── Enrolled subjects ─────────────────────────────────────── */}
        <Label text="Subjects you are currently studying" />
        <Text
          className="text-xs text-navy/50 mb-3"
          style={{ fontFamily: 'DMSans-Regular' }}
        >
          Tap to select (multiple allowed)
        </Text>
        <SubjectChips
          subjects={SUBJECT_NAMES}
          selected={enrolledSubjects}
          onToggle={name => toggleSubject(name, 'enrolled')}
          activeColor="#4F46E5"
        />

        {/* ── Future subjects ───────────────────────────────────────── */}
        <Label text="Subjects you are curious about" />
        <Text
          className="text-xs text-navy/50 mb-3"
          style={{ fontFamily: 'DMSans-Regular' }}
        >
          Where do you want to go next?
        </Text>
        <SubjectChips
          subjects={SUBJECT_NAMES}
          selected={futureSubjects}
          onToggle={name => toggleSubject(name, 'future')}
          activeColor="#C9993A"
        />

        {/* ── Research area ─────────────────────────────────────────── */}
        <Label text="Research dream" />
        <TextInput
          className="rounded-xl border border-navy/20 px-4 py-3.5 text-navy text-base mb-5 bg-white"
          style={{ fontFamily: 'DMSans-Regular', textAlignVertical: 'top' }}
          placeholder={"What research area excites you most,\neven if it feels far away?"}
          placeholderTextColor="#0B1F3A55"
          autoCorrect={false}
          multiline
          numberOfLines={3}
          maxLength={500}
          value={researchArea}
          onChangeText={text => setResearchArea(text.replace(/[<>]/g, '').slice(0, 500))}
        />

        {/* ── Competitive exam target ───────────────────────────────── */}
        <Label text="Competitive exam target" />
        <View className="flex-row flex-wrap gap-2 mb-6">
          {EXAM_TARGETS.map(exam => {
            const active = examTarget === exam;
            return (
              <Pressable
                key={exam}
                onPress={() => setExamTarget(active ? '' : exam)}
                className="rounded-xl px-4 py-2.5 active:opacity-80"
                style={{
                  backgroundColor: active ? '#0B1F3A' : '#FFFFFF',
                  borderWidth: 1,
                  borderColor: active ? '#0B1F3A' : '#0B1F3A25',
                }}
              >
                <Text
                  className="text-sm"
                  style={{
                    fontFamily: 'DMSans-Medium',
                    color: active ? '#FAF7F2' : '#0B1F3ACC',
                  }}
                >
                  {exam}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </ScrollView>

      {/* Fixed bottom button */}
      <View
        className="absolute bottom-0 left-0 right-0 px-6 pb-10 pt-4"
        style={{ backgroundColor: '#FAF7F2F8' }}
      >
        {error ? (
          <Text
            className="text-red-600 text-sm text-center mb-3"
            style={{ fontFamily: 'DMSans-Regular' }}
          >
            {error}
          </Text>
        ) : null}

        <Pressable
          onPress={handleSave}
          disabled={saving}
          className="bg-navy rounded-xl py-4 items-center justify-center active:opacity-80"
        >
          {saving ? (
            <ActivityIndicator color="#FAF7F2" size="small" />
          ) : (
            <Text
              className="text-cream text-base"
              style={{ fontFamily: 'DMSans-Medium' }}
            >
              Let's Begin →
            </Text>
          )}
        </Pressable>

        <Pressable
          onPress={() => router.replace('/(tabs)/home')}
          disabled={saving}
          className="mt-3 items-center"
        >
          <Text
            className="text-xs text-navy/40"
            style={{ fontFamily: 'DMSans-Regular' }}
          >
            Skip for now
          </Text>
        </Pressable>
      </View>

      {/* City / Year pickers removed — replaced by SmartEducationInput */}
    </KeyboardAvoidingView>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Label({ text, required = false }: { text: string; required?: boolean }) {
  return (
    <Text
      className="text-sm text-navy/80 mb-2"
      style={{ fontFamily: 'DMSans-Medium' }}
    >
      {text}
      {required && <Text style={{ color: '#C9993A' }}> *</Text>}
    </Text>
  );
}

function SubjectChips({
  subjects,
  selected,
  onToggle,
  activeColor,
}: {
  subjects: { id: string; name: string; emoji: string }[];
  selected: string[];
  onToggle: (name: string) => void;
  activeColor: string;
}) {
  return (
    <View className="flex-row flex-wrap gap-2 mb-6">
      {subjects.map(s => {
        const active = selected.includes(s.name);
        return (
          <Pressable
            key={s.id}
            onPress={() => onToggle(s.name)}
            className="rounded-xl px-3 py-2 flex-row items-center active:opacity-80"
            style={{
              backgroundColor: active ? activeColor + '15' : '#FFFFFF',
              borderWidth: 1,
              borderColor: active ? activeColor : '#0B1F3A20',
            }}
          >
            <Text className="text-sm mr-1">{s.emoji}</Text>
            <Text
              className="text-xs"
              style={{
                fontFamily: 'DMSans-Medium',
                color: active ? activeColor : '#0B1F3AAA',
              }}
            >
              {s.name}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function PickerModal({
  visible,
  title,
  options,
  onSelect,
  onClose,
  search = '',
  onSearchChange,
}: {
  visible: boolean;
  title: string;
  options: string[];
  onSelect: (value: string) => void;
  onClose: () => void;
  search?: string;
  onSearchChange?: (text: string) => void;
}) {
  const filtered = search
    ? options.filter(o => o.toLowerCase().includes(search.toLowerCase()))
    : options;

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <Pressable
        className="flex-1"
        style={{ backgroundColor: '#00000050' }}
        onPress={onClose}
      />
      <View
        className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-white"
        style={{ maxHeight: '70%' }}
      >
        {/* Handle */}
        <View className="items-center pt-3 pb-2">
          <View className="w-10 h-1 rounded-full bg-navy/20" />
        </View>

        {/* Title */}
        <Text
          className="text-lg text-navy text-center pb-3 px-6"
          style={{
            fontFamily: 'PlayfairDisplay-Bold',
            borderBottomWidth: 1,
            borderBottomColor: '#0B1F3A10',
          }}
        >
          {title}
        </Text>

        {/* Optional search */}
        {onSearchChange && (
          <View className="px-4 pt-3 pb-1">
            <TextInput
              className="rounded-xl border border-navy/20 px-4 py-2.5 text-navy text-base bg-cream/40"
              style={{ fontFamily: 'DMSans-Regular' }}
              placeholder="Search..."
              placeholderTextColor="#0B1F3A55"
              value={search}
              onChangeText={text => onSearchChange(text.replace(/[<>]/g, '').slice(0, 50))}
              autoCorrect={false}
            />
          </View>
        )}

        {/* Options list */}
        <FlatList
          data={filtered}
          keyExtractor={item => item}
          keyboardShouldPersistTaps="always"
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onSelect(item)}
              className="px-6 py-4 active:bg-cream/60 flex-row items-center"
              style={{ borderBottomWidth: 1, borderBottomColor: '#0B1F3A08' }}
            >
              <Text
                className="text-base text-navy flex-1"
                style={{ fontFamily: 'DMSans-Regular' }}
              >
                {item}
              </Text>
            </Pressable>
          )}
          style={{ flexGrow: 0 }}
        />
        <View style={{ height: 32 }} />
      </View>
    </Modal>
  );
}
