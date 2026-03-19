import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Sentry from '@sentry/react-native';

import { useAuth } from '@/hooks/useAuth';

export default function LoginScreen() {
  const router = useRouter();
  const { signInWithGoogle, signInWithEmailOTP, isLoading, error, clearError } = useAuth();

  const [email, setEmail] = useState('');
  const [otpSending, setOtpSending] = useState(false);

  function handleEmailChange(text: string) {
    // Strip HTML tags and limit length
    const sanitized = text.replace(/[<>]/g, '').slice(0, 254);
    if (error) clearError();
    setEmail(sanitized);
  }

  async function handleGoogleSignIn() {
    clearError();
    await signInWithGoogle();
  }

  async function handleSendOTP() {
    if (!email.trim()) return;
    setOtpSending(true);
    try {
      await signInWithEmailOTP(email.trim());
      // Navigate to OTP verify screen on success
      router.push({ pathname: '/(auth)/otp-verify', params: { email: email.trim().toLowerCase() } });
    } catch {
      // error state set inside signInWithEmailOTP
    } finally {
      setOtpSending(false);
    }
  }

  const busy = isLoading || otpSending;

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-cream"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ flexGrow: 1 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero section ─────────────────────────────────────────────── */}
        <View className="items-center pt-20 pb-10 px-8">
          <Text
            className="text-5xl text-navy tracking-tight"
            style={{ fontFamily: 'PlayfairDisplay-Bold' }}
          >
            EdUsaathiAI
          </Text>
          <Text
            className="text-base mt-2 tracking-widest uppercase"
            style={{ fontFamily: 'DMSans-Regular', color: '#C9993A' }}
          >
            Unified Soul Partnership
          </Text>
          <Text
            className="text-sm text-navy/60 mt-4 text-center leading-6"
            style={{ fontFamily: 'DMSans-Regular' }}
          >
            Your personal AI learning companion,{'\n'}built for India's students.
          </Text>
        </View>

        {/* ── Auth card ──────────────────────────────────────────────────── */}
        <View className="mx-6 bg-white rounded-2xl shadow-sm px-6 py-8">

          {/* Error banner */}
          {error ? (
            <View className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-5">
              <Text className="text-red-700 text-sm text-center" style={{ fontFamily: 'DMSans-Regular' }}>
                {error}
              </Text>
            </View>
          ) : null}

          {/* Google Sign-In */}
          <Pressable
            onPress={handleGoogleSignIn}
            disabled={busy}
            className="bg-navy rounded-xl py-4 items-center justify-center flex-row active:opacity-80"
          >
            {isLoading && !otpSending ? (
              <ActivityIndicator color="#FAF7F2" size="small" />
            ) : (
              <>
                <Text className="text-white text-base mr-2" style={{ fontFamily: 'DMSans-Regular' }}>
                  G
                </Text>
                <Text
                  className="text-white text-base"
                  style={{ fontFamily: 'DMSans-Medium' }}
                >
                  Continue with Google
                </Text>
              </>
            )}
          </Pressable>

          {/* Divider */}
          <View className="flex-row items-center my-6">
            <View className="flex-1 h-px bg-navy/15" />
            <Text
              className="mx-4 text-navy/50 text-sm"
              style={{ fontFamily: 'DMSans-Regular' }}
            >
              or sign in with email
            </Text>
            <View className="flex-1 h-px bg-navy/15" />
          </View>

          {/* Email input */}
          <TextInput
            className="border border-navy/20 rounded-xl px-4 py-3.5 text-navy text-base bg-cream/50"
            style={{ fontFamily: 'DMSans-Regular' }}
            placeholder="you@example.com"
            placeholderTextColor="#0B1F3A55"
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="email"
            value={email}
            onChangeText={handleEmailChange}
            editable={!busy}
            returnKeyType="send"
            onSubmitEditing={handleSendOTP}
          />

          {/* Send OTP button */}
          <Pressable
            onPress={handleSendOTP}
            disabled={busy || !email.trim()}
            className="mt-4 rounded-xl py-4 items-center justify-center active:opacity-80"
            style={{ backgroundColor: email.trim() && !busy ? '#C9993A' : '#C9993A55' }}
          >
            {otpSending ? (
              <ActivityIndicator color="#0B1F3A" size="small" />
            ) : (
              <Text
                className="text-navy text-base"
                style={{ fontFamily: 'DMSans-Medium' }}
              >
                Send OTP
              </Text>
            )}
          </Pressable>

          {/* Footer note */}
          <Text
            className="text-xs text-navy/40 text-center mt-6 leading-5"
            style={{ fontFamily: 'DMSans-Regular' }}
          >
            By continuing you agree to our Terms of Service{'\n'}and Privacy Policy (DPDP Act 2023 compliant)
          </Text>
        </View>

        {/* ── Bottom tagline ─────────────────────────────────────────────── */}
        <View className="items-center pb-12 pt-8">
          <Text
            className="text-navy/40 text-xs text-center"
            style={{ fontFamily: 'DMSans-Regular' }}
          >
            Indo American Education Society (IAES){'\n'}Ahmedabad · edusaathiai.in
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
