'use client'

import type { FacultyTool } from '@/lib/faculty-solo/pluginRegistry'

export function ComingSoonPanel({ tool }: { tool: FacultyTool }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
      <p style={{ fontSize: 40 }}>{tool.emoji}</p>
      <p className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
        {tool.name}
      </p>
      <p className="text-sm" style={{ color: 'var(--text-secondary)', maxWidth: 280 }}>
        {tool.description}
      </p>
      <p className="text-xs italic" style={{ color: 'var(--text-tertiary)' }}>
        This panel is being wired this week.
      </p>
      <a
        href={tool.sourceUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 rounded-lg px-4 py-2 text-xs font-bold"
        style={{ background: 'var(--gold)', color: '#fff' }}
      >
        Open {tool.sourceUrl.replace(/^https?:\/\//, '').split('/')[0]} ↗
      </a>
      <p className="mt-1 text-[10px] uppercase tracking-wide" style={{ color: 'var(--text-ghost)' }}>
        {tool.sourceLabel}
      </p>
    </div>
  )
}
