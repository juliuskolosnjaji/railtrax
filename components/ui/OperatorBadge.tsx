import { getOperatorColors } from '@/lib/operators'

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
  const colors = getOperatorColors(operator)

  return (
    <span style={{
      fontSize: small ? 10 : 11,
      fontWeight: 700,
      padding: small ? '2px 6px' : '3px 8px',
      borderRadius: 4,
      background: colors.bg,
      color: colors.text,
      whiteSpace: 'nowrap',
      border: `1px solid ${colors.text}33`,
    }}>
      {lineName ?? operator ?? '?'}
    </span>
  )
}