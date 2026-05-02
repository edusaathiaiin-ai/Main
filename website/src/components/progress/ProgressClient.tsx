'use client'

import Link from 'next/link'
import { SAATHIS } from '@/constants/saathis'
import { ProgressDashboard } from './ProgressDashboard'

type ProgressClientProps = {
  saathiId: string
}

export function ProgressClient({ saathiId }: ProgressClientProps) {
  const saathi = SAATHIS.find((s) => s.id === saathiId) ?? null

  if (!saathi) {
    return (
      <div
        style={{
          minHeight: '100vh',
          background: 'var(--bg-base)',
          color: 'var(--text-primary)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '32px',
          textAlign: 'center',
        }}
      >
        <div>
          <p style={{ fontSize: '15px', marginBottom: '12px' }}>
            We couldn&apos;t resolve your Saathi for the progress view.
          </p>
          <Link href="/onboard" style={{ color: 'var(--gold)' }}>
            Pick your Saathi →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg-base)',
        color: 'var(--text-primary)',
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
