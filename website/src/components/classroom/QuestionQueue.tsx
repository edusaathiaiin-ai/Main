'use client'

import { useState, useCallback, useEffect } from 'react'
import { useBroadcastEvent, useEventListener } from './liveblocks.config'

type Question = {
  id: string
  studentName: string
  text: string
  timestamp: string
  status: 'sent' | 'seen' | 'addressed' | 'homework'
}

export type HomeworkItem = {
  id: string
  text: string
  studentName: string
  dueDate: string | null
}

/* ─── Student Ask Panel ──────────────────────────────────────────────────── */

export function StudentAskPanel({ studentName }: { studentName: string }) {
  const [text, setText] = useState('')
  const [myQuestions, setMyQuestions] = useState<Question[]>([])
  const broadcast = useBroadcastEvent()

  useEventListener(({ event }: { event: { type: string; id?: string } }) => {
    if (event.type === 'question_seen' && event.id) {
      setMyQuestions(prev => prev.map(q => q.id === event.id ? { ...q, status: 'seen' } : q))
    }
    if (event.type === 'question_addressed' && event.id) {
      setMyQuestions(prev => prev.map(q => q.id === event.id ? { ...q, status: 'addressed' } : q))
    }
  })

  const handleSubmit = useCallback(() => {
    if (!text.trim()) return
    const q: Question = {
      id: crypto.randomUUID(),
      studentName,
      text: text.trim(),
      timestamp: new Date().toISOString(),
      status: 'sent',
    }
    setMyQuestions(prev => [...prev, q])
    broadcast({ type: 'question', id: q.id, studentName: q.studentName, text: q.text, timestamp: q.timestamp })
    setText('')
  }, [text, studentName, broadcast])

  return (
    <div style={{
      borderTop: '1px solid var(--border-subtle)',
      background: 'var(--bg-surface)',
      padding: '10px 12px',
    }}>
      <div style={{ display: 'flex', gap: '6px' }}>
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          placeholder="Ask the faculty a question..."
          style={{
            flex: 1, padding: '8px 12px', borderRadius: '8px', fontSize: '12px',
            background: 'var(--bg-elevated)', color: 'var(--text-primary)',
            border: '1px solid var(--border-subtle)', outline: 'none',
          }}
        />
        <button onClick={handleSubmit} disabled={!text.trim()} style={{
          padding: '8px 14px', borderRadius: '8px', fontSize: '11px', fontWeight: 700,
          background: 'var(--saathi-primary)', color: '#fff', border: 'none',
          cursor: text.trim() ? 'pointer' : 'not-allowed', opacity: text.trim() ? 1 : 0.4,
        }}>Ask</button>
      </div>

      {myQuestions.length > 0 && (
        <div style={{ marginTop: '8px', maxHeight: '120px', overflowY: 'auto' }}>
          {myQuestions.map(q => (
            <div key={q.id} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '4px 0', fontSize: '11px',
            }}>
              <span style={{ color: 'var(--text-tertiary)', flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {q.text}
              </span>
              <span style={{
                fontSize: '10px', fontWeight: 600, marginLeft: '8px', flexShrink: 0,
                color: q.status === 'addressed' ? 'var(--success)' : q.status === 'seen' ? 'var(--saathi-primary)' : 'var(--text-ghost)',
              }}>
                {q.status === 'sent' ? 'Sent' : q.status === 'seen' ? 'Seen' : 'Addressed'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Faculty Question Queue Panel ───────────────────────────────────────── */

export function FacultyQuestionQueue({
  open,
  onClose,
  onHomeworkAdd,
  accentColor,
}: {
  open: boolean
  onClose: () => void
  onHomeworkAdd: (item: HomeworkItem) => void
  accentColor: string
}) {
  const [questions, setQuestions] = useState<Question[]>([])
  const broadcast = useBroadcastEvent()

  useEventListener(({ event }: { event: { type: string; id?: string; studentName?: string; text?: string; timestamp?: string } }) => {
    if (event.type === 'question' && event.id && event.studentName && event.text && event.timestamp) {
      const { id, studentName, text, timestamp } = event as { id: string; studentName: string; text: string; timestamp: string }
      setQuestions(prev => [...prev, { id, studentName, text, timestamp, status: 'sent' as const }])
      broadcast({ type: 'question_seen', id })
    }
  })

  // Mark all unseen as seen when panel opens
  useEffect(() => {
    if (!open) return
    setQuestions(prev => prev.map(q => {
      if (q.status === 'sent') {
        broadcast({ type: 'question_seen', id: q.id })
        return { ...q, status: 'seen' as const }
      }
      return q
    }))
  }, [open, broadcast])

  const handleAddress = useCallback((id: string) => {
    setQuestions(prev => prev.map(q => q.id === id ? { ...q, status: 'addressed' as const } : q))
    broadcast({ type: 'question_addressed', id })
  }, [broadcast])

  const handleHomework = useCallback((q: Question) => {
    setQuestions(prev => prev.map(x => x.id === q.id ? { ...x, status: 'homework' as const } : x))
    broadcast({ type: 'question_addressed', id: q.id })
    onHomeworkAdd({ id: q.id, text: q.text, studentName: q.studentName, dueDate: null })
  }, [broadcast, onHomeworkAdd])

  const pending = questions.filter(q => q.status === 'sent' || q.status === 'seen')
  const done = questions.filter(q => q.status === 'addressed' || q.status === 'homework')

  return (
    <div style={{
      position: 'absolute', top: 0, right: 0, bottom: 0,
      width: open ? '300px' : '0px', overflow: 'hidden',
      background: 'var(--bg-surface)',
      borderLeft: open ? '1px solid var(--border-subtle)' : 'none',
      transition: 'width 200ms ease', zIndex: 31,
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '10px 12px', borderBottom: '1px solid var(--border-subtle)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text-primary)' }}>Questions</span>
          {pending.length > 0 && (
            <span style={{
              background: accentColor, color: '#fff', fontSize: '10px', fontWeight: 700,
              borderRadius: '10px', padding: '1px 6px', minWidth: '18px', textAlign: 'center',
            }}>{pending.length}</span>
          )}
        </div>
        <button onClick={onClose} style={{
          background: 'none', border: 'none', cursor: 'pointer',
          fontSize: '16px', color: 'var(--text-ghost)', lineHeight: 1,
        }}>×</button>
      </div>

      {/* Question list */}
      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {pending.length === 0 && done.length === 0 && (
          <div style={{ padding: '40px 16px', textAlign: 'center' }}>
            <p style={{ fontSize: '24px', marginBottom: '8px' }}>🙋</p>
            <p style={{ fontSize: '12px', color: 'var(--text-ghost)' }}>
              Student questions appear here in real-time
            </p>
          </div>
        )}

        {pending.length > 0 && (
          <div style={{ padding: '8px 12px' }}>
            <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-ghost)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>
              Pending
            </p>
            {pending.map(q => (
              <div key={q.id} style={{
                padding: '10px 12px', borderRadius: '10px', marginBottom: '6px',
                background: 'var(--bg-elevated)', border: '1px solid var(--border-subtle)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: accentColor }}>{q.studentName}</span>
                  <span style={{ fontSize: '10px', color: 'var(--text-ghost)' }}>
                    {new Date(q.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p style={{ fontSize: '12px', color: 'var(--text-primary)', margin: '0 0 8px', lineHeight: 1.5 }}>{q.text}</p>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => handleAddress(q.id)} style={{
                    padding: '3px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 600,
                    background: 'var(--success-bg)', color: 'var(--success)', border: 'none', cursor: 'pointer',
                  }}>Addressed</button>
                  <button onClick={() => handleHomework(q)} style={{
                    padding: '3px 10px', borderRadius: '6px', fontSize: '10px', fontWeight: 600,
                    background: `${accentColor}12`, color: accentColor, border: 'none', cursor: 'pointer',
                  }}>Homework</button>
                </div>
              </div>
            ))}
          </div>
        )}

        {done.length > 0 && (
          <div style={{ padding: '8px 12px' }}>
            <p style={{ fontSize: '10px', fontWeight: 700, color: 'var(--text-ghost)', textTransform: 'uppercase', letterSpacing: '0.05em', margin: '0 0 6px' }}>
              Done
            </p>
            {done.map(q => (
              <div key={q.id} style={{
                padding: '8px 12px', borderRadius: '8px', marginBottom: '4px',
                background: 'var(--bg-elevated)', opacity: 0.6,
              }}>
                <span style={{ fontSize: '11px', color: 'var(--text-tertiary)' }}>{q.text}</span>
                <span style={{
                  fontSize: '10px', fontWeight: 600, marginLeft: '6px',
                  color: q.status === 'homework' ? accentColor : 'var(--success)',
                }}>
                  {q.status === 'homework' ? '📝 HW' : '✓'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
