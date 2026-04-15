'use client'
import { useState } from 'react'
import {
  EXAM_REGISTRY,
  getExamsForSaathi,
  type ExamEntry,
} from '@/constants/exams'

// Shared value shape — parent owns state, picker is dumb UI.
export type ExamPickerValue = {
  examId:   string | null   // null = "Other" (free text) or not selected
  examName: string          // canonical name OR free text OR ''
}

type Props = {
  saathiSlug?:   string                  // filter chips to relevant exams when provided
  value:         ExamPickerValue
  onChange:      (v: ExamPickerValue) => void
  primaryColor?: string
  disabled?:     boolean
  // Defaults to light surface (#FFFFFF-ish) — dark themes pass { dark: true }.
  theme?:        'light' | 'dark'
}

export function ExamPicker({
  saathiSlug,
  value,
  onChange,
  primaryColor = '#C9993A',
  disabled = false,
  theme = 'light',
}: Props) {
  const dark = theme === 'dark'

  const filteredExams: ReadonlyArray<ExamEntry> = saathiSlug
    ? getExamsForSaathi(saathiSlug)
    : EXAM_REGISTRY

  const [showAll, setShowAll] = useState<boolean>(
    !saathiSlug || filteredExams.length === 0,
  )
  const [otherOpen, setOtherOpen] = useState<boolean>(
    value.examId === null && value.examName.trim().length > 0,
  )

  const exams = showAll ? EXAM_REGISTRY : filteredExams
  const isOtherActive = otherOpen && value.examId === null

  const chipStyle = (active: boolean): React.CSSProperties => ({
    padding: '8px 16px',
    borderRadius: 999,
    fontSize: 13,
    fontWeight: active ? 600 : 400,
    background: active
      ? `${primaryColor}${dark ? '33' : '1f'}`
      : dark
        ? 'rgba(255,255,255,0.04)'
        : 'rgba(0,0,0,0.04)',
    color: active
      ? primaryColor
      : dark
        ? 'rgba(255,255,255,0.7)'
        : 'var(--text-secondary)',
    border: `1px solid ${
      active
        ? `${primaryColor}80`
        : dark
          ? 'rgba(255,255,255,0.1)'
          : 'rgba(0,0,0,0.08)'
    }`,
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.5 : 1,
    transition: 'all 0.15s',
  })

  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {exams.map((exam) => {
          const active = value.examId === exam.id
          return (
            <button
              key={exam.id}
              type="button"
              disabled={disabled}
              onClick={() => {
                setOtherOpen(false)
                onChange({ examId: exam.id, examName: exam.name })
              }}
              style={chipStyle(active)}
            >
              {exam.name}
            </button>
          )
        })}

        <button
          type="button"
          disabled={disabled}
          onClick={() => {
            setOtherOpen(true)
            // Preserve any previously typed free text; otherwise clear.
            onChange({ examId: null, examName: value.examId === null ? value.examName : '' })
          }}
          style={chipStyle(isOtherActive)}
        >
          + Other
        </button>
      </div>

      {otherOpen && (
        <input
          type="text"
          disabled={disabled}
          value={value.examId === null ? value.examName : ''}
          onChange={(e) =>
            onChange({ examId: null, examName: e.target.value })
          }
          placeholder="What exam are you preparing for?"
          maxLength={60}
          style={{
            marginTop: 10,
            width: '100%',
            padding: '10px 12px',
            borderRadius: 10,
            fontSize: 14,
            background: dark ? 'rgba(255,255,255,0.04)' : '#FFFFFF',
            color: dark ? 'rgba(255,255,255,0.9)' : 'var(--text-primary)',
            border: `1px solid ${dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)'}`,
            outline: 'none',
          }}
        />
      )}

      {saathiSlug && !showAll && (
        <button
          type="button"
          onClick={() => setShowAll(true)}
          style={{
            marginTop: 10,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 12,
            color: dark ? 'rgba(255,255,255,0.4)' : 'var(--text-tertiary)',
            padding: 0,
          }}
        >
          Don&apos;t see your exam? See all →
        </button>
      )}
    </div>
  )
}
