'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Train, ExternalLink, Loader2, Unplug, Plug } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { useTraewellingAutoCheckinPreference } from '@/hooks/useTraewelling'

export function ConnectionsClient({
  initialTraewellingUsername,
}: {
  initialTraewellingUsername: string | null
}) {
  const router = useRouter()
  const [username, setUsername] = useState<string | null>(initialTraewellingUsername)
  const [token, setToken] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const { query: autoCheckinQuery, mutation: autoCheckinMutation } = useTraewellingAutoCheckinPreference()

  async function handleConnect(e: React.FormEvent) {
    e.preventDefault()
    if (!token.trim()) return

    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/settings/traewelling/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim() }),
      })

      const json = await res.json()

      if (!res.ok) {
        throw new Error(json.error === 'invalid_token' ? 'Ungültiger Träwelling Token.' : 'Verbindung fehlgeschlagen. Bitte erneut versuchen.')
      }

      setUsername(json.data.username)
      setToken('')
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unbekannter Fehler'
      setError(message)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleDisconnect() {
    setIsLoading(true)
    try {
      await fetch('/api/settings/traewelling/disconnect', { method: 'POST' })
      setUsername(null)
      router.refresh()
    } catch {
      // Ignored
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground mb-1">Verbindungen</h1>
        <p className="text-sm text-muted-foreground">Externe Zug-Dienste mit Railtrax verknüpfen.</p>
      </div>

      {/* Träwelling integration */}
      <Card className="border">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#cc1f3a]/10 flex items-center justify-center shrink-0">
              <Train className="h-5 w-5 text-[#cc1f3a]" />
            </div>
            <div>
              <CardTitle className="text-base">Träwelling</CardTitle>
              <CardDescription className="mt-0.5 text-xs">
                Automatisch einchecken wenn ein Abschnitt beginnt.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {username ? (
            <div className="flex items-center justify-between p-3 rounded-lg bg-surface border border-border">
              <div className="flex items-center gap-2.5">
                <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.5)]" />
                <span className="text-sm text-foreground">
                  Verbunden als <strong className="text-foreground">@{username}</strong>
                </span>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDisconnect}
                disabled={isLoading}
                className="text-muted-foreground hover:text-destructive hover:border-destructive/50 h-8 text-xs gap-1.5"
              >
                {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Unplug className="h-3 w-3" />}
                Trennen
              </Button>
            </div>
          ) : (
            <form onSubmit={handleConnect} className="space-y-3">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="token" className="text-xs text-foreground">Persönlicher Zugriffstoken</Label>
                  <a
                    href="https://traewelling.de/profile/token"
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-brand hover:text-brand/80 flex items-center gap-1 transition-colors"
                  >
                    Token holen <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                <Input
                  id="token"
                  type="password"
                  placeholder="Träwelling-Token einfügen..."
                  value={token}
                  onChange={(e) => setToken(e.target.value)}
                  className="bg-background border-border text-foreground placeholder:text-muted-foreground"
                  disabled={isLoading}
                />
                {error && <p className="text-xs text-destructive mt-1">{error}</p>}
              </div>
              <Button
                type="submit"
                disabled={isLoading || !token.trim()}
                className="w-full bg-[#cc1f3a] hover:bg-[#a9162c] text-white"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Plug className="h-4 w-4 mr-2" />
                )}
                Träwelling verbinden
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
