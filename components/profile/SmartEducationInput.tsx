import React, { useState, useEffect } from 'react';
import {
  ActivityIndicator,
  Animated,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { supabase } from '@/lib/supabase';

// ── Types ─────────────────────────────────────────────────────────────────────

type ParseResult = {
  parsed: {
    year: number | null;
    degree: string | null;
    institution: string | null;
    city: string | null;
  };
  college: {
    id: string;
    name: string;
    city: string;
    state: string;
    university: string | null;
    naac_grade: string | null;
  } | null;
  course: {
    id: string;
    name: string;
    saathi_slug: string | null;
  } | null;
  confidence: number;
  subjects: Record<string, string[]> | null;
  saathi_suggestion: string | null;
  alternatives: { id: string; name: string; city: string; state: string }[];
};

type Props = {
  currentSaathiId?: string;
  primaryColor?: string;
  onConfirmed: (data: {
    collegeId: string | null;
    courseId: string | null;
    year: number | null;
    currentSubjects: string[];
    saathiSuggestion: string | null;
    rawInput: string;
  }) => void;
  onSaathiSwitch?: (slug: string) => void;
};

const EXAMPLES = [
  '2nd Year B.Tech CSE from NIT Surat',
  'Final year MBBS, AIIMS Delhi',
  'MBA 1st sem, Symbiosis Pune',
  'LLB 3rd year GLC Mumbai',
  '4th yr B.Pharm, LM College Ahmedabad',
];

const ORDINAL = ['st', 'nd', 'rd', 'th'];

// ── SmartEducationInput (React Native) ────────────────────────────────────────

export default function SmartEducationInput({
  currentSaathiId,
  primaryColor = '#C9993A',
  onConfirmed,
  onSaathiSwitch,
}: Props) {
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ParseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [exampleIdx, setExampleIdx] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const [fade] = useState(new Animated.Value(0));

  // Rotate examples every 3 seconds
  useEffect(() => {
    const t = setInterval(() => setExampleIdx((i) => (i + 1) % EXAMPLES.length), 3000);
    return () => clearInterval(t);
  }, []);

  // Fade in result card
  useEffect(() => {
    if (result) {
      Animated.timing(fade, { toValue: 1, duration: 220, useNativeDriver: true }).start();
    } else {
      fade.setValue(0);
    }
  }, [result]);

  async function handleBlur() {
    const trimmed = value.trim();
    if (!trimmed || loading || confirmed || trimmed.length < 8) return;

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error('Not authenticated');

      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? '';
      const res = await fetch(`${supabaseUrl}/functions/v1/parse-education`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ rawInput: trimmed }),
      });
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data: ParseResult = await res.json();
      setResult(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not parse. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  function handleConfirm() {
    if (!result) return;
    const subjects = result.subjects ? Object.values(result.subjects).flat() : [];
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
  }

  function getSubjectPreview(): string {
    if (!result?.subjects) return '';
    const all = Object.values(result.subjects).flat();
    if (all.length === 0) return '';
    const preview = all.slice(0, 3).join(', ');
    return all.length > 3 ? `${preview} +${all.length - 3} more` : preview;
  }

  const ordinal = (n: number) => `${n}${ORDINAL[Math.min(n - 1, 3)]}`;

  const showSaathiNudge =
    result?.saathi_suggestion &&
    currentSaathiId &&
    result.saathi_suggestion !== currentSaathiId;

  return (
    <View>
      {/* Label */}
      <Text
        className="text-sm text-navy/80 mb-2"
        style={{ fontFamily: 'DMSans-Medium' }}
      >
        Tell us about your education
      </Text>

      {/* Textarea */}
      <TextInput
        className="rounded-xl border px-4 py-3.5 text-navy text-base mb-1 bg-white"
        style={{
          fontFamily: 'DMSans-Regular',
          textAlignVertical: 'top',
          borderColor: result
            ? result.confidence >= 85
              ? '#22C55E66'
              : result.confidence >= 60
              ? `${primaryColor}66`
              : '#EF444466'
            : '#0B1F3A20',
        }}
        placeholder={`e.g. "${EXAMPLES[exampleIdx]}"`}
        placeholderTextColor="#0B1F3A44"
        multiline
        numberOfLines={2}
        autoCorrect={false}
        editable={!confirmed}
        value={value}
        onChangeText={(t) => { setValue(t.replace(/[<>]/g, '').slice(0, 300)); setResult(null); setConfirmed(false); }}
        onBlur={handleBlur}
      />

      {/* Hint */}
      {!loading && !result && (
        <Text
          className="text-xs text-navy/40 mb-4"
          style={{ fontFamily: 'DMSans-Regular' }}
        >
          Just type naturally — we'll figure it out
        </Text>
      )}

      {/* Loading */}
      {loading && (
        <View className="items-center my-3">
          <ActivityIndicator color={primaryColor} size="small" />
          <Text
            className="text-xs text-navy/40 mt-1"
            style={{ fontFamily: 'DMSans-Regular' }}
          >
            Reading your input…
          </Text>
        </View>
      )}

      {/* Error */}
      {!!error && (
        <Text
          className="text-xs text-red-500 mb-3"
          style={{ fontFamily: 'DMSans-Regular' }}
        >
          ⚠️ {error}
        </Text>
      )}

      {/* ── HIGH confidence ≥85 — green confirm card ─────────────────────────── */}
      {result && !confirmed && result.confidence >= 85 && (
        <Animated.View style={{ opacity: fade }} className="rounded-xl p-4 mb-4"
          // @ts-ignore — RN style
          style={[{ opacity: fade }, { backgroundColor: '#22C55E0F', borderWidth: 1, borderColor: '#22C55E33', borderRadius: 12, padding: 16, marginBottom: 16 }]}
        >
          <Text className="text-xs font-semibold mb-2" style={{ fontFamily: 'DMSans-Medium', color: '#16A34A' }}>
            ✓ We understood:
          </Text>
          <Text className="text-base text-navy mb-0.5" style={{ fontFamily: 'DMSans-Medium' }}>
            {result.parsed.year ? `${ordinal(result.parsed.year)} Year ` : ''}{result.parsed.degree}
          </Text>
          {result.college && (
            <Text className="text-xs text-navy/55 mb-1" style={{ fontFamily: 'DMSans-Regular' }}>
              at {result.college.name}, {result.college.city}
              {result.college.university ? ` (${result.college.university})` : ''}
            </Text>
          )}
          {!!getSubjectPreview() && (
            <Text className="text-xs text-navy/40 mb-3" style={{ fontFamily: 'DMSans-Regular' }}>
              📚 {getSubjectPreview()}
            </Text>
          )}
          <Text className="text-xs text-navy/50 mb-2" style={{ fontFamily: 'DMSans-Regular' }}>
            Is this right?
          </Text>
          <View className="flex-row gap-2">
            <Pressable
              onPress={handleConfirm}
              className="flex-1 rounded-xl py-3 items-center active:opacity-80"
              style={{ backgroundColor: '#22C55E22', borderWidth: 1, borderColor: '#22C55E55' }}
            >
              <Text className="text-xs font-bold text-green-700" style={{ fontFamily: 'DMSans-Bold' }}>
                Yes, that's me ✓
              </Text>
            </Pressable>
            <Pressable
              onPress={handleCorrect}
              className="flex-1 rounded-xl py-3 items-center active:opacity-80 bg-white"
              style={{ borderWidth: 1, borderColor: '#0B1F3A15' }}
            >
              <Text className="text-xs text-navy/50" style={{ fontFamily: 'DMSans-Regular' }}>
                Let me correct this
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      )}

      {/* ── MEDIUM confidence 60-84 — "Did you mean" ─────────────────────────── */}
      {result && !confirmed && result.confidence >= 60 && result.confidence < 85 && (
        <Animated.View style={{ opacity: fade }}>
          <View
            className="rounded-xl p-4 mb-4"
            style={{ backgroundColor: `${primaryColor}0D`, borderWidth: 1, borderColor: `${primaryColor}44` }}
          >
            <Text className="text-xs mb-2" style={{ fontFamily: 'DMSans-Medium', color: primaryColor }}>
              Did you mean…
            </Text>
            {result.college && (
              <Pressable
                onPress={handleConfirm}
                className="rounded-xl px-3 py-3 mb-2 active:opacity-80"
                style={{ backgroundColor: `${primaryColor}15`, borderWidth: 1, borderColor: `${primaryColor}33` }}
              >
                <Text className="text-sm text-navy font-medium" style={{ fontFamily: 'DMSans-Medium' }}>
                  {result.college.name}
                </Text>
                <Text className="text-xs text-navy/50 mt-0.5" style={{ fontFamily: 'DMSans-Regular' }}>
                  {result.college.city}, {result.college.state}
                  {result.college.naac_grade ? ` · NAAC ${result.college.naac_grade}` : ''}
                </Text>
              </Pressable>
            )}
            {result.alternatives.slice(0, 2).map((alt) => (
              <Pressable
                key={alt.id}
                onPress={() => setResult((p) => p ? { ...p, college: { ...alt, university: null, naac_grade: null }, confidence: 90 } : p)}
                className="rounded-xl px-3 py-2.5 mb-1.5 active:opacity-80 bg-white"
                style={{ borderWidth: 1, borderColor: '#0B1F3A10' }}
              >
                <Text className="text-xs text-navy/70" style={{ fontFamily: 'DMSans-Regular' }}>
                  {alt.name}
                </Text>
                <Text className="text-xs text-navy/40" style={{ fontFamily: 'DMSans-Regular' }}>
                  {alt.city}, {alt.state}
                </Text>
              </Pressable>
            ))}
            <Pressable onPress={handleCorrect} className="mt-1 items-start">
              <Text className="text-xs text-navy/35" style={{ fontFamily: 'DMSans-Regular' }}>
                None of these — retype
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      )}

      {/* ── LOW confidence <60 — manual selection ───────────────────────────── */}
      {result && !confirmed && result.confidence < 60 && (
        <Animated.View style={{ opacity: fade }}>
          <View
            className="rounded-xl p-4 mb-4"
            style={{ backgroundColor: '#FEF3F2', borderWidth: 1, borderColor: '#FECACA' }}
          >
            <Text className="text-xs text-red-600 mb-1" style={{ fontFamily: 'DMSans-Medium' }}>
              We weren't sure — can you help us?
            </Text>
            <Text className="text-xs text-navy/40 mb-3" style={{ fontFamily: 'DMSans-Regular' }}>
              Select the closest match, or retype with more details.
            </Text>
            {[result.college, ...result.alternatives].filter(Boolean).slice(0, 3).map((c) => (
              <Pressable
                key={c!.id}
                onPress={() => setResult((p) => p ? { ...p, college: { ...c!, university: null, naac_grade: null }, confidence: 90 } : p)}
                className="rounded-xl px-3 py-3 mb-2 active:opacity-80 bg-white"
                style={{ borderWidth: 1, borderColor: '#0B1F3A10' }}
              >
                <Text className="text-sm text-navy" style={{ fontFamily: 'DMSans-Medium' }}>
                  {c!.name}
                </Text>
                <Text className="text-xs text-navy/40 mt-0.5" style={{ fontFamily: 'DMSans-Regular' }}>
                  {c!.city}, {c!.state}
                </Text>
              </Pressable>
            ))}
            <Pressable onPress={handleCorrect} className="mt-1">
              <Text className="text-xs text-navy/40" style={{ fontFamily: 'DMSans-Regular' }}>
                Retype with more details →
              </Text>
            </Pressable>
          </View>
        </Animated.View>
      )}

      {/* Confirmed state */}
      {confirmed && result && (
        <View className="flex-row items-center gap-2 mb-3">
          <Text className="text-xs text-green-700" style={{ fontFamily: 'DMSans-Medium' }}>
            ✓ {result.parsed.degree} · Year {result.parsed.year}
          </Text>
          <Pressable onPress={handleCorrect}>
            <Text className="text-xs text-navy/35 underline" style={{ fontFamily: 'DMSans-Regular' }}>
              edit
            </Text>
          </Pressable>
        </View>
      )}

      {/* Saathi mismatch nudge */}
      {showSaathiNudge && result && (
        <View
          className="rounded-xl p-3.5 mb-4"
          style={{ backgroundColor: '#4F46E510', borderWidth: 1, borderColor: '#4F46E533' }}
        >
          <Text className="text-xs text-navy/60 mb-2" style={{ fontFamily: 'DMSans-Regular' }}>
            💡 Based on your course,{' '}
            <Text style={{ fontFamily: 'DMSans-Bold', color: '#0B1F3A' }}>
              {result.saathi_suggestion}
            </Text>{' '}
            might be a better match for you.
          </Text>
          <View className="flex-row gap-2">
            <Pressable
              onPress={() => onSaathiSwitch?.(result.saathi_suggestion!)}
              className="flex-1 rounded-xl py-2.5 items-center active:opacity-80"
              style={{ backgroundColor: '#4F46E522', borderWidth: 1, borderColor: '#4F46E555' }}
            >
              <Text className="text-xs font-bold text-indigo-700" style={{ fontFamily: 'DMSans-Bold' }}>
                Switch Saathi
              </Text>
            </Pressable>
            <Pressable
              onPress={() => setResult((p) => p ? { ...p, saathi_suggestion: null } : p)}
              className="flex-1 rounded-xl py-2.5 items-center active:opacity-80 bg-white"
              style={{ borderWidth: 1, borderColor: '#0B1F3A10' }}
            >
              <Text className="text-xs text-navy/50" style={{ fontFamily: 'DMSans-Regular' }}>
                Keep current
              </Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}
