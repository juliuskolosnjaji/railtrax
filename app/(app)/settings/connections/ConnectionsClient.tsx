'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Train, ExternalLink, Loader2, Unplug, Plug } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
        throw new Error(json.error === 'invalid_token' ? 'Invalid Träwelling token.' : 'Failed to connect. Please try again.')
      }

      setUsername(json.data.username)
      setToken('')
      router.refresh()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
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
      // Ignored for UI
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Connections</h1>
        <p className="text-zinc-400">Manage connections to external train services.</p>
      </div>

      <div className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex gap-4">
            <div className="w-12 h-12 rounded-lg bg-[#cc1f3a]/10 flex items-center justify-center shrink-0">
              <Train className="h-6 w-6 text-[#cc1f3a]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Träwelling</h2>
              <p className="text-sm text-zinc-400 max-w-md mt-1">
                Link your Träwelling account to automatically check in to trains when a leg starts.
              </p>
            </div>
          </div>
        </div>

        {username ? (
          <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-800/50 border border-zinc-800/80">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
              <span className="text-sm text-zinc-300">
                Connected as <strong className="text-white">@{username}</strong>
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleDisconnect}
              disabled={isLoading}
              className="text-zinc-400 hover:text-red-400 hover:bg-zinc-800 border-zinc-700 h-8 font-normal"
            >
              {isLoading ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <Unplug className="h-3.5 w-3.5 mr-2" />}
              Disconnect
            </Button>
          </div>
        ) : (
          <form onSubmit={handleConnect} className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="token" className="text-zinc-300">Personal Access Token</Label>
                <a
                  href="https://traewelling.de/profile/token"
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors"
                >
                  Get token at traewelling.de <ExternalLink className="h-3 w-3" />
                </a>
              </div>
              <Input
                id="token"
                type="password"
                placeholder="Paste your Träwelling token here..."
                value={token}
                onChange={(e) => setToken(e.target.value)}
                className="bg-zinc-950 border-zinc-800 text-white placeholder:text-zinc-600"
                disabled={isLoading}
              />
              {error && <p className="text-sm text-red-400 mt-1">{error}</p>}
            </div>

            <Button
              type="submit"
              disabled={isLoading || !token.trim()}
              className="w-full bg-[#cc1f3a] text-white hover:bg-[#a9162c] border-none"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Plug className="h-4 w-4 mr-2" />
              )}
              Connect Träwelling
            </Button>
          </form>
        )}
      </div>
    </div>
  )
}
