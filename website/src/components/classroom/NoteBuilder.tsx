'use client'

import { useState, useRef, useEffect, useCallback } from 'react'

type Props = {
  sessionId: string
  sessionTitle: string
  open: boolean
  onClose: () => void
  isFaculty?: boolean
  studentCount?: number
}

const STORAGE_KEY = (id: string) => `classroom-notes-${id}`
const AUTOSAVE_MS = 30_000

export function NoteBuilder({ sessionId, sessionTitle, open, onClose, isFaculty = false, studentCount = 0 }: Props) {
  const editorRef = useRef<HTMLDivElement>(null)
  const saveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const [lastSaved, setLastSaved] = useState<string>('')

  // Restore from localStorage
  useEffect(() => {
    if (!editorRef.current) return
    try {
      const saved = localStorage.getItem(STORAGE_KEY(sessionId))
      if (saved) editorRef.current.innerHTML = saved
    } catch { /* ignore */ }
  }, [sessionId])

  // Auto-save every 30s
  useEffect(() => {
    saveTimerRef.current = setInterval(() => {
      if (!editorRef.current) return
      const html = editorRef.current.innerHTML
      if (!html || html === '<br>') return
      try {
        localStorage.setItem(STORAGE_KEY(sessionId), html)
        setLastSaved(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }))
      } catch { /* ignore */ }
    }, AUTOSAVE_MS)

    return () => {
      if (saveTimerRef.current) clearInterval(saveTimerRef.current)
    }
  }, [sessionId])

  const saveNow = useCallback(() => {
    if (!editorRef.current) return
    try {
      localStorage.setItem(STORAGE_KEY(sessionId), editorRef.current.innerHTML)
      setLastSaved(new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }))
    } catch { /* ignore */ }
  }, [sessionId])

  const execCmd = useCallback((cmd: string, value?: string) => {
    document.execCommand(cmd, false, value)
    editorRef.current?.focus()
  }, [])

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key === 'b') { e.preventDefault(); execCmd('bold') }
      if (e.key === 'h') {
        e.preventDefault()
        const sel = window.getSelection()
        const block = sel?.anchorNode?.parentElement?.closest('h3')
        execCmd('formatBlock', block ? 'p' : 'h3')
      }
      if (e.key === 's') { e.preventDefault(); saveNow() }
    }
  }, [execCmd, saveNow])

  const handlePrint = useCallback(() => {
    const content = editorRef.current?.innerHTML ?? ''
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Notes — ${sessionTitle}</title>
<style>
  body { font-family: 'Plus Jakarta Sans', sans-serif; max-width: 700px; margin: 40px auto; padding: 0 24px; color: #1A1814; }
  h1 { font-size: 18px; font-weight: 700; margin: 0 0 4px; }
  .meta { font-size: 12px; color: #7A7570; margin: 0 0 24px; }
  .notes { font-size: 14px; line-height: 1.8; }
  .notes h3 { font-size: 15px; font-weight: 700; margin: 16px 0 4px; }
  .notes ul, .notes ol { padding-left: 20px; }
  @media print { body { margin: 20px; } }
</style></head><body>
  <h1>${sessionTitle}</h1>
  <p class="meta">${new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}</p>
  <div class="notes">${content}</div>
</body></html>`)
    printWindow.document.close()
    printWindow.print()
  }, [sessionTitle])

  // Get notes HTML for session end archival
  const getNotesHtml = useCallback(() => {
    return editorRef.current?.innerHTML ?? ''
  }, [])

  // Expose getNotesHtml on the DOM element for the parent to read
  useEffect(() => {
    const el = editorRef.current?.closest('[data-note-builder]')
    if (el) (el as HTMLElement & { getNotesHtml?: () => string }).getNotesHtml = getNotesHtml
  }, [getNotesHtml])

  return (
    <div
      data-note-builder
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: open ? '280px' : '0px',
        overflow: 'hidden',
        background: 'var(--bg-surface)',
        borderLeft: open ? '1px solid var(--border-subtle)' : 'none',
        transition: 'width 200ms ease',
        zIndex: 30,
        display: 'flex',
        flexDirection: 'column',
        paddingBottom: '40px',
      }}
    >
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 12px', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0,
      }}>
        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>
          Notes
        </span>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: '16px', color: 'var(--text-ghost)', lineHeight: 1,
        }}>×</button>
      </div>

      {/* Toolbar */}
      <div style={{
        display: 'flex', gap: '2px', padding: '6px 10px',
        borderBottom: '1px solid var(--border-subtle)', flexShrink: 0,
      }}>
        <ToolBtn label="B" title="Bold (Ctrl+B)" onClick={() => execCmd('bold')} bold />
        <ToolBtn label="H" title="Heading (Ctrl+H)" onClick={() => execCmd('formatBlock', 'h3')} />
        <ToolBtn label="•" title="Bullet list" onClick={() => execCmd('insertUnorderedList')} />
        <ToolBtn label="1." title="Numbered list" onClick={() => execCmd('insertOrderedList')} />
      </div>

      {/* Editor */}
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onKeyDown={handleKeyDown}
        style={{
          flex: 1,
          padding: '12px',
          fontSize: '13px',
          lineHeight: 1.7,
          color: 'var(--text-primary)',
          outline: 'none',
          overflowY: 'auto',
          minHeight: 0,
        }}
      />

      {/* Footer — share menu */}
      <ShareFooter
        lastSaved={lastSaved}
        isFaculty={isFaculty}
        studentCount={studentCount}
        sessionId={sessionId}
        onPrint={handlePrint}
      />
    </div>
  )
}

function ShareFooter({
  lastSaved, isFaculty, studentCount, sessionId, onPrint,
}: {
  lastSaved: string; isFaculty: boolean; studentCount: number
  sessionId: string; onPrint: () => void
}) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [sendState, setSendState] = useState<Record<string, 'idle' | 'sending' | 'sent' | 'error'>>({
    whatsapp: 'idle', email: 'idle',
  })
  const [result, setResult] = useState<{ sent: number; totalStudents: number } | null>(null)

  async function handleSend(channel: 'whatsapp' | 'email' | 'both') {
    setSendState(prev => ({ ...prev, [channel]: 'sending' }))
    try {
      const res = await fetch('/api/classroom/share-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, channel }),
      })
      const data = await res.json()
      if (res.ok && data.sent > 0) {
        setSendState(prev => ({ ...prev, [channel]: 'sent' }))
        setResult({ sent: data.sent, totalStudents: data.totalStudents })
      } else {
        setSendState(prev => ({ ...prev, [channel]: 'error' }))
      }
    } catch { setSendState(prev => ({ ...prev, [channel]: 'error' })) }
  }

  return (
    <div style={{ borderTop: '1px solid var(--border-subtle)', flexShrink: 0 }}>
      {/* Auto-save status + share button */}
      <div style={{
        padding: '8px 12px', display: 'flex', alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: '10px', color: 'var(--text-ghost)' }}>
          {lastSaved ? `Saved ${lastSaved}` : 'Auto-saves every 30s'}
        </span>
        <button onClick={() => setMenuOpen(o => !o)} style={{
          padding: '4px 10px', borderRadius: '6px', fontSize: '11px', fontWeight: 600,
          background: menuOpen ? 'var(--saathi-light)' : 'var(--bg-elevated)',
          border: `1px solid ${menuOpen ? 'var(--saathi-border)' : 'var(--border-subtle)'}`,
          color: menuOpen ? 'var(--saathi-text)' : 'var(--text-secondary)', cursor: 'pointer',
        }}>
          Share Notes {menuOpen ? '▴' : '▾'}
        </button>
      </div>

      {/* Share menu */}
      {menuOpen && (
        <div style={{
          padding: '8px 12px 12px', borderTop: '1px solid var(--border-subtle)',
          background: 'var(--bg-elevated)',
        }}>
          <p style={{ fontSize: '11px', fontWeight: 700, color: 'var(--text-secondary)', margin: '0 0 8px' }}>
            Share today&apos;s notes
          </p>

          {/* Save as PDF */}
          <ShareBtn icon="📄" label="Save as PDF" onClick={onPrint} state="idle" />

          {/* Send via WhatsApp — faculty only */}
          {isFaculty && (
            <ShareBtn
              icon="💬"
              label="Send via WhatsApp"
              onClick={() => handleSend('whatsapp')}
              state={sendState.whatsapp}
              sentLabel={`Sent to ${result?.sent ?? 0} students`}
            />
          )}

          {/* Email to students — faculty only */}
          {isFaculty && (
            <ShareBtn
              icon="📧"
              label="Email to students"
              onClick={() => handleSend('email')}
              state={sendState.email}
              sentLabel={`Emailed to ${result?.sent ?? 0} students`}
            />
          )}

          {/* Send both — faculty only */}
          {isFaculty && (
            <>
              <div style={{ height: '1px', background: 'var(--border-subtle)', margin: '6px 0' }} />
              <ShareBtn
                icon="🚀"
                label="Send both (WhatsApp + Email)"
                onClick={() => handleSend('both')}
                state={sendState.whatsapp === 'sent' && sendState.email === 'sent' ? 'sent' : sendState.whatsapp === 'sending' || sendState.email === 'sending' ? 'sending' : 'idle'}
                sentLabel={`Sent to ${result?.sent ?? 0} students`}
              />
            </>
          )}

          {/* Student count */}
          {isFaculty && studentCount > 0 && (
            <p style={{ fontSize: '10px', color: 'var(--text-ghost)', margin: '8px 0 0' }}>
              {studentCount} student{studentCount !== 1 ? 's' : ''} will receive
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function ShareBtn({
  icon, label, onClick, state, sentLabel,
}: {
  icon: string; label: string; onClick: () => void
  state: 'idle' | 'sending' | 'sent' | 'error'
  sentLabel?: string
}) {
  return (
    <button
      onClick={state === 'idle' ? onClick : undefined}
      disabled={state === 'sending'}
      style={{
        display: 'flex', alignItems: 'center', gap: '8px', width: '100%',
        padding: '8px 10px', borderRadius: '8px', marginBottom: '4px',
        background: state === 'sent' ? 'var(--success-bg)' : 'var(--bg-surface)',
        border: `1px solid ${state === 'sent' ? 'var(--success)' : 'var(--border-subtle)'}`,
        color: state === 'sent' ? 'var(--success)' : state === 'error' ? 'var(--error)' : 'var(--text-secondary)',
        fontSize: '12px', fontWeight: 500, cursor: state === 'sending' ? 'not-allowed' : 'pointer',
        textAlign: 'left',
      }}
    >
      <span>{state === 'sent' ? '✓' : state === 'sending' ? '⏳' : state === 'error' ? '✗' : icon}</span>
      <span>{state === 'sent' ? (sentLabel ?? 'Sent') : state === 'sending' ? 'Sending...' : state === 'error' ? 'Failed — try again' : label}</span>
    </button>
  )
}

function ToolBtn({ label, title, onClick, bold }: {
  label: string; title: string; onClick: () => void; bold?: boolean
}) {
  return (
    <button onClick={onClick} title={title} style={{
      width: '28px', height: '28px', borderRadius: '6px', border: 'none',
      background: 'var(--bg-elevated)', cursor: 'pointer',
      fontSize: '12px', fontWeight: bold ? 800 : 600,
      color: 'var(--text-secondary)', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
    }}>{label}</button>
  )
}
