'use client'

import { useState } from 'react'
import { Check, Share2 } from 'lucide-react'

export function ShareButton({ trainNumber }: { trainNumber: string }) {
  const [copied, setCopied] = useState(false)

  const handleShare = async () => {
    await navigator.clipboard.writeText(window.location.href)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <button
      onClick={handleShare}
      aria-label={`${trainNumber} teilen`}
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
        background: 'none',
        border: '0.5px solid #1a2030',
        color: copied ? '#2dd4b0' : '#4a5568',
        borderColor: copied ? 'rgba(45,212,176,.3)' : '#1a2030',
        transition: 'all .15s',
      }}
    >
      {copied ? <Check size={10} /> : <Share2 size={10} />}
      {copied ? 'Kopiert!' : 'Teilen'}
    </button>
  )
}
