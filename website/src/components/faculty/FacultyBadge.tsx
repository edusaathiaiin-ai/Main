import type { BadgeType } from '@/lib/faculty-badge'

const BADGE_CONFIG: Record<
  BadgeType,
  {
    label: string
    color: string
    bg: string
    border: string
    icon: string
  }
> = {
  faculty_verified: {
    label: 'Faculty Verified',
    color: '#4ADE80',
    bg: 'rgba(74,222,128,0.12)',
    border: 'rgba(74,222,128,0.3)',
    icon: '✓',
  },
  emeritus: {
    label: 'Emeritus',
    color: '#C9993A',
    bg: 'rgba(201,153,58,0.15)',
    border: 'rgba(201,153,58,0.4)',
    icon: '✦',
  },
  expert_verified: {
    label: 'Expert Verified',
    color: '#2DD4BF',
    bg: 'rgba(45,212,191,0.12)',
    border: 'rgba(45,212,191,0.3)',
    icon: '✓',
  },
  pending: {
    label: 'Pending Verification',
    color: 'var(--text-ghost)',
    bg: 'var(--bg-elevated)',
    border: 'var(--border-medium)',
    icon: '⏳',
  },
}

type Props = {
  type: BadgeType
  size?: 'sm' | 'md' | 'lg'
}

export function FacultyBadge({ type, size = 'md' }: Props) {
  const config = BADGE_CONFIG[type]
  const fontSize = size === 'sm' ? '9px' : size === 'lg' ? '12px' : '10px'
  const padding =
    size === 'sm' ? '2px 6px' : size === 'lg' ? '5px 14px' : '3px 9px'

  return (
    <span
      style={{
        fontSize,
        fontWeight: '700',
        padding,
        borderRadius: '20px',
        background: config.bg,
        color: config.color,
        border: `0.5px solid ${config.border}`,
        display: 'inline-flex',
        alignItems: 'center',
        gap: '4px',
        whiteSpace: 'nowrap',
      }}
    >
      <span>{config.icon}</span>
      {config.label}
    </span>
  )
}
