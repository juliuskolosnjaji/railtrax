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
      className="fixed bottom-0 left-0 right-0 z-[9999] bg-card border-t border-border px-5 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-[0_-4px_24px_rgba(0,0,0,0.4)] cookie-banner"
    >
      <p className="text-sm text-muted-foreground leading-relaxed max-w-[720px] m-0">
        Wir verwenden ausschließlich technisch notwendige Cookies für die Anmeldung und
        Sitzungsverwaltung. Weitere Cookies oder Tracking-Technologien setzen wir nicht ein.{' '}
        <Link href="/datenschutz" className="text-primary hover:underline">
          Datenschutzerklärung
        </Link>{' '}
        ·{' '}
        <Link href="/impressum" className="text-primary hover:underline">
          Impressum
        </Link>
      </p>
      <button
        onClick={accept}
        className="bg-primary text-primary-foreground hover:bg-primary/90 font-semibold rounded-md px-5 h-10 text-sm cursor-pointer flex-shrink-0 transition-colors"
      >
        Verstanden
      </button>
    </div>
  )
}
