'use client'

import { useRouter } from 'next/navigation'

/**
 * ForcedLogoutScreen (web)
 *
 * Shown when the user's session is expired because their account was
 * accessed from another device (single-device enforcement).
 */
export default function ForcedLogoutScreen() {
  const router = useRouter()

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center px-6"
      style={{
        background: 'linear-gradient(180deg, #060F1D 0%, #0B1F3A 100%)',
      }}
    >
      <div className="flex w-full max-w-md flex-col items-center gap-6 text-center">
        {/* Icon */}
        <span className="text-7xl select-none">🔐</span>

        {/* Title */}
        <h1
          className="text-3xl font-bold tracking-tight"
          style={{ fontFamily: 'var(--font-playfair)', color: '#FAF7F2' }}
        >
          Session ended
        </h1>

        {/* Body */}
        <p
          className="text-base leading-relaxed"
          style={{
            color: 'rgba(250, 247, 242, 0.65)',
            fontFamily: 'var(--font-dm-sans)',
          }}
        >
          Your account was accessed from another device and this session was
          ended automatically. This keeps your Saathi secure and your soul
          profile private.
        </p>

        <p
          className="text-sm leading-relaxed"
          style={{
            color: 'rgba(250, 247, 242, 0.40)',
            fontFamily: 'var(--font-dm-sans)',
          }}
        >
          If this wasn&apos;t you — change your login email.
          <br />
          If it was you — simply log back in.
        </p>

        {/* CTA */}
        <button
          onClick={() => router.push('/login')}
          className="mt-2 rounded-xl px-8 py-4 text-base font-semibold transition-opacity hover:opacity-80 active:opacity-60"
          style={{
            backgroundColor: '#C9993A',
            color: '#060F1D',
            fontFamily: 'var(--font-dm-sans)',
            letterSpacing: '0.02em',
          }}
        >
          Log back in →
        </button>
      </div>
    </main>
  )
}
