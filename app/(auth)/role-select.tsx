import React, { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Sentry from '@sentry/react-native';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';
import type { UserRole } from '@/types';

type RoleConfig = {
  id: UserRole;
  emoji: string;
  name: string;
  color: string;
  tagline: string;
  what: string;
  why: string;
  who: string;
};

const ROLES: RoleConfig[] = [
  {
    id: 'student',
    emoji: '🎓',
    name: 'Student',
    color: '#4F46E5',
    tagline: 'Pursuing knowledge, driven by curiosity',
    what: 'Full access to all 5 bots across every Saathi — 20 chats per day, unlimited Saathi Check-ins, and notes export.',
    why: 'Your Saathi grows with you through every chapter, exam, and research milestone. It remembers everything.',
    who: 'School students, undergraduates, postgraduates, PhD scholars — anyone actively studying.',
  },
  {
    id: 'faculty',
    emoji: '👨‍🏫',
    name: 'Faculty',
    color: '#16A34A',
    tagline: 'Shaping the next generation of thinkers',
    what: 'All 5 bots plus a Verified Faculty badge on the Community Board. Same quota as students.',
    why: 'Use EdUsaathiAI to guide students, build materials, and stay at the frontier of your domain.',
    who: 'Professors, lecturers, academic researchers, and teaching professionals.',
  },
  {
    id: 'public',
    emoji: '🌐',
    name: 'General Public',
    color: '#EA580C',
    tagline: 'Curiosity has no age, no classroom',
    what: 'Access to Study Notes (Bot 1) and Citizen Guide (Bot 5) — plain, jargon-free explanations. 5 chats per day.',
    why: 'Whether you are curious or need clear answers, your Saathi is here without the textbook wall.',
    who: 'Professionals, parents, lifelong learners — anyone curious about learning.',
  },
  {
    id: 'institution',
    emoji: '🏢',
    name: 'Institution',
    color: '#7C3AED',
    tagline: 'Building ecosystems that produce change-makers',
    what: 'Intern marketplace, Saathi Spotlight listings, and student engagement tools.',
    why: "Post opportunities and attract students from your domain's Saathi community directly.",
    who: 'Colleges, universities, law firms, hospitals, research labs, and companies.',
  },
];

export default function RoleSelectScreen() {
  const router = useRouter();
  const { user, refreshProfile } = useAuth();

  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [expandedRole, setExpandedRole] = useState<UserRole | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleCardTap(roleId: UserRole) {
    if (selectedRole === roleId) {
      // Already selected — toggle expanded details
      setExpandedRole(prev => (prev === roleId ? null : roleId));
    } else {
      setSelectedRole(roleId);
      setExpandedRole(null);
    }
  }

  async function handleContinue() {
    if (!selectedRole || !user) return;
    setSaving(true);
    setError(null);
    try {
      const { error: dbError } = await supabase
        .from('profiles')
        .update({ role: selectedRole })
        .eq('id', user.id);

      if (dbError) throw dbError;

      await refreshProfile();
      router.replace('/(auth)/saathi-picker');
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to save role';
      setError(msg);
      Sentry.captureException(err, { tags: { action: 'role_select_save' } });
    } finally {
      setSaving(false);
    }
  }

  return (
    <View className="flex-1 bg-cream">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 72, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <Text
          className="text-3xl text-navy"
          style={{ fontFamily: 'PlayfairDisplay-Bold' }}
        >
          Who are you here?
        </Text>
        <Text
          className="text-base text-navy/60 mt-2 mb-8"
          style={{ fontFamily: 'DMSans-Regular' }}
        >
          Choose your identity to begin
        </Text>

        {/* Role cards */}
        {ROLES.map(role => {
          const isSelected = selectedRole === role.id;
          const isExpanded = expandedRole === role.id;

          return (
            <Pressable
              key={role.id}
              onPress={() => handleCardTap(role.id)}
              className="mb-4 rounded-2xl overflow-hidden active:opacity-90"
              style={{
                borderWidth: 2,
                borderColor: isSelected ? role.color : '#0B1F3A15',
                backgroundColor: isSelected ? role.color + '0C' : '#FFFFFF',
              }}
            >
              {/* Card header row */}
              <View className="flex-row items-center px-4 py-4">
                <View
                  className="rounded-xl items-center justify-center mr-4"
                  style={{ width: 52, height: 52, backgroundColor: role.color + '18' }}
                >
                  <Text className="text-2xl">{role.emoji}</Text>
                </View>
                <View className="flex-1">
                  <Text
                    className="text-base"
                    style={{ fontFamily: 'DMSans-Bold', color: role.color }}
                  >
                    {role.name}
                  </Text>
                  <Text
                    className="text-xs mt-0.5"
                    style={{ fontFamily: 'DMSans-Regular', color: '#0B1F3A99' }}
                  >
                    {role.tagline}
                  </Text>
                </View>
                {isSelected && (
                  <View
                    className="rounded-full items-center justify-center"
                    style={{ width: 24, height: 24, backgroundColor: role.color }}
                  >
                    <Text className="text-white text-xs">✓</Text>
                  </View>
                )}
                {isSelected && (
                  <Text
                    className="ml-2 text-xs"
                    style={{ fontFamily: 'DMSans-Regular', color: '#0B1F3A60' }}
                  >
                    {isExpanded ? '▲' : '▼'}
                  </Text>
                )}
              </View>

              {/* Expanded details */}
              {isExpanded && (
                <View
                  className="px-5 pb-5 pt-1"
                  style={{ borderTopWidth: 1, borderTopColor: role.color + '20' }}
                >
                  <ExpandRow label="What you get" value={role.what} color={role.color} />
                  <ExpandRow label="Why it matters" value={role.why} color={role.color} />
                  <ExpandRow label="Who this is for" value={role.who} color={role.color} />
                </View>
              )}
            </Pressable>
          );
        })}

        {/* Hint text */}
        <Text
          className="text-xs text-center text-navy/40 mt-2"
          style={{ fontFamily: 'DMSans-Regular' }}
        >
          Tap a card to select · Tap selected to see details
        </Text>
      </ScrollView>

      {/* Fixed bottom Continue button */}
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
          disabled={!selectedRole || saving}
          className="rounded-xl py-4 items-center justify-center active:opacity-80"
          style={{
            backgroundColor: selectedRole
              ? ROLES.find(r => r.id === selectedRole)?.color ?? '#0B1F3A'
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
              Continue →
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

function ExpandRow({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View className="mt-3">
      <Text
        className="text-xs uppercase tracking-widest mb-1"
        style={{ fontFamily: 'DMSans-Medium', color }}
      >
        {label}
      </Text>
      <Text
        className="text-sm leading-5 text-navy/80"
        style={{ fontFamily: 'DMSans-Regular' }}
      >
        {value}
      </Text>
    </View>
  );
}
