interface PlatformBadgeProps {
  planned?: string | null
  actual?:  string | null
  size?:    'sm' | 'md'
}

export function PlatformBadge({ planned, actual, size = 'sm' }: PlatformBadgeProps) {
  if (!planned && !actual) return null

  const changed = !!(actual && planned && actual !== planned)
  const display = actual ?? planned
  const fs = size === 'sm' ? 10 : 12

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: 3,
      fontSize: fs,
      fontWeight: 500,
      padding: size === 'sm' ? '2px 6px' : '3px 8px',
      borderRadius: 4,
      background: changed ? '#1c1200' : '#0a1628',
      color:      changed ? '#f59e0b' : '#4a6a9a',
      border: `1px solid ${changed ? '#78350f' : '#1e2d4a'}`,
      whiteSpace: 'nowrap',
    }}>
      {/* Track icon */}
      <svg width="9" height="9" viewBox="0 0 9 9" fill="none">
        <rect x="0.5" y="0.5" width="8" height="8" rx="1"
              stroke="currentColor" strokeWidth="0.8"/>
        <line x1="3" y1="0.5" x2="3" y2="8.5"
              stroke="currentColor" strokeWidth="0.7"/>
        <line x1="6" y1="0.5" x2="6" y2="8.5"
              stroke="currentColor" strokeWidth="0.7"/>
      </svg>
      Gl.&nbsp;{display}
      {changed && (
        <span style={{
          textDecoration: 'line-through',
          color: '#6b7280',
          marginLeft: 2,
          fontSize: fs - 1,
        }}>
          {planned}
        </span>
      )}
    </span>
  )
}
