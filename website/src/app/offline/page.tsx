'use client';

export default function OfflinePage() {
  return (
    <main
      className="min-h-screen flex flex-col items-center justify-center px-6 text-center"
      style={{ background: '#060F1D' }}
    >
      <div className="text-5xl mb-6">✦</div>
      <h1
        className="font-playfair text-3xl font-bold mb-3"
        style={{ color: '#C9993A' }}
      >
        You&apos;re offline
      </h1>
      <p className="text-base mb-8 max-w-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>
        Your Saathi is waiting. Connect to the internet and your session will resume exactly where you left off.
      </p>
      <button
        onClick={() => window.location.reload()}
        className="px-6 py-3 rounded-xl font-bold text-sm"
        style={{ background: '#C9993A', color: '#060F1D' }}
      >
        Try again →
      </button>
    </main>
  );
}
