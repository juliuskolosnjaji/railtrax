const OPERATOR_COLORS: Record<string, { bg: string; color: string }> = {
  'db':         { bg: '#2a0808', color: '#E32228' },
  'öbb':        { bg: '#2a0808', color: '#C8102E' },
  'sbb':        { bg: '#2a0808', color: '#EB0000' },
  'sncf':       { bg: '#1f0808', color: '#e25555' },
  'trenitalia': { bg: '#081a10', color: '#3ecf6e' },
  'ns':         { bg: '#081a10', color: '#00a650' },
  'regiojet':   { bg: '#1a1200', color: '#f59e0b' },
  'flixtrain':  { bg: '#081a10', color: '#3ecf6e' },
  'eurostar':   { bg: '#0d1f3c', color: '#60a5fa' },
}

export interface OperatorBadgeProps {
  operator: string | null | undefined
  lineName: string | null | undefined
  small?: boolean
}

export function OperatorBadge({ 
  operator, 
  lineName, 
  small = false 
}: OperatorBadgeProps) {
  const key = (operator ?? '').toLowerCase()
  const colors = Object.entries(OPERATOR_COLORS).find(([k]) =>
    key.includes(k)
  )?.[1] ?? { bg: '#111e35', color: '#4a6a9a' }

  return (
    <span style={{
      fontSize: small ? 10 : 11,
      fontWeight: 700,
      padding: small ? '2px 6px' : '3px 8px',
      borderRadius: 4,
      background: colors.bg,
      color: colors.color,
      whiteSpace: 'nowrap',
      border: `1px solid ${colors.color}33`,
    }}>
      {lineName ?? operator ?? '?'}
    </span>
  )
}