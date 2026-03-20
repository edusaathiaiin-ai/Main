import React, { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import { makeRedirectUri } from 'expo-auth-session';
import * as Sentry from '@sentry/react-native';

import { supabase } from '@/lib/supabase';
import type { Profile } from '@/types';
import { checkConversionShouldShow, markConversionShown } from '@/hooks/useConversionTrigger';

// Required for iOS to properly close the auth session after redirect
WebBrowser.maybeCompleteAuthSession();

const DEVICE_ID_KEY = 'edusaathiai.device_id.v1';

type AuthRegisterAction = 'precheck' | 'register_profile';

type AuthRegisterResponse = {
  ok?: boolean;
  error?: string;
  profile?: Profile;
};

async function getOrCreateDeviceId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(DEVICE_ID_KEY);
  if (existing) return existing;

  const generated = `dev_${Date.now().toString(36)}_${Math.random()
    .toString(36)
    .slice(2, 12)}`;
  await SecureStore.setItemAsync(DEVICE_ID_KEY, generated);
  return generated;
}

async function callAuthRegister(
  action: AuthRegisterAction,
  payload: Record<string, unknown>,
  accessToken?: string
): Promise<AuthRegisterResponse> {
  const url = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/functions/v1/auth-register`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    apikey: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? '',
  };

  if (accessToken) {
    headers.Authorization = `Bearer ${accessToken}`;
  }

  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ action, ...payload }),
  });

  const json = (await res.json()) as AuthRegisterResponse;
  if (!res.ok) {
    throw new Error(json.error || 'Registration validation failed');
  }

  return json;
}

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  isLoading: boolean;
  error: string | null;
  /** Set to true once day_45 conversion check fires on this session */
  showDay45Popup: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmailOTP: (email: string) => Promise<void>;
  verifyOTP: (email: string, token: string) => Promise<void>;
  signOut: () => Promise<void>;
  clearError: () => void;
  /** Re-fetches the profile from DB and updates context state. Call after any profile update. */
  refreshProfile: () => Promise<void>;
  clearDay45Popup: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showDay45Popup, setShowDay45Popup] = useState(false);

  // OAuth redirect URI — expo-auth-session handles Expo Go vs standalone automatically
  const redirectUri = makeRedirectUri({
    scheme: 'edusaathiai',
    path: 'auth/callback',
  });

  // ── Bootstrap: load session on mount and subscribe to auth changes ──────
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: storedSession } }) => {
      setSession(storedSession);
      setUser(storedSession?.user ?? null);
      if (storedSession?.user) {
        void loadOrCreateProfile(storedSession.user, storedSession.access_token);
      } else {
        setIsLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (event === 'SIGNED_IN' && newSession?.user) {
        await loadOrCreateProfile(newSession.user, newSession.access_token);
      } else if (event === 'SIGNED_OUT') {
        setProfile(null);
        setIsLoading(false);
      } else {
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Helpers ──────────────────────────────────────────────────────────────

  async function loadOrCreateProfile(authUser: User, accessToken?: string) {
    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', authUser.id)
        .single();

      if (fetchError && fetchError.code === 'PGRST116') {
        const deviceId = await getOrCreateDeviceId();

        let token = accessToken;
        if (!token) {
          const {
            data: { session: currentSession },
          } = await supabase.auth.getSession();
          token = currentSession?.access_token;
        }

        if (!token) {
          throw new Error('Unable to validate registration session');
        }

        const registerRes = await callAuthRegister('register_profile', { deviceId }, token);
        if (registerRes.profile) {
          setProfile(registerRes.profile);
        }
      } else if (data) {
        const p = data as Profile;
        setProfile(p);

        // ── Increment login_count (fire-and-forget) ──────────────────────
        const newCount = (p.login_count ?? 0) + 1;
        supabase
          .from('profiles')
          .update({ login_count: newCount })
          .eq('id', authUser.id)
          .then(({ error: updateErr }) => {
            if (updateErr) console.warn('login_count update failed:', updateErr.message);
          });

        // ── day_45 conversion check ───────────────────────────────────────
        const createdAt = new Date(p.created_at ?? Date.now());
        const daysSince = (Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24);
        if (daysSince >= 45 && daysSince < 60) {
          checkConversionShouldShow(authUser.id, 'day_45')
            .then(async (should) => {
              if (should) {
                setShowDay45Popup(true);
                await markConversionShown(authUser.id, 'day_45');
              }
            })
            .catch((err: unknown) =>
              Sentry.captureException(err, { tags: { action: 'day45_check' } })
            );
        }
      } else if (fetchError) {
        Sentry.captureException(fetchError, { tags: { action: 'profile_load' } });
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Profile setup failed';
      setError(message);
      Sentry.captureException(err, { tags: { action: 'profile_bootstrap' } });

      if (
        message.includes('permanent email') ||
        message.includes('Account exists on this device')
      ) {
        await supabase.auth.signOut();
      }
    } finally {
      setIsLoading(false);
    }
  }

  // ── Auth actions ─────────────────────────────────────────────────────────

  async function signInWithGoogle(): Promise<void> {
    try {
      setIsLoading(true);
      setError(null);

      const { data, error: oauthError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true,
        },
      });

      if (oauthError) throw oauthError;
      if (!data.url) throw new Error('No authentication URL returned from Supabase');

      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUri);

      if (result.type === 'success') {
        // Extract tokens from the URL hash fragment
        const hashFragment = result.url.split('#')[1] ?? '';
        const params = new URLSearchParams(hashFragment);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken && refreshToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });
          if (sessionError) throw sessionError;
        } else {
          throw new Error('OAuth callback did not include auth tokens');
        }
      }
      // result.type === 'cancel' | 'dismiss' — user closed browser; no action needed
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google sign-in failed';
      setError(message);
      Sentry.captureException(err, { tags: { action: 'google_signin' } });
    } finally {
      setIsLoading(false);
    }
  }

  async function signInWithEmailOTP(email: string): Promise<void> {
    try {
      setIsLoading(true);
      setError(null);

      // Sanitize: strip HTML, enforce length, lowercase
      const sanitized = email.trim().toLowerCase().replace(/[<>]/g, '').slice(0, 254);

      if (!sanitized || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(sanitized)) {
        throw new Error('Please enter a valid email address');
      }

      const deviceId = await getOrCreateDeviceId();
      await callAuthRegister('precheck', { email: sanitized, deviceId });

      const { error: otpError } = await supabase.auth.signInWithOtp({
        email: sanitized,
        options: { shouldCreateUser: true },
      });
      if (otpError) throw otpError;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send OTP';
      setError(message);
      Sentry.captureException(err, { tags: { action: 'email_otp_send' } });
      throw err; // rethrow so login.tsx can stay on screen or navigate to otp-verify
    } finally {
      setIsLoading(false);
    }
  }

  async function verifyOTP(email: string, token: string): Promise<void> {
    try {
      setIsLoading(true);
      setError(null);

      const sanitizedEmail = email.trim().toLowerCase().slice(0, 254);
      const sanitizedToken = token.replace(/\D/g, '').slice(0, 6);

      if (sanitizedToken.length !== 6) {
        throw new Error('Please enter the 6-digit code');
      }

      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: sanitizedEmail,
        token: sanitizedToken,
        type: 'email',
      });
      if (verifyError) throw verifyError;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid or expired code — try again';
      setError(message);
      Sentry.captureException(err, { tags: { action: 'otp_verify' } });
      throw err;
    } finally {
      setIsLoading(false);
    }
  }

  async function signOut(): Promise<void> {
    try {
      setIsLoading(true);
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) throw signOutError;
    } catch (err) {
      Sentry.captureException(err, { tags: { action: 'signout' } });
    } finally {
      setIsLoading(false);
    }
  }

  function clearError() {
    setError(null);
  }

  function clearDay45Popup() {
    setShowDay45Popup(false);
  }

  async function refreshProfile(): Promise<void> {
    if (!user) return;
    try {
      const { data, error: fetchError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (fetchError) {
        Sentry.captureException(fetchError, { tags: { action: 'profile_refresh' } });
      } else if (data) {
        setProfile(data as Profile);
      }
    } catch (err) {
      Sentry.captureException(err, { tags: { action: 'profile_refresh' } });
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        profile,
        isLoading,
        error,
        showDay45Popup,
        signInWithGoogle,
        signInWithEmailOTP,
        verifyOTP,
        signOut,
        clearError,
        refreshProfile,
        clearDay45Popup,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth() must be called inside <AuthProvider>');
  }
  return context;
}
