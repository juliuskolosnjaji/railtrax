'use client'

import { useState } from 'react'
import { CheckCircle2, AlertTriangle, ExternalLink, Zap, Star, Crown, Calendar, Train, HardDrive, Copy, Check } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { Plan } from '@/lib/entitlements'

const PLAN_LABELS: Record<Plan, string> = {
  free: 'Kostenlos',
  plus: 'Plus',
  pro: 'Pro',
}

const PLAN_CONFIG: Record<Plan, {
  icon: React.ReactNode
  color: string
  border: string
  bg: string
}> = {
  free: {
    icon: <Zap size={16} />,
    color: '#4a6a9a',
    border: '#1e2d4a',
    bg: '#0a1628',
  },
  plus: {
    icon: <Star size={16} />,
    color: '#4f8ef7',
    border: '#1e3a6e',
    bg: '#0a1628',
  },
  pro: {
    icon: <Crown size={16} />,
    color: '#a78bfa',
    border: '#4c1d95',
    bg: '#0d0a1f',
  },
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

function UsageRow({
  icon, label, value, max, pct, valueLabel,
}: {
  icon: React.ReactNode
  label: string
  value: number
  max: number
  pct: number
  valueLabel: string
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{icon}</span>
          <span className="text-sm text-secondary">{label}</span>
        </div>
        <span className="text-sm font-medium text-foreground">{valueLabel}</span>
      </div>
      <div className="h-1 bg-border rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{
            width: `${pct}%`,
            background: pct > 80 ? '#e25555' : pct > 60 ? '#f59e0b' : '#4f8ef7',
          }}
        />
      </div>
    </div>
  )
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
  const [calCopied, setCalCopied] = useState(false)

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

  async function handleCopyCalendar() {
    if (!calendarUrl) return
    await navigator.clipboard.writeText(calendarUrl)
    setCalCopied(true)
    setTimeout(() => setCalCopied(false), 2000)
  }

  const tripsUsagePct = maxTrips === Infinity ? 0 : Math.min((tripsCount / maxTrips) * 100, 100)
  const storageUsagePct = maxStorageMb === 0 ? 0 : Math.min((storageMbUsed / maxStorageMb) * 100, 100)

  const periodEnd = subscription?.current_period_end
    ? new Date(subscription.current_period_end).toLocaleDateString('de-DE', {
        day: 'numeric', month: 'long', year: 'numeric',
      })
    : null

  const cfg = PLAN_CONFIG[plan]

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div>
        <h1 className="text-xl font-semibold text-foreground mb-1">Abonnement</h1>
        <p className="text-sm text-muted-foreground">Deinen Tarif und deine Nutzung verwalten.</p>
      </div>

      {showSuccess && (
        <div className="flex items-center gap-2.5 bg-emerald-950/50 border border-emerald-900/50 rounded-xl px-4 py-3 text-emerald-400 text-sm">
          <CheckCircle2 size={15} className="shrink-0" />
          Abonnement aktiviert — willkommen bei {PLAN_LABELS[plan]}!
        </div>
      )}

      {/* Current plan */}
      <Card
        className="border"
        style={{ background: cfg.bg, borderColor: cfg.border }}
      >
        <CardContent className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold text-muted uppercase tracking-widest mb-3">
                Aktueller Tarif
              </p>
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center border"
                  style={{ background: 'transparent', borderColor: cfg.border, color: cfg.color }}
                >
                  {cfg.icon}
                </div>
                <span className="text-2xl font-bold" style={{ color: cfg.color }}>
                  {PLAN_LABELS[plan]}
                </span>
              </div>
              {plan !== 'free' && periodEnd && !subscription?.cancel_at_period_end && (
                <p className="text-xs text-muted-foreground mt-2">
                  Verlängerung am{' '}
                  <span className="text-secondary">{periodEnd}</span>
                  {subscription?.billing_interval && (
                    <span className="text-muted ml-1">
                      ({subscription.billing_interval === 'yearly' ? 'jährlich' : 'monatlich'})
                    </span>
                  )}
                </p>
              )}
            </div>

            {plan !== 'free' && portalUrl && (
              <a
                href={portalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs text-brand bg-surface border border-brand/20 rounded-lg px-3 py-1.5 hover:bg-brand/10 transition-colors shrink-0"
              >
                Verwalten <ExternalLink size={11} />
              </a>
            )}
          </div>

          {subscription?.cancel_at_period_end && periodEnd && (
            <div className="flex items-start gap-2.5 bg-warning-bg border border-warning/20 rounded-lg px-3 py-2.5 mt-4 text-warning text-xs">
              <AlertTriangle size={13} className="shrink-0 mt-0.5" />
              Abo endet am <strong>{periodEnd}</strong>. Zugang bleibt bis dahin erhalten.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Usage */}
      <Card className="border">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold text-muted uppercase tracking-widest">
            Nutzung
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 pt-0">
          <UsageRow
            icon={<Train size={13} />}
            label="Reisen"
            value={tripsCount}
            max={maxTrips}
            pct={tripsUsagePct}
            valueLabel={maxTrips === Infinity ? `${tripsCount}` : `${tripsCount} / ${maxTrips}`}
          />
          <UsageRow
            icon={<HardDrive size={13} />}
            label="Foto-Speicher"
            value={storageMbUsed}
            max={maxStorageMb}
            pct={storageUsagePct}
            valueLabel={plan === 'free' ? '—' : `${storageMbUsed} / ${maxStorageMb} MB`}
          />

          {calendarUrl && (
            <div className="flex items-center justify-between pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <Calendar size={13} className="text-muted-foreground" />
                <div>
                  <p className="text-sm text-secondary">Kalender-Feed</p>
                  <p className="text-xs text-muted-foreground">Reisen in Kalender-App importieren</p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyCalendar}
                className="text-xs h-8 gap-1.5"
              >
                {calCopied ? <Check size={11} /> : <Copy size={11} />}
                {calCopied ? 'Kopiert!' : 'iCal kopieren'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upgrade */}
      {plan === 'free' && (
        <Card className="border">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold text-muted uppercase tracking-widest">
                Upgraden
              </CardTitle>
              <div className="flex bg-background rounded-lg border border-border p-0.5 gap-0.5">
                {(['monthly', 'yearly'] as const).map(b => (
                  <button
                    key={b}
                    onClick={() => setBilling(b)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-md transition-all ${billing === b ? 'bg-surface text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
                  >
                    {b === 'monthly' ? 'Monatlich' : 'Jährlich'}
                    {b === 'yearly' && (
                      <span className="ml-1.5 text-[10px] text-emerald-400">−17%</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Plus */}
              <div className="rounded-xl border border-brand/30 bg-surface p-5 flex flex-col gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg bg-brand/10 border border-brand/20 flex items-center justify-center text-brand">
                      <Star size={13} />
                    </div>
                    <span className="text-base font-semibold text-foreground">Plus</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-brand">
                      {billing === 'monthly' ? '€4' : '€40'}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      /{billing === 'monthly' ? 'Monat' : 'Jahr'}
                    </span>
                  </div>
                </div>
                <ul className="space-y-2 flex-1">
                  {['Unbegrenzte Reisen', 'Reisetagebuch + Fotos', 'Ticket-Wallet', 'Vollständige Statistik', 'Verspätungs-Alerts'].map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-secondary">
                      <CheckCircle2 size={13} className="text-brand shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => handleUpgrade('plus')}
                  disabled={isLoading}
                  className="w-full bg-brand hover:bg-brand/90 text-primary-foreground"
                >
                  Plus wählen
                </Button>
              </div>

              {/* Pro */}
              <div className="rounded-xl border border-purple-900/50 bg-gradient-to-br from-[#0d0a1f] to-[#0a0d1f] p-5 flex flex-col gap-4 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-purple-900/10 pointer-events-none" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-7 h-7 rounded-lg bg-purple-500/10 border border-purple-900/50 flex items-center justify-center text-purple-400">
                      <Crown size={13} />
                    </div>
                    <span className="text-base font-semibold text-foreground">Pro</span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-purple-500/15 text-purple-400 border border-purple-900/50">
                      BELIEBT
                    </span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-purple-400">
                      {billing === 'monthly' ? '€8' : '€80'}
                    </span>
                    <span className="text-xs text-purple-900">
                      /{billing === 'monthly' ? 'Monat' : 'Jahr'}
                    </span>
                  </div>
                </div>
                <ul className="space-y-2 flex-1 relative">
                  {['Alles aus Plus', 'REST-API-Zugang', 'Gemeinsame Reisen', 'KI-Reisevorschläge', '5 GB Foto-Speicher'].map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-secondary">
                      <CheckCircle2 size={13} className="text-purple-400 shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button
                  onClick={() => handleUpgrade('pro')}
                  disabled={isLoading}
                  className="w-full bg-gradient-to-r from-violet-700 to-purple-500 hover:opacity-90 text-white"
                >
                  Pro wählen
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
