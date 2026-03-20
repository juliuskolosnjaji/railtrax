'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Download, FileText, Trash2, Shield, ArrowRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

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
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="text-destructive border-destructive/30 hover:bg-destructive/10 hover:text-destructive h-9 text-xs gap-1.5"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Konto löschen
      </Button>

      {open && (
        <div
          onClick={() => { if (!loading) setOpen(false) }}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-surface border border-destructive/30 rounded-xl p-6 w-full max-w-sm"
          >
            <h3 className="text-base font-semibold text-destructive mb-2">
              Konto wirklich löschen?
            </h3>
              <p className="text-sm text-foreground leading-relaxed mb-5">
                Diese Aktion kann nicht rückgängig gemacht werden. Gib{' '}
                <strong className="text-foreground">LÖSCHEN</strong> ein, um fortzufahren.
              </p>
            <Input
              value={confirmation}
              onChange={(e) => setConfirmation(e.target.value)}
              placeholder="LÖSCHEN"
              autoFocus
              className={`mb-4 bg-background border-border text-foreground placeholder:text-muted-foreground ${confirmed ? 'border-destructive' : ''}`}
            />
            {error && (
              <p className="text-xs text-destructive mb-3">{error}</p>
            )}
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={loading}
                className="h-9 text-xs"
              >
                Abbrechen
              </Button>
              <Button
                onClick={handleDelete}
                disabled={!confirmed || loading}
                variant="destructive"
                className="h-9 text-xs"
              >
                {loading ? 'Wird gelöscht…' : 'Konto löschen'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default function PrivacyPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground mb-1">Daten &amp; Privatsphäre</h1>
        <p className="text-sm text-muted-foreground">
          Verwalte deine Daten gemäß DSGVO.
        </p>
      </div>

      {/* Data export */}
      <Card className="border">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
              <Download className="h-5 w-5 text-brand" />
            </div>
            <div>
              <CardTitle className="text-base">Daten exportieren</CardTitle>
              <CardDescription className="mt-0.5 text-xs">
                DSGVO Art. 20 — Alle deine Daten als JSON herunterladen.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <a
            href="/api/user/export"
            download
            className="inline-flex items-center gap-2 text-sm text-brand hover:text-brand/80 transition-colors"
          >
            <Download className="h-4 w-4" />
            Alle Daten herunterladen
          </a>
        </CardContent>
      </Card>

      {/* Legal documents */}
      <Card className="border">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-surface flex items-center justify-center shrink-0 border border-border">
              <FileText className="h-5 w-5 text-secondary" />
            </div>
            <div>
              <CardTitle className="text-base">Rechtliche Dokumente</CardTitle>
              <CardDescription className="mt-0.5 text-xs">
                Unsere AGB, Datenschutzerklärung und Impressum.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-1">
          {[
            { href: '/datenschutz', label: 'Datenschutzerklärung' },
            { href: '/impressum', label: 'Impressum' },
            { href: '/nutzungsbedingungen', label: 'AGB' },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center justify-between py-2.5 px-1 border-b border-border last:border-0 text-sm text-foreground hover:text-muted-foreground transition-colors"
            >
              {label}
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Link>
          ))}
        </CardContent>
      </Card>

      {/* Danger zone */}
      <Card className="border border-destructive/20">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0">
              <Shield className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <CardTitle className="text-base text-destructive">Konto löschen</CardTitle>
              <CardDescription className="mt-0.5 text-xs text-muted-foreground">
                Diese Aktion ist unwiderruflich.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground leading-relaxed mb-4">
            Alle Reisen, Abschnitte, Fotos und Einstellungen werden dauerhaft gelöscht.
            Die vollständige Löschung erfolgt binnen 30 Tagen.
          </p>
          <DeleteAccountButton />
        </CardContent>
      </Card>
    </div>
  )
}
