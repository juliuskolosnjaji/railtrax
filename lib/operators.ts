export const OPERATOR_COLORS: Record<string, { bg: string; text: string; line: string }> = {
  db:         { bg: '#2a0808', text: '#E32228', line: '#E32228' },
  öbb:        { bg: '#2a0808', text: '#C8102E', line: '#C8102E' },
  sbb:        { bg: '#2a0808', text: '#EB0000', line: '#EB0000' },
  sncf:       { bg: '#1f0808', text: '#e25555', line: '#e25555' },
  trenitalia: { bg: '#081a10', text: '#3ecf6e', line: '#3ecf6e' },
  ns:         { bg: '#081a10', text: '#00a650', line: '#00a650' },
  regiojet:   { bg: '#1a1200', text: '#f59e0b', line: '#f59e0b' },
  flixtrain:  { bg: '#081a10', text: '#3ecf6e', line: '#3ecf6e' },
  eurostar:   { bg: '#0d1f3c', text: '#60a5fa', line: '#60a5fa' },
}

export function getOperatorColors(operator: string | null | undefined) {
  const key = (operator ?? '').toLowerCase()
  return Object.entries(OPERATOR_COLORS).find(([k]) => key.includes(k))?.[1]
    ?? { bg: '#111e35', text: '#4a6a9a', line: '#6B7280' }
}
