'use client'

interface LogoProps {
  size?: 'sm' | 'md' | 'lg'
  showText?: boolean
}

export function Logo({ size = 'md', showText = true }: LogoProps) {
  const dim = size === 'sm' ? 18 : size === 'lg' ? 32 : 24

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: size === 'sm' ? 6 : 10 }}>
      <svg width={dim} height={dim} viewBox="0 0 24 24" fill="none">
        {/* Track lines */}
        <line x1="1" y1="12" x2="23" y2="12"
          stroke="#4f8ef7" strokeWidth="2.5" strokeLinecap="round"/>
        <line x1="1" y1="16" x2="23" y2="16"
          stroke="#1e3a6e" strokeWidth="1" strokeDasharray="3 3"/>
        {/* Station dots */}
        <circle cx="5"  cy="12" r="3" fill="#080d1a" stroke="#4f8ef7" strokeWidth="1.5"/>
        <circle cx="5"  cy="12" r="1.5" fill="#4f8ef7"/>
        <circle cx="12" cy="12" r="2.5" fill="#080d1a" stroke="#4f8ef7" strokeWidth="1.5"/>
        <circle cx="12" cy="12" r="1" fill="#4f8ef7"/>
        <circle cx="19" cy="12" r="3" fill="#080d1a" stroke="#4f8ef7" strokeWidth="1.5"/>
        <circle cx="19" cy="12" r="1.5" fill="#4f8ef7"/>
      </svg>
      {showText && (
        <span style={{
          fontSize: size === 'sm' ? 15 : size === 'lg' ? 24 : 17,
          fontWeight: 500,
          color: '#ffffff',
          letterSpacing: '-0.3px',
        }}>
          Railtrax
        </span>
      )}
    </div>
  )
}
