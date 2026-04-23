// ─────────────────────────────────────────────────────────────────────────────
// SubjectBoundaryWarning — renders the soft informational banner returned by
// checkSubjectBoundary() in lib/subjectBoundary.ts.
//
// Gentle info tone (amber, not red). Faculty autonomy is absolute — this is
// a nudge, never a block. Fixed colors (not var(--…)) because the banner only
// appears in faculty-side forms which are always light theme.
// ─────────────────────────────────────────────────────────────────────────────

type Props = {
  /** Pass the `warning` field from `checkSubjectBoundary()`. Component
   *  renders nothing when the value is null — callers don't have to guard. */
  warning: string | null
}

export default function SubjectBoundaryWarning({ warning }: Props) {
  if (!warning) return null
  return (
    <div
      style={{
        background: '#FFF9F0',
        border: '1px solid #F59E0B',
        borderRadius: '10px',
        padding: '12px 16px',
        marginBottom: '16px',
        fontSize: '13px',
        color: '#92400E',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}
    >
      <span>💡</span>
      <span>{warning}</span>
    </div>
  )
}
