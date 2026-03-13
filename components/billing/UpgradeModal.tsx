'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

const FEATURE_COPY: Record<
  string,
  { title: string; body: string; requiredPlan: 'plus' | 'pro' }
> = {
  journal: {
    title: 'Travel Journal',
    body: 'Document your journeys with photos, notes, and mood.',
    requiredPlan: 'plus',
  },
  ticketWallet: {
    title: 'Ticket Wallet',
    body: 'Store all your tickets with QR codes in one place.',
    requiredPlan: 'plus',
  },
  fullStats: {
    title: 'Full Statistics',
    body: 'See your heatmap, CO₂ saved, country map, and more.',
    requiredPlan: 'plus',
  },
  notifications: {
    title: 'Live Notifications',
    body: 'Get real-time delay alerts and platform change warnings.',
    requiredPlan: 'plus',
  },
  interrailTracker: {
    title: 'Interrail Tracker',
    body: 'Manage your pass, track travel days, and monitor validity.',
    requiredPlan: 'plus',
  },
  poiAlongRoute: {
    title: 'Points of Interest',
    body: 'See what\'s visible from your window along every route.',
    requiredPlan: 'plus',
  },
  collaborativeTrips: {
    title: 'Collaborative Trips',
    body: 'Plan trips together with friends in real time.',
    requiredPlan: 'pro',
  },
  apiAccess: {
    title: 'API Access',
    body: 'Build your own apps on top of RailPlanner.',
    requiredPlan: 'pro',
  },
}

interface UpgradeModalProps {
  feature: keyof typeof FEATURE_COPY
  open?: boolean
  onOpenChange?: (open: boolean) => void
}

export function UpgradeModal({ feature, open, onOpenChange }: UpgradeModalProps) {
  const router = useRouter()
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')
  const [isLoading, setIsLoading] = useState(false)
  const copy = FEATURE_COPY[feature]

  async function handleUpgrade(plan: 'plus' | 'pro') {
    setIsLoading(true)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: `${plan}-${billing}` }),
      })
      const json = await res.json()
      if (json.data?.url) {
        window.location.href = json.data.url
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (!copy) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-sm">
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription className="text-zinc-400">{copy.body}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Billing interval toggle */}
          <div className="flex rounded-lg border border-zinc-700 p-1 gap-1">
            <button
              onClick={() => setBilling('monthly')}
              className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
                billing === 'monthly'
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling('yearly')}
              className={`flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
                billing === 'yearly'
                  ? 'bg-zinc-700 text-white'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Yearly
              <span className="ml-1.5 text-xs text-emerald-400">−2 months</span>
            </button>
          </div>

          {copy.requiredPlan === 'plus' ? (
            <Button
              className="w-full bg-white text-zinc-900 hover:bg-zinc-100"
              onClick={() => handleUpgrade('plus')}
              disabled={isLoading}
            >
              Upgrade to Plus — {billing === 'monthly' ? '€4/mo' : '€40/yr'}
            </Button>
          ) : (
            <div className="space-y-2">
              <Button
                className="w-full bg-white text-zinc-900 hover:bg-zinc-100"
                onClick={() => handleUpgrade('pro')}
                disabled={isLoading}
              >
                Upgrade to Pro — {billing === 'monthly' ? '€8/mo' : '€80/yr'}
              </Button>
              <Button
                variant="outline"
                className="w-full border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                onClick={() => handleUpgrade('plus')}
                disabled={isLoading}
              >
                Plus — {billing === 'monthly' ? '€4/mo' : '€40/yr'}
              </Button>
            </div>
          )}

          <button
            onClick={() => router.push('/settings/billing')}
            className="w-full text-center text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            View all plan features →
          </button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
