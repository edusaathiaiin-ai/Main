import React, { useEffect, useState } from 'react';
import { ActivityIndicator, ScrollView, Text, View } from 'react-native';
import * as Sentry from '@sentry/react-native';

import { supabase } from '@/lib/supabase';
import { useAuth } from '@/hooks/useAuth';

type VerticalInfo = {
  name: string;
  emoji: string;
  primary_color: string;
  bg_color: string;
};

export default function HomeScreen() {
  const { profile, user } = useAuth();
  const [vertical, setVertical] = useState<VerticalInfo | null>(null);
  const [loadingVertical, setLoadingVertical] = useState(false);

  useEffect(() => {
    if (!profile?.primary_saathi_id) return;
    setLoadingVertical(true);
    supabase
      .from('verticals')
      .select('name, emoji, primary_color, bg_color')
      .eq('id', profile.primary_saathi_id)
      .single()
      .then(({ data, error }) => {
        if (error) {
          Sentry.captureException(error, { tags: { action: 'home_load_vertical' } });
        } else if (data) {
          setVertical(data as VerticalInfo);
        }
        setLoadingVertical(false);
      });
  }, [profile?.primary_saathi_id]);

  const firstName = profile?.full_name?.split(' ')[0] ?? 'Friend';

  return (
    <ScrollView
      className="flex-1 bg-cream"
      contentContainerStyle={{ paddingHorizontal: 20, paddingTop: 72, paddingBottom: 40 }}
      showsVerticalScrollIndicator={false}
    >
      {/* Logo */}
      <Text
        className="text-2xl tracking-tight"
        style={{ fontFamily: 'PlayfairDisplay-Bold' }}
      >
        <Text style={{ color: '#0B1F3A' }}>EdU</Text>
        <Text style={{ color: '#C9993A' }}>saathi</Text>
        <Text style={{ color: '#0B1F3A' }}>AI</Text>
      </Text>

      {/* Welcome heading */}
      <Text
        className="text-3xl text-navy mt-6"
        style={{ fontFamily: 'PlayfairDisplay-Bold' }}
      >
        Welcome,{'\n'}{firstName}!
      </Text>
      <Text
        className="text-base text-navy/60 mt-2"
        style={{ fontFamily: 'DMSans-Regular' }}
      >
        Your journey begins here.
      </Text>

      {/* Active Saathi card */}
      <View className="mt-8">
        <Text
          className="text-xs uppercase tracking-widest text-navy/50 mb-3"
          style={{ fontFamily: 'DMSans-Medium', letterSpacing: 2 }}
        >
          Your Primary Saathi
        </Text>

        {loadingVertical ? (
          <ActivityIndicator color="#C9993A" size="small" />
        ) : vertical ? (
          <View
            className="rounded-2xl p-5 flex-row items-center"
            style={{ backgroundColor: vertical.bg_color }}
          >
            <Text className="text-4xl mr-4">{vertical.emoji}</Text>
            <View className="flex-1">
              <Text
                className="text-lg"
                style={{ fontFamily: 'PlayfairDisplay-Bold', color: vertical.primary_color }}
              >
                {vertical.name}
              </Text>
              <Text
                className="text-sm mt-1"
                style={{ fontFamily: 'DMSans-Regular', color: vertical.primary_color + 'CC' }}
              >
                Ready to learn with you
              </Text>
            </View>
            <View
              className="rounded-2xl px-4 py-2"
              style={{ backgroundColor: vertical.primary_color }}
            >
              <Text
                className="text-xs text-white"
                style={{ fontFamily: 'DMSans-Medium' }}
              >
                Open Chat →
              </Text>
            </View>
          </View>
        ) : (
          <View className="rounded-2xl p-5 bg-white items-center">
            <Text
              className="text-sm text-navy/50"
              style={{ fontFamily: 'DMSans-Regular' }}
            >
              No Saathi selected yet
            </Text>
          </View>
        )}
      </View>

      {/* Founding Student badge */}
      <View
        className="mt-6 rounded-2xl p-5 flex-row items-center"
        style={{ backgroundColor: '#C9993A15' }}
      >
        <Text className="text-3xl mr-4">⭐</Text>
        <View className="flex-1">
          <Text
            className="text-sm"
            style={{ fontFamily: 'DMSans-Bold', color: '#C9993A' }}
          >
            Founding Student Access
          </Text>
          <Text
            className="text-xs mt-1 text-navy/60"
            style={{ fontFamily: 'DMSans-Regular' }}
          >
            60 days of full Premium — no card needed.
          </Text>
        </View>
      </View>

      {/* Coming soon note */}
      <View
        className="mt-8 rounded-2xl p-5 items-center"
        style={{ backgroundColor: '#FFFFFF', borderWidth: 1, borderColor: '#0B1F3A10' }}
      >
        <Text className="text-2xl mb-2">🚧</Text>
        <Text
          className="text-sm text-navy/60 text-center"
          style={{ fontFamily: 'DMSans-Regular' }}
        >
          Full home dashboard coming in Step 7.{'\n'}Chat, Board, News, and Check-ins are on their way.
        </Text>
      </View>
    </ScrollView>
  );
}
