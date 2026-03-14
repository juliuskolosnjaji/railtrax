'use client'

export function BackButton({ label = '← Zurück' }: { label?: string }) {
  return (
    <button
      onClick={() => window.history.back()}
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        color: '#4a6a9a', fontSize: 14, marginBottom: 24,
        background: 'none', border: 'none', cursor: 'pointer',
        padding: 0,
      }}
    >
      {label}
    </button>
  )
}
