'use client'

import { useState, useCallback } from 'react'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useUser } from '@/hooks/useUser'
import { UpgradeModal } from '@/components/billing/UpgradeModal'

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
  const { plan, isLoading: userLoading } = useUser()
  const [prefs, setPrefs] = useState<Preferences>(initialPreferences)
  const [isLoading, setIsLoading] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [testSent, setTestSent] = useState(false)

  const canNotify = plan === 'plus' || plan === 'pro'

  const subscribeToPush = useCallback(async () => {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      alert('Push notifications are not supported in your browser')
      return
    }

    try {
      const permission = await navigator.permissions.query({ name: 'notifications' as PermissionName })
      if (permission.state === 'denied') {
        alert('Please enable notifications in your browser settings')
        return
      }

      const granted = await Notification.requestPermission()
      if (granted !== 'granted') {
        alert('Notification permission denied')
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
      alert('Failed to enable notifications')
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
    
    if (key === 'notificationsEnabled' && value && !canNotify) {
      setShowUpgradeModal(true)
      return
    }

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

  if (userLoading) {
    return <div className="p-6" style={{ color: '#4a6a9a' }}>Laden...</div>
  }

  return (
    <div className="settings-page space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Push-Benachrichtigungen</CardTitle>
          <CardDescription>
            Echtzeit-Updates zu deinen Zugfahrten erhalten
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Benachrichtigungen aktivieren</p>
              <p className="text-sm text-muted-foreground">
                Push-Benachrichtigungen im Browser erhalten
              </p>
            </div>
            {prefs.notificationsEnabled ? (
              <Button variant="outline" onClick={unsubscribeFromPush}>
                Deaktivieren
              </Button>
            ) : (
              <Button onClick={subscribeToPush}>Aktivieren</Button>
            )}
          </div>

          <div className="space-y-4">
            <p className="font-medium">Benachrichtigungstypen</p>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm">Verspätungen</p>
                  <p className="text-xs text-muted-foreground">
                    Benachrichtigung wenn dein Zug verspätet ist
                  </p>
                </div>
                <Switch
                  checked={prefs.delayAlerts}
                  onCheckedChange={(v) => handleToggle('delayAlerts', v)}
                  disabled={!prefs.notificationsEnabled || isLoading}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm">Gleisänderungen</p>
                  <p className="text-xs text-muted-foreground">
                    Benachrichtigung bei Änderungen des Abfahrtsgleises
                  </p>
                </div>
                <Switch
                  checked={prefs.platformChanges}
                  onCheckedChange={(v) => handleToggle('platformChanges', v)}
                  disabled={!prefs.notificationsEnabled || isLoading}
                />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm">Zugausfälle</p>
                  <p className="text-xs text-muted-foreground">
                    Benachrichtigung wenn dein Zug ausfällt
                  </p>
                </div>
                <Switch
                  checked={prefs.cancellations}
                  onCheckedChange={(v) => handleToggle('cancellations', v)}
                  disabled={!prefs.notificationsEnabled || isLoading}
                />
              </div>
            </div>
          </div>

          {prefs.notificationsEnabled && (
            <div className="pt-4 border-t">
              <Button
                variant="outline"
                onClick={handleTestNotification}
                disabled={isLoading}
              >
                {testSent ? 'Testbenachrichtigung gesendet!' : 'Testbenachrichtigung senden'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {showUpgradeModal && (
        <UpgradeModal 
          open={showUpgradeModal} 
          onOpenChange={setShowUpgradeModal} 
          feature="notifications"
        />
      )}
    </div>
  )
}
