'use client'

import { useState, useEffect } from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

interface NotificationBannerProps {
  userId: string
}

export function NotificationBanner({ userId }: NotificationBannerProps) {
  const router = useRouter()
  const [dismissed, setDismissed] = useState(false)
  const [show, setShow] = useState(false)

  useEffect(() => {
    const dismissedBanner = localStorage.getItem('notification-banner-dismissed')
    if (dismissedBanner) {
      setDismissed(true)
      return
    }

    async function checkLegs() {
      const res = await fetch(`/api/user/legs-count?userId=${userId}`)
      const data = await res.json()
      if (data.plannedLegsCount >= 2) {
        const prefsRes = await fetch('/api/user/preferences')
        const prefs = await prefsRes.json()
        if (!prefs.notificationsEnabled) {
          setShow(true)
        }
      }
    }
    checkLegs()
  }, [userId])

  if (!show || dismissed) return null

  return (
    <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Bell className="h-5 w-5 text-amber-500" />
        <div>
          <p className="text-sm font-medium">Enable notifications for delay alerts</p>
          <p className="text-xs text-zinc-400">
            Get notified when your trains are delayed or cancelled
          </p>
        </div>
      </div>
      <div className="flex gap-2">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => {
            setDismissed(true)
            localStorage.setItem('notification-banner-dismissed', 'true')
          }}
        >
          Dismiss
        </Button>
        <Button 
          size="sm"
          onClick={() => router.push('/settings/notifications')}
        >
          Enable
        </Button>
      </div>
    </div>
  )
}
