'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

type CommandResult = {
  tool: string
  params: Record<string, unknown>
  displayText: string
}

type Props = {
  sessionId: string
  saathiSlug: string
  saathiColor: string
  onToolLoad: (result: CommandResult) => void
  /** Voice / external trigger — the parent passes a fresh object each
   *  time it wants the bar to run a command (the object reference is
   *  what makes the effect fire; the string alone wouldn't, since two
   *  identical voice commands in a row would deduplicate). When set,
   *  the bar fills its input and submits — same routing as a typed
   *  command. */
  pendingCommand?: { text: string } | null
}

export function CommandBar({ sessionId, saathiSlug, saathiColor, onToolLoad, pendingCommand }: Props) {
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
      const supabase = createClient()
      const { data: { session: authSession } } = await supabase.auth.getSession()
      const token = authSession?.access_token
      if (!token) {
        setLastResult({ tool: 'none', params: {}, displayText: 'Session expired — please refresh the page.' })
        setLoading(false)
        return
      }

      const res = await fetch('/api/classroom/command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
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
  }, [input, loading, saathiSlug, sessionId, onToolLoad])

  // Voice / external trigger. Fires when the parent hands us a new
  // pendingCommand object — fresh ref per invocation so two identical
  // transcripts in a row both re-fire. handleSubmit excluded from deps
  // intentionally; the latest closure is stable enough for the
  // single-shot semantics here, and adding it would re-fire on every
  // keystroke as `input` changes.
  useEffect(() => {
    if (pendingCommand?.text) {
      setExpanded(true)
      handleSubmit(pendingCommand.text)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingCommand])

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
