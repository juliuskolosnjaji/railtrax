'use client'

import { useState } from 'react'
import { CheckCircle2, AlertTriangle, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import type { Plan } from '@/lib/entitlements'

const PLAN_LABELS: Record<Plan, string> = {
  free: 'Kostenlos',
  plus: 'Plus',
  pro: 'Pro',
}

const PLAN_BADGE_STYLE: Record<Plan, string> = {
  free: 'bg-zinc-700 text-zinc-300',
  plus: 'bg-blue-900 text-blue-200',
  pro: 'bg-violet-900 text-violet-200',
}

interface Subscription {
  cancel_at_period_end: boolean
  current_period_end: string | null
  ls_subscription_id: string | null
  billing_interval: string | null
}

interface BillingClientProps {
  plan: Plan
  subscription: Subscription | null
  portalUrl: string | null
  tripsCount: number
  maxTrips: number
  storageMbUsed: number
  maxStorageMb: number
  calendarUrl: string | null
  showSuccess: boolean
}

export function BillingClient({
  plan,
  subscription,
  portalUrl,
  tripsCount,
  maxTrips,
  storageMbUsed,
  maxStorageMb,
  calendarUrl,
  showSuccess,
}: BillingClientProps) {
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('monthly')
  const [isLoading, setIsLoading] = useState(false)

  async function handleUpgrade(targetPlan: 'plus' | 'pro') {
    setIsLoading(true)
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: `${targetPlan}-${billing}` }),
      })
      const json = await res.json()
      if (json.data?.url) window.location.href = json.data.url
    } finally {
      setIsLoading(false)
    }
  }

  const tripsUsagePct = maxTrips === Infinity ? 0 : Math.min((tripsCount / maxTrips) * 100, 100)
  const storageUsagePct =
    maxStorageMb === 0 ? 0 : Math.min((storageMbUsed / maxStorageMb) * 100, 100)

  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      })
    : null

  return (
    <div className="space-y-8 settings-page">
      <div>
        <h1 className="text-2xl font-bold text-white">Abonnement</h1>
        <p className="text-zinc-400 mt-1">Verwalte dein Abonnement und deinen Speicherplatz.</p>
      </div>

      {/* Success banner */}
      {showSuccess && (
        <div className="flex items-center gap-3 rounded-lg bg-emerald-950/50 border border-emerald-800 px-4 py-3 text-emerald-300">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span className="text-sm">Abonnement aktiviert — willkommen bei {PLAN_LABELS[plan]}!</span>
        </div>
      )}

      {/* Current plan */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-zinc-400 mb-1">Aktueller Tarif</p>
            <div className="flex items-center gap-2">
              <span className="text-xl font-semibold text-white">{PLAN_LABELS[plan]}</span>
              <Badge className={PLAN_BADGE_STYLE[plan]}>{PLAN_LABELS[plan]}</Badge>
            </div>
          </div>

          {plan !== 'free' && portalUrl && (
            <a href={portalUrl} target="_blank" rel="noopener noreferrer">
              <Button
                variant="outline"
                size="sm"
                className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-1.5"
              >
                Abonnement verwalten
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            </a>
          )}
        </div>

        {/* Cancellation warning */}
        {subscription?.cancel_at_period_end && periodEnd && (
          <div className="flex items-start gap-3 rounded-lg bg-amber-950/40 border border-amber-800/50 px-4 py-3 text-amber-300">
            <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
            <p className="text-sm">
              Your subscription cancels at the end of the current period on{' '}
              <strong>{periodEnd}</strong>. You keep access until then.
            </p>
          </div>
        )}

        {plan !== 'free' && periodEnd && !subscription?.cancel_at_period_end && (
          <p className="text-sm text-zinc-500">
            Next renewal: <span className="text-zinc-300">{periodEnd}</span>
            {subscription?.billing_interval && (
              <span className="ml-1 text-zinc-600">({subscription.billing_interval})</span>
            )}
          </p>
        )}
      </section>

      {/* Usage */}
      <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-5">
        <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">NUTZUNG</h2>

        {/* Trips */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Reisen</span>
            <span className="text-zinc-300">
              {tripsCount}
              {maxTrips !== Infinity ? ` / ${maxTrips}` : ''}
            </span>
          </div>
          {maxTrips !== Infinity && (
            <Progress value={tripsUsagePct} className="h-1.5 bg-zinc-800" />
          )}
          {maxTrips === Infinity && (
            <p className="text-xs text-zinc-600">Unbegrenzt</p>
          )}
        </div>

        {/* Storage */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-zinc-400">Foto-Speicher</span>
            <span className="text-zinc-300">
              {plan === 'free' ? 'Not included' : `${storageMbUsed} MB / ${maxStorageMb} MB`}
            </span>
          </div>
          {plan !== 'free' && (
            <Progress value={storageUsagePct} className="h-1.5 bg-zinc-800" />
          )}
        </div>

        {/* Calendar */}
        {calendarUrl && (
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-zinc-400">Calendar feed</span>
              <button
                onClick={() => navigator.clipboard.writeText(calendarUrl)}
                className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
              >
                Copy iCal URL
              </button>
            </div>
            <p className="text-xs text-zinc-600">
              Add your planned trips to your calendar app
            </p>
          </div>
        )}
      </section>

      {/* Upgrade section — only for free users */}
      {plan === 'free' && (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 space-y-5">
          <h2 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider">
            Upgraden
          </h2>

          {/* Billing interval toggle */}
          <div className="flex rounded-lg border border-zinc-700 p-1 gap-1 w-fit">
            <button
              onClick={() => setBilling('monthly')}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                billing === 'monthly' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBilling('yearly')}
              className={`rounded-md px-4 py-1.5 text-sm font-medium transition-colors ${
                billing === 'yearly' ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:text-white'
              }`}
            >
              Yearly
              <span className="ml-1.5 text-xs text-emerald-400">save 2 months</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Plus card */}
            <div className="rounded-lg border border-zinc-700 p-5 space-y-4">
              <div>
                <p className="font-semibold text-white">Plus</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {billing === 'monthly' ? '€4' : '€40'}
                  <span className="text-sm font-normal text-zinc-400">
                    /{billing === 'monthly' ? 'mo' : 'yr'}
                  </span>
                </p>
              </div>
              <ul className="text-sm text-zinc-400 space-y-1.5">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> Unlimited trips</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> Travel journal + photos</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> Ticket wallet</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> Full statistics + heatmap</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-emerald-400 shrink-0" /> Live delay notifications</li>
              </ul>
              <Button
                className="w-full bg-white text-zinc-900 hover:bg-zinc-100"
                onClick={() => handleUpgrade('plus')}
                disabled={isLoading}
              >
                Plus wählen
              </Button>
            </div>

            {/* Pro card */}
            <div className="rounded-lg border border-violet-700/50 bg-violet-950/20 p-5 space-y-4">
              <div>
                <p className="font-semibold text-white">Pro</p>
                <p className="text-2xl font-bold text-white mt-1">
                  {billing === 'monthly' ? '€8' : '€80'}
                  <span className="text-sm font-normal text-zinc-400">
                    /{billing === 'monthly' ? 'mo' : 'yr'}
                  </span>
                </p>
              </div>
              <ul className="text-sm text-zinc-400 space-y-1.5">
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-violet-400 shrink-0" /> Everything in Plus</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-violet-400 shrink-0" /> REST API access</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-violet-400 shrink-0" /> Collaborative trips</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-violet-400 shrink-0" /> AI travel suggestions</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="h-3.5 w-3.5 text-violet-400 shrink-0" /> 5 GB photo storage</li>
              </ul>
              <Button
                className="w-full bg-violet-600 text-white hover:bg-violet-500"
                onClick={() => handleUpgrade('pro')}
                disabled={isLoading}
              >
                Pro wählen
              </Button>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
