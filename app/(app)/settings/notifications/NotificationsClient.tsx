'use client'

import { useState, useCallback } from 'react'
import { Bell, TestTube2 } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'

interface Preferences {
  notificationsEnabled: boolean
  delayAlerts: boolean
  platformChanges: boolean
  cancellations: boolean
}

export function NotificationsClient({
  initialPreferences,
}: {
  initialPreferences: Preferences
}) {
  const [prefs, setPrefs] = useState<Preferences>(initialPreferences)
  const [isLoading, setIsLoading] = useState(false)
  const [testSent, setTestSent] = useState(false)

  const subscribeToPush = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Push-Benachrichtigungen werden von deinem Browser nicht unterstützt.')
      return
    }

    try {
      const permission = await navigator.permissions.query({ name: 'notifications' as PermissionName })
      if (permission.state === 'denied') {
        alert('Bitte aktiviere Benachrichtigungen in den Browser-Einstellungen.')
        return
      }

      const granted = await Notification.requestPermission()
      if (granted !== 'granted') {
        alert('Berechtigung für Benachrichtigungen verweigert.')
        return
      }

      const registration = await navigator.serviceWorker.ready
      const vapidPublicKey = await fetch('/api/push/vapid-key').then((r) => r.text())

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: Uint8Array.from(atob(vapidPublicKey), (c) => c.charCodeAt(0)),
      })

      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription),
      })

      setPrefs((p) => ({ ...p, notificationsEnabled: true }))
      await savePreferences({ ...prefs, notificationsEnabled: true })
    } catch (err) {
      console.error('Failed to subscribe:', err)
      alert('Benachrichtigungen konnten nicht aktiviert werden.')
    }
  }, [prefs])

  const unsubscribeFromPush = useCallback(async () => {
    try {
      const registration = await navigator.serviceWorker.ready
      const subscription = await registration.pushManager.getSubscription()
      if (subscription) {
        await fetch('/api/push/unsubscribe', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint }),
        })
        await subscription.unsubscribe()
      }
      setPrefs((p) => ({ ...p, notificationsEnabled: false }))
      await savePreferences({ ...prefs, notificationsEnabled: false })
    } catch (err) {
      console.error('Failed to unsubscribe:', err)
    }
  }, [prefs])

  const savePreferences = async (newPrefs: Preferences) => {
    setIsLoading(true)
    try {
      await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newPrefs),
      })
    } finally {
      setIsLoading(false)
    }
  }

  const handleToggle = async (key: keyof Preferences, value: boolean) => {
    if (key !== 'notificationsEnabled' && !prefs.notificationsEnabled) return

    const newPrefs = { ...prefs, [key]: value }
    setPrefs(newPrefs)
    await savePreferences(newPrefs)
  }

  const handleTestNotification = async () => {
    setIsLoading(true)
    try {
      await fetch('/api/push/test', { method: 'POST' })
      setTestSent(true)
      setTimeout(() => setTestSent(false), 3000)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground mb-1">Benachrichtigungen</h1>
        <p className="text-sm text-muted-foreground">Echtzeit-Updates zu deinen Zugfahrten.</p>
      </div>

      {/* Push notifications master toggle */}
      <Card className="border">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center shrink-0">
              <Bell className="h-5 w-5 text-brand" />
            </div>
            <div className="flex-1">
              <CardTitle className="text-base">Push-Benachrichtigungen</CardTitle>
              <CardDescription className="mt-0.5 text-xs">
                Echtzeit-Updates direkt im Browser erhalten.
              </CardDescription>
            </div>
            {prefs.notificationsEnabled ? (
              <Button variant="outline" size="sm" onClick={unsubscribeFromPush} className="h-8 text-xs shrink-0">
                Deaktivieren
              </Button>
            ) : (
              <Button size="sm" onClick={subscribeToPush} className="h-8 text-xs shrink-0">
                Aktivieren
              </Button>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* Notification types */}
      <Card className="border">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
            Benachrichtigungstypen
          </CardTitle>
          <CardDescription className="text-xs">
            Wähle aus, welche Ereignisse du benachrichtigt bekommst.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-1">
          {[
            { key: 'delayAlerts' as const, label: 'Verspätungen', desc: 'Benachrichtigung wenn dein Zug verspätet ist.' },
            { key: 'platformChanges' as const, label: 'Gleisänderungen', desc: 'Bei Änderungen des Abfahrtsgleises.' },
            { key: 'cancellations' as const, label: 'Zugausfälle', desc: 'Wenn dein Zug ausfällt.' },
          ].map(({ key, label, desc }) => (
            <div
              key={key}
              className="flex items-center justify-between py-3 px-1 border-b border-border last:border-0"
            >
              <div>
                <p className="text-sm text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{desc}</p>
              </div>
              <Switch
                checked={prefs[key]}
                onCheckedChange={(v) => handleToggle(key, v)}
                disabled={!prefs.notificationsEnabled || isLoading}
              />
            </div>
          ))}

          {prefs.notificationsEnabled && (
            <div className="pt-4">
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestNotification}
                disabled={isLoading}
                className="gap-1.5 text-xs h-8"
              >
                <TestTube2 className="h-3 w-3" />
                {testSent ? 'Testbenachrichtigung gesendet!' : 'Testbenachrichtigung senden'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
