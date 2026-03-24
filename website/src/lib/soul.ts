/**
 * lib/soul.ts
 *
 * Client-safe helpers for building soul context.
 * Server-side system prompt assembly is done in the Edge Function.
 * This file provides display helpers and defaults for the UI.
 */

import type { SoulProfile } from '@/types';

export function getSoulDisplayName(soul: SoulProfile | null): string {
  return soul?.displayName ?? 'Student';
}

export function getSoulAmbitionEmoji(level: string): string {
  switch (level?.toLowerCase()) {
    case 'high':
    case 'phd':
    case 'upsc':
      return '🔥';
    case 'medium':
      return '📚';
    case 'low':
      return '🌱';
    default:
      return '✨';
  }
}

export function formatTopics(topics: string[] | undefined): string {
  if (!topics || topics.length === 0) return '—';
  return topics.slice(0, 3).join(', ');
}

export const DEFAULT_SOUL: Partial<SoulProfile> = {
  ambitionLevel: 'medium',
  preferredTone: 'neutral',
  enrolledSubjects: [],
  futureSubjects: [],
  topTopics: [],
  struggleTopics: [],
  lastSessionSummary: null,
  sessionCount: 0,
};
