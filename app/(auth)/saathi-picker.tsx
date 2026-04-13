import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Sentry from '@sentry/react-native';

import { SAATHIS } from '@/constants/saathis';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { Saathi } from '@/types';
import { trackSaathiSelected } from '@/lib/analytics';

export default function SaathiPickerScreen() {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();

  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<string | null>(null); // saathi slug (id)
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = search.replace(/[<>]/g, '').trim().toLowerCase();
    if (!q) return SAATHIS;
    return SAATHIS.filter(
      s =>
        s.name.toLowerCase().includes(q) ||
        s.tagline.toLowerCase().includes(q)
    );
  }, [search]);

  function handleSelect(saathiSlug: string) {
    setSelected(prev => (prev === saathiSlug ? null : saathiSlug));
    setError(null);
  }

  async function handleContinue() {
    if (!selected || !user) return;
    setSaving(true);
    setError(null);
    try {
      // Look up the DB UUID for this vertical by slug
      const { data: vertical, error: fetchError } = await supabase
        .from('verticals')
        .select('id')
        .eq('slug', selected)
        .single();

      if (fetchError || !vertical) throw fetchError ?? new Error('Saathi not found in database');

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ primary_saathi_id: vertical.id })
        .eq('id', user.id);

      if (updateError) throw updateError;

      trackSaathiSelected(selected, true);
      await refreshProfile();
      router.replace('/(auth)/profile-setup');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save Saathi selection';
      setError(msg);
      Sentry.captureException(err, { tags: { action: 'saathi_picker_save' } });
    } finally {
      setSaving(false);
    }
  }

  const selectedSaathi = SAATHIS.find(s => s.id === selected);

  return (
    <View className="flex-1 bg-cream">
      {/* Header */}
      <View className="pt-16 px-6 pb-2">
        <Text
          className="text-3xl text-navy"
          style={{ fontFamily: 'PlayfairDisplay-Bold' }}
        >
          Pick your Saathi
        </Text>
        <Text
          className="text-sm text-navy/60 mt-2"
          style={{ fontFamily: 'DMSans-Regular' }}
        >
          Choose your primary subject companion.{'\n'}You can explore more later.
        </Text>

        {/* Search */}
        <View
          className="flex-row items-center rounded-xl px-4 mt-5 mb-1"
          style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#0B1F3A15' }}
        >
          <Text className="text-navy/40 mr-2">🔍</Text>
          <TextInput
            className="flex-1 py-3 text-navy text-base"
            style={{ fontFamily: 'DMSans-Regular' }}
            placeholder="Search subjects..."
            placeholderTextColor="#0B1F3A55"
            value={search}
            onChangeText={text => setSearch(text.replace(/[<>]/g, '').slice(0, 50))}
            autoCorrect={false}
            autoCapitalize="none"
          />
          {search.length > 0 && (
            <Pressable onPress={() => setSearch('')} hitSlop={8}>
              <Text className="text-navy/40 text-base ml-2">✕</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* Grid */}
      <FlatList
        data={filtered}
        keyExtractor={item => item.id}
        numColumns={2}
        contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 120, paddingTop: 4 }}
        columnWrapperStyle={{ gap: 8 }}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => <SaathiCard saathi={item} selected={selected === item.id} onPress={handleSelect} />}
        showsVerticalScrollIndicator={false}
      />

      {/* Fixed bottom bar */}
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
          onPress={handleContinue}
          disabled={!selected || saving}
          className="rounded-xl py-4 items-center justify-center active:opacity-80"
          style={{
            backgroundColor: selectedSaathi
              ? selectedSaathi.primary
              : '#0B1F3A40',
          }}
        >
          {saving ? (
            <ActivityIndicator color="#FAF7F2" size="small" />
          ) : (
            <Text
              className="text-white text-base"
              style={{ fontFamily: 'DMSans-Medium' }}
            >
              {selectedSaathi ? `Continue with ${selectedSaathi.name} →` : 'Select a Saathi'}
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

// ─── Saathi card ─────────────────────────────────────────────────────────────

function SaathiCard({
  saathi,
  selected,
  onPress,
}: {
  saathi: Saathi;
  selected: boolean;
  onPress: (slug: string) => void;
}) {
  return (
    <Pressable
      onPress={() => onPress(saathi.id)}
      className="flex-1 rounded-2xl p-4 active:opacity-80"
      style={{
        backgroundColor: saathi.bg,
        borderWidth: 2,
        borderColor: selected ? saathi.primary : 'transparent',
        minHeight: 110,
      }}
    >
      {/* Checkmark overlay */}
      {selected && (
        <View
          className="absolute top-3 right-3 rounded-full items-center justify-center"
          style={{ width: 22, height: 22, backgroundColor: saathi.primary }}
        >
          <Text className="text-white text-xs">✓</Text>
        </View>
      )}

      <Text className="text-3xl mb-2">{saathi.emoji}</Text>
      <Text
        className="text-sm"
        style={{ fontFamily: 'DMSans-Bold', color: saathi.primary }}
        numberOfLines={1}
      >
        {saathi.name}
      </Text>
      <Text
        className="text-xs mt-1 leading-4"
        style={{ fontFamily: 'DMSans-Regular', color: saathi.primary + 'CC' }}
        numberOfLines={2}
      >
        {saathi.tagline}
      </Text>
    </Pressable>
  );
}
