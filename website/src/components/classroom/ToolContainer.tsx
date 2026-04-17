'use client'

import { ReactNode, useState } from 'react'

/**
 * Styled container for embedded classroom tools.
 * Wraps iframes, editors, and panels with consistent chrome:
 * - 12px border radius
 * - Thin header with tool name + source badge
 * - Loading skeleton while content initialises
 * - overflow: hidden — no raw iframe scrollbars
 */
export function ToolContainer({
  name,
  source,
  loading,
  children,
}: {
  name: string
  source?: string
  loading?: boolean
  children: ReactNode
}) {
  return (
    <div
      className="flex h-full flex-col overflow-hidden rounded-xl"
      style={{ border: '1px solid var(--border-medium)' }}
    >
      {/* Header */}
      <div
        className="flex shrink-0 items-center justify-between px-3 py-1.5"
        style={{
          background: 'var(--bg-elevated)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <span className="text-[11px] font-semibold" style={{ color: 'var(--text-secondary)' }}>
          {name}
        </span>
        {source && (
          <span
            className="text-[9px] font-semibold"
            style={{ color: 'var(--text-ghost)', fontFamily: 'var(--font-mono)' }}
          >
            {source}
          </span>
        )}
      </div>

      {/* Content */}
      <div className="relative flex-1 overflow-hidden">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center" style={{ background: 'var(--bg-base)' }}>
            <div className="space-y-3 text-center">
              <div
                className="mx-auto h-6 w-6 animate-spin rounded-full border-2"
                style={{ borderColor: 'var(--border-medium)', borderTopColor: 'var(--gold)' }}
              />
              <p className="text-[10px]" style={{ color: 'var(--text-ghost)' }}>Loading {name}...</p>
            </div>
          </div>
        )}
        {children}
      </div>
    </div>
  )
}
