'use client';

import { useState } from 'react';

type Props = { saathiId?: string };

export function RefreshButton({ saathiId }: Props) {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function triggerRefresh() {
    setBusy(true);
    try {
      const body = saathiId ? JSON.stringify({ vertical_id: saathiId }) : JSON.stringify({ all: true });
      await fetch(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/refresh-saathi-stats`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '',
            Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ''}`,
          },
          body,
        }
      );
      setDone(true);
      setTimeout(() => { setDone(false); window.location.reload(); }, 1500);
    } catch {
      setBusy(false);
    }
  }

  if (done) return <span className="text-xs text-emerald-400">✓ Queued</span>;

  return (
    <button onClick={triggerRefresh} disabled={busy}
      className={`text-[10px] px-2 py-1 rounded-lg font-medium transition-colors disabled:opacity-50 ${
        saathiId
          ? 'bg-slate-700 text-slate-300 hover:bg-slate-600'
          : 'bg-amber-500/15 text-amber-400 hover:bg-amber-500/25 text-xs px-3 py-2'
      }`}>
      {busy ? '…' : saathiId ? '🔄' : '🔄 Refresh All'}
    </button>
  );
}
