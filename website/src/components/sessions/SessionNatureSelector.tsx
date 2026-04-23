'use client'

import {
  SESSION_NATURE_LIST,
  SessionNature,
} from '@/constants/sessionNatures'

type Props = {
  value: SessionNature
  onChange: (nature: SessionNature) => void
  /** Optional heading override. Defaults to faculty-voice copy; pass the
   *  student-voice string when the selector renders in the 1:1 request form. */
  label?: string
}

export default function SessionNatureSelector({
  value,
  onChange,
  label = 'What kind of session is this?',
}: Props) {
  return (
    <div style={{ marginBottom: '24px' }}>
      <label className="label">{label}</label>
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '10px',
          marginTop: '8px',
        }}
      >
        {SESSION_NATURE_LIST.map((n) => {
          const selected = value === n.id
          return (
            <button
              key={n.id}
              type="button"
              onClick={() => onChange(n.id)}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: '14px',
                padding: '16px 18px',
                borderRadius: '12px',
                border: selected
                  ? `2px solid ${n.color}`
                  : '2px solid var(--border-subtle)',
                background: selected
                  ? `color-mix(in srgb, ${n.color} 8%, var(--bg-elevated))`
                  : 'var(--bg-elevated)',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{ fontSize: '22px', marginTop: '2px' }}>
                {n.emoji}
              </span>
              <div>
                <div
                  style={{
                    fontSize: '15px',
                    fontWeight: 700,
                    color: selected ? n.color : 'var(--text-primary)',
                    marginBottom: '3px',
                    fontFamily: 'Fraunces, serif',
                  }}
                >
                  {n.label}
                </div>
                <div
                  style={{
                    fontSize: '13px',
                    color: 'var(--text-secondary)',
                    lineHeight: 1.5,
                  }}
                >
                  {n.description}
                </div>
                <div
                  style={{
                    fontSize: '11px',
                    color: 'var(--text-tertiary)',
                    marginTop: '4px',
                    fontStyle: 'italic',
                  }}
                >
                  {n.taNote}
                </div>
              </div>
              {selected && (
                <div
                  style={{
                    marginLeft: 'auto',
                    color: n.color,
                    fontSize: '18px',
                    flexShrink: 0,
                  }}
                >
                  ✓
                </div>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
