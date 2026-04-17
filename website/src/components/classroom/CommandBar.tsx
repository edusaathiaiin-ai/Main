'use client'

import { useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type CommandResult = {
  tool: string
  params: Record<string, unknown>
  displayText: string
}

type Props = {
  sessionId: string
  saathiSlug: string
  saathiColor: string
  accessToken: string
  onToolLoad: (result: CommandResult) => void
}

export function CommandBar({ sessionId, saathiSlug, saathiColor, accessToken, onToolLoad }: Props) {
  const [input, setInput] = useState('')
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [history, setHistory] = useState<{ command: string; result: CommandResult }[]>([])
  const [lastResult, setLastResult] = useState<CommandResult | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = useCallback(async (command?: string) => {
    const cmd = (command ?? input).trim()
    if (!cmd || loading) return

    setLoading(true)
    setLastResult(null)

    try {
      const res = await fetch('/api/classroom/command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ command: cmd, saathiSlug, sessionId }),
      })

      const data = await res.json() as CommandResult

      setLastResult(data)
      setHistory((prev) => [{ command: cmd, result: data }, ...prev].slice(0, 5))
      setInput('')

      if (data.tool !== 'none') {
        onToolLoad(data)
      }
    } catch {
      setLastResult({ tool: 'none', params: {}, displayText: 'Request failed — check your connection.' })
    }

    setLoading(false)
  }, [input, loading, accessToken, saathiSlug, sessionId, onToolLoad])

  return (
    <div style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      {/* Main bar */}
      <div
        onClick={() => { setExpanded(true); inputRef.current?.focus() }}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: expanded ? '10px 14px' : '6px 14px',
          cursor: 'text',
          transition: 'padding 0.2s',
        }}
      >
        <span style={{ fontSize: '14px', opacity: 0.6 }}>✦</span>
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onFocus={() => setExpanded(true)}
          onBlur={() => { if (!input && !lastResult) setTimeout(() => setExpanded(false), 200) }}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSubmit() }}
          placeholder="Ask your Teaching Assistant — type any concept, formula, compound, case, or topic..."
          disabled={loading}
          style={{
            flex: 1, border: 'none', outline: 'none',
            fontSize: expanded ? '14px' : '12px',
            color: 'var(--text-primary)',
            background: 'transparent',
            fontFamily: 'inherit',
            transition: 'font-size 0.2s',
          }}
        />
        {loading && (
          <span style={{ fontSize: '12px', color: 'var(--text-ghost)' }}>Thinking…</span>
        )}
        {input.trim() && !loading && (
          <button
            onClick={() => handleSubmit()}
            style={{
              padding: '4px 12px', borderRadius: '6px',
              fontSize: '11px', fontWeight: 600,
              background: saathiColor, color: '#fff',
              border: 'none', cursor: 'pointer',
            }}
          >
            Go
          </button>
        )}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            style={{ overflow: 'hidden' }}
          >
            {/* Result display */}
            {lastResult && (
              <div style={{
                margin: '0 14px 8px',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '12px',
                background: lastResult.tool === 'none' ? 'rgba(245,158,11,0.08)' : `${saathiColor}08`,
                border: `1px solid ${lastResult.tool === 'none' ? 'rgba(245,158,11,0.2)' : `${saathiColor}20`}`,
                color: lastResult.tool === 'none' ? '#D97706' : 'var(--text-secondary)',
              }}>
                {lastResult.displayText}
              </div>
            )}

            {/* History chips */}
            {history.length > 0 && (
              <div style={{
                display: 'flex', gap: '4px', flexWrap: 'wrap',
                padding: '0 14px 8px',
              }}>
                {history.slice(0, 3).map((h, i) => (
                  <button
                    key={i}
                    onClick={() => handleSubmit(h.command)}
                    style={{
                      padding: '3px 10px', borderRadius: '100px',
                      fontSize: '10px', fontWeight: 500,
                      background: 'var(--bg-elevated)',
                      color: 'var(--text-tertiary)',
                      border: '1px solid var(--border-subtle)',
                      cursor: 'pointer',
                      maxWidth: '200px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h.command}
                  </button>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
