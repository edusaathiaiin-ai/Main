'use client'

import { useState, useCallback, useRef } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'

/**
 * LaTeX formula bar for the classroom canvas toolbar.
 * Faculty types LaTeX → live preview → drops rendered formula onto canvas.
 *
 * The onInsert callback receives the rendered SVG string and the raw LaTeX.
 * The parent component is responsible for placing it on the tldraw canvas.
 */
export function FormulaBar({
  onInsert,
}: {
  onInsert: (latex: string, html: string) => void
}) {
  const [input, setInput] = useState('')
  const [expanded, setExpanded] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const preview = (() => {
    if (!input.trim()) return ''
    try {
      return katex.renderToString(input, {
        throwOnError: false,
        displayMode: true,
        output: 'html',
      })
    } catch {
      return ''
    }
  })()

  const handleInsert = useCallback(() => {
    if (!input.trim() || !preview) return
    onInsert(input, preview)
    setInput('')
    setExpanded(false)
  }, [input, preview, onInsert])

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        handleInsert()
      }
      if (e.key === 'Escape') {
        setExpanded(false)
      }
    },
    [handleInsert]
  )

  if (!expanded) {
    return (
      <button
        onClick={() => {
          setExpanded(true)
          setTimeout(() => inputRef.current?.focus(), 50)
        }}
        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-medium)',
          color: 'var(--text-secondary)',
        }}
        title="Insert LaTeX formula"
      >
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '11px' }}>
          f(x)
        </span>
        <span>Formula</span>
      </button>
    )
  }

  return (
    <div
      className="flex items-center gap-2 rounded-xl px-3 py-2"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-medium)',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
      }}
    >
      {/* LaTeX input */}
      <div className="flex min-w-0 flex-1 flex-col gap-1">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type LaTeX... e.g. \frac{a}{b}"
          className="w-full border-0 bg-transparent text-sm outline-none"
          style={{
            color: 'var(--text-primary)',
            fontFamily: 'var(--font-mono)',
            fontSize: '13px',
          }}
        />
        {/* Live preview */}
        {preview && (
          <div
            className="overflow-x-auto rounded-md px-2 py-1"
            style={{ background: 'var(--bg-elevated)' }}
            dangerouslySetInnerHTML={{ __html: preview }}
          />
        )}
      </div>

      {/* Insert button */}
      <button
        onClick={handleInsert}
        disabled={!preview}
        className="shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors disabled:opacity-30"
        style={{
          background: preview ? 'var(--gold)' : 'var(--bg-elevated)',
          color: preview ? '#fff' : 'var(--text-ghost)',
        }}
      >
        Insert
      </button>

      {/* Close */}
      <button
        onClick={() => setExpanded(false)}
        className="shrink-0 text-sm"
        style={{ color: 'var(--text-ghost)' }}
      >
        &times;
      </button>
    </div>
  )
}
