'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

const S = {
  page: { maxWidth: 600, padding: '40px 0' } as React.CSSProperties,
  h1: { fontSize: 22, fontWeight: 600, color: '#fff', marginBottom: 4 } as React.CSSProperties,
  subtitle: { fontSize: 13, color: '#4a6a9a', marginBottom: 40 } as React.CSSProperties,
  section: { marginBottom: 36 } as React.CSSProperties,
  h2: { fontSize: 15, fontWeight: 600, color: '#8ba3c7', marginBottom: 8 } as React.CSSProperties,
  description: { fontSize: 13, color: '#4a6a9a', lineHeight: 1.65, marginBottom: 14 } as React.CSSProperties,
  btn: {
    background: '#0d1f3c',
    border: '1px solid #1e3a6e',
    color: '#4f8ef7',
    borderRadius: 8,
    padding: '9px 18px',
    fontSize: 13,
    fontWeight: 500,
    cursor: 'pointer',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
  } as React.CSSProperties,
  dangerZone: {
    border: '1px solid #3a1515',
    borderRadius: 10,
    padding: '24px',
    background: '#1f0d0d',
  } as React.CSSProperties,
  dangerH2: { fontSize: 15, fontWeight: 600, color: '#e25555', marginBottom: 8 } as React.CSSProperties,
  links: {
    marginTop: 48,
    display: 'flex',
    gap: 20,
    flexWrap: 'wrap' as const,
    borderTop: '1px solid #1e2d4a',
    paddingTop: 20,
  },
  link: { fontSize: 12, color: '#4a6a9a', textDecoration: 'none' } as React.CSSProperties,
}

export default function PrivacyPage() {
  return (
    <div style={S.page}>
      <h1 style={S.h1}>Daten &amp; Privatsphäre</h1>
      <p style={S.subtitle}>
        Verwalte deine Daten und kontrolliere dein Konto gemäß DSGVO.
      </p>

      {/* Data export */}
      <section style={S.section}>
        <h2 style={S.h2}>Daten exportieren</h2>
        <p style={S.description}>
          Lade alle deine Reisedaten, Journaleinträge und Profileinformationen als JSON-Datei
          herunter (DSGVO Art. 20 — Datenübertragbarkeit).
        </p>
        <a href="/api/user/export" download style={S.btn}>
          Alle Daten herunterladen
        </a>
      </section>

      <div style={{ height: 1, background: '#1e2d4a', marginBottom: 36 }} />

      {/* Legal links */}
      <section style={S.section}>
        <h2 style={S.h2}>Rechtliche Dokumente</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[
            { href: '/datenschutz', label: 'Datenschutzerklärung' },
            { href: '/impressum', label: 'Impressum' },
            { href: '/nutzungsbedingungen', label: 'AGB' },
          ].map(({ href, label }) => (
            <Link key={href} href={href} style={{ ...S.btn, width: 'fit-content' }}>
              {label} →
            </Link>
          ))}
        </div>
      </section>

      <div style={{ height: 1, background: '#1e2d4a', marginBottom: 36 }} />

      {/* Danger zone */}
      <section>
        <div style={S.dangerZone}>
          <h2 style={S.dangerH2}>Konto löschen</h2>
          <p style={S.description}>
            Diese Aktion ist unwiderruflich. Alle deine Reisen, Abschnitte, Fotos und
            Einstellungen werden dauerhaft gelöscht. Ein aktives Abonnement wird sofort
            gekündigt. Die vollständige Löschung erfolgt binnen 30 Tagen.
          </p>
          <DeleteAccountButton />
        </div>
      </section>

      <div style={S.links}>
        <a href="/datenschutz" style={S.link}>Datenschutz</a>
        <a href="/impressum" style={S.link}>Impressum</a>
        <a href="/nutzungsbedingungen" style={S.link}>AGB</a>
      </div>
    </div>
  )
}

function DeleteAccountButton() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [confirmation, setConfirmation] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const confirmed = confirmation === 'LÖSCHEN'

  async function handleDelete() {
    if (!confirmed) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/user/delete', { method: 'DELETE' })
      if (!res.ok) throw new Error('Fehler beim Löschen')
      router.push('/')
    } catch {
      setError('Konto konnte nicht gelöscht werden. Bitte versuche es erneut oder kontaktiere legal@railtrax.eu.')
      setLoading(false)
    }
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        style={{
          background: '#1f0d0d',
          border: '1px solid #3a1515',
          color: '#e25555',
          borderRadius: 8,
          padding: '9px 18px',
          fontSize: 13,
          fontWeight: 500,
          cursor: 'pointer',
        }}
      >
        Konto unwiderruflich löschen
      </button>

      {open && (
        <div
          onClick={() => { if (!loading) setOpen(false) }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 200,
            background: 'rgba(0,0,0,0.65)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#0a1628',
              border: '1px solid #3a1515',
              borderRadius: 12,
              padding: 28,
              width: '100%',
              maxWidth: 400,
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#e25555', marginBottom: 12 }}>
              Konto wirklich löschen?
            </h3>
            <p style={{ fontSize: 13, color: '#8ba3c7', lineHeight: 1.65, marginBottom: 20 }}>
              Diese Aktion kann nicht rückgängig gemacht werden. Gib{' '}
              <strong style={{ color: '#fff' }}>LÖSCHEN</strong> ein, um fortzufahren.
            </p>
            <input
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder="LÖSCHEN"
              autoFocus
              style={{
                width: '100%',
                background: '#080d1a',
                border: `1px solid ${confirmed ? '#e25555' : '#1e2d4a'}`,
                borderRadius: 7,
                padding: '9px 12px',
                color: '#fff',
                fontSize: 13,
                outline: 'none',
                boxSizing: 'border-box',
                marginBottom: 16,
              }}
            />
            {error && (
              <p style={{ fontSize: 12, color: '#e25555', marginBottom: 12 }}>{error}</p>
            )}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button
                onClick={() => setOpen(false)}
                disabled={loading}
                style={{
                  background: 'none',
                  border: '1px solid #1e2d4a',
                  color: '#4a6a9a',
                  borderRadius: 7,
                  padding: '8px 16px',
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                Abbrechen
              </button>
              <button
                onClick={handleDelete}
                disabled={!confirmed || loading}
                style={{
                  background: confirmed ? '#7f1d1d' : '#1f0d0d',
                  border: `1px solid ${confirmed ? '#e25555' : '#3a1515'}`,
                  color: confirmed ? '#fff' : '#4a6a9a',
                  borderRadius: 7,
                  padding: '8px 16px',
                  fontSize: 13,
                  fontWeight: 500,
                  cursor: confirmed && !loading ? 'pointer' : 'not-allowed',
                }}
              >
                {loading ? 'Wird gelöscht…' : 'Konto löschen'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
