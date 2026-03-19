import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import * as Sentry from '@sentry/react-native';

import { useAuth } from '@/hooks/useAuth';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 30;

export default function OtpVerifyScreen() {
  const { email } = useLocalSearchParams<{ email: string }>();
  const router = useRouter();
  const { verifyOTP, signInWithEmailOTP, isLoading, error, clearError } = useAuth();

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [verifying, setVerifying] = useState(false);
  const [resendTimer, setResendTimer] = useState(RESEND_COOLDOWN_SECONDS);
  const [canResend, setCanResend] = useState(false);
  const [resending, setResending] = useState(false);

  const inputRefs = useRef<(TextInput | null)[]>(Array(OTP_LENGTH).fill(null));

  // Auto-focus first input on mount
  useEffect(() => {
    const timeout = setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 400);
    return () => clearTimeout(timeout);
  }, []);

  // Resend countdown
  useEffect(() => {
    if (resendTimer <= 0) {
      setCanResend(true);
      return;
    }
    const id = setInterval(() => {
      setResendTimer(prev => {
        if (prev <= 1) {
          clearInterval(id);
          setCanResend(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [resendTimer]);

  // ── Verify handler ──────────────────────────────────────────────────────

  const handleVerify = useCallback(
    async (code: string) => {
      if (!email || code.length !== OTP_LENGTH) return;
      clearError();
      setVerifying(true);
      try {
        await verifyOTP(email, code);
        // Navigation handled by ProtectedRoute / auth state change
      } catch {
        // error state already set inside verifyOTP; reset digits so user can retry
        setDigits(Array(OTP_LENGTH).fill(''));
        setTimeout(() => inputRefs.current[0]?.focus(), 100);
      } finally {
        setVerifying(false);
      }
    },
    [email, verifyOTP, clearError]
  );

  // ── Digit input handlers ─────────────────────────────────────────────────

  function handleDigitChange(text: string, index: number) {
    const cleaned = text.replace(/\D/g, '');

    // Handle paste / autocomplete filling multiple digits
    if (cleaned.length > 1) {
      const newDigits = [...digits];
      let lastFilled = index;
      for (let i = 0; i < Math.min(cleaned.length, OTP_LENGTH - index); i++) {
        newDigits[index + i] = cleaned[i];
        lastFilled = index + i;
      }
      setDigits(newDigits);
      inputRefs.current[Math.min(lastFilled, OTP_LENGTH - 1)]?.focus();
      if (newDigits.every(d => d !== '')) {
        void handleVerify(newDigits.join(''));
      }
      return;
    }

    const digit = cleaned.slice(-1); // take last char in case keyboard sends 2 chars
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);

    if (error) clearError();

    if (digit && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    } else if (digit && index === OTP_LENGTH - 1) {
      const code = newDigits.join('');
      if (code.length === OTP_LENGTH) {
        void handleVerify(code);
      }
    }
  }

  function handleKeyPress(key: string, index: number) {
    if (key === 'Backspace' && !digits[index] && index > 0) {
      const newDigits = [...digits];
      newDigits[index - 1] = '';
      setDigits(newDigits);
      inputRefs.current[index - 1]?.focus();
    }
  }

  // ── Resend OTP ──────────────────────────────────────────────────────────

  async function handleResend() {
    if (!email || !canResend) return;
    setResending(true);
    clearError();
    try {
      await signInWithEmailOTP(email);
      setDigits(Array(OTP_LENGTH).fill(''));
      setCanResend(false);
      setResendTimer(RESEND_COOLDOWN_SECONDS);
      inputRefs.current[0]?.focus();
    } catch {
      // error shown via banner
    } finally {
      setResending(false);
    }
  }

  // ── Back ────────────────────────────────────────────────────────────────

  function handleBack() {
    router.back();
  }

  const busy = isLoading || verifying || resending;
  const maskedEmail = email
    ? email.replace(/(.{2})(.*)(@.*)/, (_m, a, b, c) => a + '*'.repeat(Math.max(0, b.length)) + c)
    : '';

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-cream"
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      {/* ── Back button ──────────────────────────────────────────────────── */}
      <Pressable
        onPress={handleBack}
        className="absolute top-14 left-6 z-10 p-2"
        hitSlop={12}
      >
        <Text className="text-navy text-base" style={{ fontFamily: 'DMSans-Medium' }}>
          ← Back
        </Text>
      </Pressable>

      <View className="flex-1 justify-center px-8">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <Text
          className="text-3xl text-navy text-center"
          style={{ fontFamily: 'PlayfairDisplay-Bold' }}
        >
          Verify your email
        </Text>
        <Text
          className="text-base text-navy/60 text-center mt-3 leading-6"
          style={{ fontFamily: 'DMSans-Regular' }}
        >
          We sent a 6-digit code to{'\n'}
          <Text className="text-navy font-medium">{maskedEmail}</Text>
        </Text>

        {/* ── Error banner ────────────────────────────────────────────── */}
        {error ? (
          <View className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 mt-6">
            <Text
              className="text-red-700 text-sm text-center"
              style={{ fontFamily: 'DMSans-Regular' }}
            >
              {error}
            </Text>
          </View>
        ) : null}

        {/* ── 6-digit input boxes ──────────────────────────────────────── */}
        <View className="flex-row justify-center gap-3 mt-10">
          {Array(OTP_LENGTH)
            .fill(null)
            .map((_, i) => (
              <TextInput
                key={i}
                ref={ref => {
                  inputRefs.current[i] = ref;
                }}
                className="w-12 h-14 rounded-xl border-2 text-center text-xl text-navy"
                style={{
                  fontFamily: 'PlayfairDisplay-Bold',
                  borderColor: digits[i] ? '#C9993A' : '#0B1F3A33',
                  backgroundColor: digits[i] ? '#FFF9F0' : '#FFFFFF',
                }}
                keyboardType="number-pad"
                maxLength={OTP_LENGTH} // allows paste detection
                value={digits[i]}
                onChangeText={text => handleDigitChange(text, i)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
                editable={!busy}
                selectTextOnFocus
                textContentType="oneTimeCode"
                autoComplete={i === 0 ? 'one-time-code' : 'off'}
              />
            ))}
        </View>

        {/* ── Verify button ───────────────────────────────────────────── */}
        <Pressable
          onPress={() => void handleVerify(digits.join(''))}
          disabled={busy || digits.join('').length !== OTP_LENGTH}
          className="mt-8 rounded-xl py-4 items-center justify-center active:opacity-80"
          style={{
            backgroundColor:
              digits.join('').length === OTP_LENGTH && !busy ? '#C9993A' : '#C9993A55',
          }}
        >
          {verifying || (isLoading && digits.join('').length === OTP_LENGTH) ? (
            <ActivityIndicator color="#0B1F3A" size="small" />
          ) : (
            <Text
              className="text-navy text-base"
              style={{ fontFamily: 'DMSans-Medium' }}
            >
              Verify & Sign In
            </Text>
          )}
        </Pressable>

        {/* ── Resend ──────────────────────────────────────────────────── */}
        <View className="flex-row justify-center items-center mt-6">
          {resending ? (
            <ActivityIndicator color="#C9993A" size="small" />
          ) : canResend ? (
            <Pressable onPress={handleResend} hitSlop={8}>
              <Text
                className="text-sm"
                style={{ fontFamily: 'DMSans-Medium', color: '#C9993A' }}
              >
                Resend code
              </Text>
            </Pressable>
          ) : (
            <Text
              className="text-sm text-navy/40"
              style={{ fontFamily: 'DMSans-Regular' }}
            >
              Resend in {resendTimer}s
            </Text>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
