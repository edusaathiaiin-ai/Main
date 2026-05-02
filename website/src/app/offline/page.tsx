'use client'

export const dynamic = 'force-dynamic'

export default function OfflinePage() {
  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center px-6 text-center"
      style={{ background: '#060F1D' }}
    >
      <div className="mb-6 text-5xl">✦</div>
      <h1
        className="font-display mb-3 text-3xl font-bold"
        style={{ color: '#C9993A' }}
      >
        You&apos;re offline
      </h1>
      <p
        className="mb-8 max-w-sm text-base"
        style={{ color: 'rgba(255,255,255,0.5)' }}
      >
        Your Saathi is waiting. Connect to the internet and your session will
        resume exactly where you left off.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="rounded-xl px-6 py-3 text-sm font-bold"
        style={{ background: '#C9993A', color: '#060F1D' }}
      >
        Try again →
      </button>
    </main>
  )
}
