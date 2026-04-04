'use client'

import { useMemo } from 'react'
import { SAATHIS } from '@/constants/saathis'
import { UUID_TO_SLUG } from '@/constants/verticalIds'
import { useAuthStore } from '@/stores/authStore'
import type { Saathi } from '@/types'

export function useSaathi(saathiId?: string): Saathi | null {
  return useMemo(() => {
    if (!saathiId) return null
    const slug = UUID_TO_SLUG[saathiId] ?? saathiId
    return SAATHIS.find((s) => s.id === slug) ?? null
  }, [saathiId])
}

export function usePrimarySaathi(): Saathi | null {
  const { profile } = useAuthStore()
  return useMemo(() => {
    const slug =
      UUID_TO_SLUG[profile?.primary_saathi_id ?? ''] ??
      profile?.primary_saathi_id
    return SAATHIS.find((s) => s.id === slug) ?? SAATHIS[0]
  }, [profile?.primary_saathi_id])
}

export function useAllSaathis(): Saathi[] {
  return SAATHIS
}
