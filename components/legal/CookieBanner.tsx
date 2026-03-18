'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

export function CookieBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const consent = localStorage.getItem('railtrax_consent')
    if (!consent) setVisible(true)
  }, [])

  const accept = () => {
    localStorage.setItem('railtrax_consent', 'essential')
    localStorage.setItem('railtrax_consent_date', new Date().toISOString())
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      role="dialog"
      aria-label="Cookie-Hinweis"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9999,
        background: '#0a1628',
        borderTop: '1px solid #1e3a6e',
        padding: '16px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        flexWrap: 'wrap',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.4)',
      }}
    >
      <p style={{ fontSize: 13, color: '#8ba3c7', margin: 0, maxWidth: 720, lineHeight: 1.65 }}>
        Wir verwenden ausschließlich technisch notwendige Cookies für die Anmeldung und
        Sitzungsverwaltung. Weitere Cookies oder Tracking-Technologien setzen wir nicht ein.{' '}
        <Link href="/datenschutz" style={{ color: '#4f8ef7', textDecoration: 'none' }}>
          Datenschutzerklärung
        </Link>{' '}
        ·{' '}
        <Link href="/impressum" style={{ color: '#4f8ef7', textDecoration: 'none' }}>
          Impressum
        </Link>
      </p>
      <button
        onClick={accept}
        style={{
          background: '#4f8ef7',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          padding: '9px 22px',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}
      >
        Verstanden
      </button>
    </div>
  )
}
