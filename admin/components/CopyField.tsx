'use client';
import { useState } from 'react';

interface CopyFieldProps {
  value: string | null | undefined;
}

export function CopyField({ value }: CopyFieldProps) {
  const [copied, setCopied] = useState(false);

  if (!value) return <span className="text-slate-600 text-xs font-mono">—</span>;

  const copy = async () => {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <button
      onClick={copy}
      title="Click to copy"
      className="group flex items-center gap-1.5 text-left"
    >
      <span className="font-mono text-xs text-slate-300 group-hover:text-white transition-colors truncate max-w-[160px]">
        {value}
      </span>
      <span className={`text-xs shrink-0 transition-colors ${copied ? 'text-emerald-400' : 'text-slate-600 group-hover:text-slate-400'}`}>
        {copied ? '✓' : '⎘'}
      </span>
    </button>
  );
}
