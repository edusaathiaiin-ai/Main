'use client'

/**
 * AnalyticsIdentifier — reactively identifies users to PostHog.
 *
 * Subscribes to the auth store; fires identify() when the profile arrives
 * or changes (plan upgrade, saathi change, etc.), and reset() on logout.
 *
 * Kept separate from AuthProvider so analytics concerns stay isolated.
 * See CLAUDE.md §25 for event catalogue and privacy rules.
 */

import { useEffect } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { toSlug } from '@/constants/verticalIds'
import { identify, resetAnalytics } from '@/lib/analytics'
import type { Profile } from '@/types'

type PlanId = 'free' | 'trial' | 'plus-monthly' | 'plus-annual' | 'unlimited'
type Role = 'student' | 'faculty' | 'public' | 'institution' | 'global_guest'

function toRole(profile: Profile): Role {
  if (profile.is_geo_limited) return 'global_guest'
  return (profile.role as Role) ?? 'public'
}

function toPlanId(v: string | null | undefined): PlanId {
  if (!v) return 'free'
  if (['free', 'trial', 'plus-monthly', 'plus-annual', 'unlimited'].includes(v)) {
    return v as PlanId
  }
  // Legacy / unknown — map to best guess
  if (v.startsWith('plus')) return 'plus-monthly'
  return 'free'
}

export function AnalyticsIdentifier() {
  const profile = useAuthStore((s) => s.profile)

  useEffect(() => {
    if (!profile) {
      resetAnalytics()
      return
    }

    identify(profile.id, {
      plan_id: toPlanId(profile.plan_id),
      role: toRole(profile),
      primary_saathi_id: toSlug(profile.primary_saathi_id) ?? '',
      academic_level: (profile.academic_level as
        | 'school'
        | 'bachelor'
        | 'masters'
        | 'phd'
        | undefined) ?? undefined,
      city: profile.city ?? undefined,
      is_global_guest: profile.is_geo_limited ?? false,
      signup_date: profile.created_at ?? undefined,
    })
  }, [
    profile?.id,
    profile?.plan_id,
    profile?.role,
    profile?.primary_saathi_id,
    profile?.is_geo_limited,
  ])

  return null
}
