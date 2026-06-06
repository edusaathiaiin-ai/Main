'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { SAATHIS } from '@/constants/saathis'
import { ProgressDashboard } from './ProgressDashboard'
import { FiArrowLeft } from 'react-icons/fi'

type ProgressClientProps = {
  saathiId: string
}

export function ProgressClient({ saathiId }: ProgressClientProps) {
  const router = useRouter()
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
      {/* Back navigation */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          background: 'var(--bg-base)',
          borderBottom: '1px solid var(--border-subtle)',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}
      >
        <button
          onClick={() => router.back()}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 500,
            color: saathi.primary,
            padding: '6px 12px',
            borderRadius: '8px',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = `${saathi.primary}12`
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <FiArrowLeft size={16} />
          Back
        </button>

        <span style={{
          fontSize: '12px',
          color: 'var(--text-ghost)',
          fontWeight: 500,
        }}>
          ·
        </span>

        <Link
          href="/chat"
          style={{
            fontSize: '12px',
            color: 'var(--text-tertiary)',
            textDecoration: 'none',
            fontWeight: 500,
            transition: 'color 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = saathi.primary)}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-tertiary)')}
        >
          Back to Chat
        </Link>
      </div>

      <ProgressDashboard
        saathiId={saathi.id}
        saathiName={saathi.name}
        primaryColor={saathi.primary}
      />
    </div>
  )
}
