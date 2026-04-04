'use client'

import { SAATHIS } from '@/constants/saathis'
import { ProgressDashboard } from './ProgressDashboard'

type ProgressClientProps = {
  saathiId: string
}

export function ProgressClient({ saathiId }: ProgressClientProps) {
  const saathi = SAATHIS.find((s) => s.id === saathiId) ?? SAATHIS[0]

  return (
    <div
      style={{
        minHeight: '100vh',
        background: '#060F1D',
        color: '#fff',
      }}
    >
      <ProgressDashboard
        saathiId={saathi.id}
        saathiName={saathi.name}
        primaryColor={saathi.primary}
      />
    </div>
  )
}
