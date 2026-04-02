'use client'

import { Plus } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function AddToTripButton() {
  const router = useRouter()

  return (
    <button
      onClick={() => router.push('/dashboard')}
      style={{
        height: 28,
        padding: '0 12px',
        borderRadius: 6,
        fontSize: 11,
        fontWeight: 500,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: 5,
        background: 'rgba(45,212,176,.12)',
        border: '0.5px solid rgba(45,212,176,.3)',
        color: '#2dd4b0',
      }}
    >
      <Plus size={10} />
      Zur Reise hinzufügen
    </button>
  )
}
