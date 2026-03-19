'use client'

import { useState } from 'react'
import { CheckCircle2, AlertTriangle, ExternalLink, Zap, Star, Crown, Calendar, Train, HardDrive, Copy, Check } from 'lucide-react'
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
  glow: string
}> = {
  free: {
    icon: <Zap size={16} />,
    color: '#4a6a9a',
    border: '#1e2d4a',
    bg: '#0a1628',
    glow: 'rgba(74,106,154,0.15)',
  },
  plus: {
    icon: <Star size={16} />,
    color: '#4f8ef7',
    border: '#1e3a6e',
    bg: '#0a1628',
    glow: 'rgba(79,142,247,0.15)',
  },
  pro: {
    icon: <Crown size={16} />,
    color: '#a78bfa',
    border: '#4c1d95',
    bg: '#0d0a1f',
    glow: 'rgba(167,139,250,0.15)',
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
  icon, label, value, max, pct, valueLabel, infinite,
}: {
  icon: React.ReactNode
  label: string
  value: number
  max: number
  pct: number
  valueLabel: string
  infinite?: boolean
}) {
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ color: '#4a6a9a' }}>{icon}</span>
          <span style={{ fontSize: 13, color: '#8ba3c7' }}>{label}</span>
        </div>
        <span style={{ fontSize: 13, fontWeight: 500, color: infinite ? '#3ecf6e' : '#fff' }}>
          {valueLabel}
        </span>
      </div>
      {!infinite && (
        <div style={{ height: 4, background: '#1e2d4a', borderRadius: 2, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${pct}%`,
            background: pct > 80 ? '#e25555' : pct > 60 ? '#f59e0b' : '#4f8ef7',
            borderRadius: 2,
            transition: 'width 0.4s ease',
          }} />
        </div>
      )}
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Success banner */}
      {showSuccess && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
          background: '#0d2618', border: '1px solid #1a4a2e',
          borderRadius: 12, padding: '12px 16px', color: '#3ecf6e',
        }}>
          <CheckCircle2 size={16} />
          <span style={{ fontSize: 13 }}>Abonnement aktiviert — willkommen bei {PLAN_LABELS[plan]}!</span>
        </div>
      )}

      {/* Current plan card */}
      <div style={{
        background: cfg.bg,
        border: `1px solid ${cfg.border}`,
        borderRadius: 14,
        padding: 24,
        boxShadow: `0 0 40px ${cfg.glow}`,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Subtle background glow */}
        <div style={{
          position: 'absolute', top: -40, right: -40,
          width: 160, height: 160, borderRadius: '50%',
          background: cfg.glow, pointerEvents: 'none',
        }} />

        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div>
            <div style={{ fontSize: 11, color: '#4a6a9a', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
              Aktueller Tarif
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10,
                background: `${cfg.glow}`,
                border: `1px solid ${cfg.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: cfg.color,
              }}>
                {cfg.icon}
              </div>
              <span style={{ fontSize: 26, fontWeight: 700, color: cfg.color, lineHeight: 1 }}>
                {PLAN_LABELS[plan]}
              </span>
            </div>
            {plan !== 'free' && periodEnd && !subscription?.cancel_at_period_end && (
              <p style={{ fontSize: 12, color: '#4a6a9a', marginTop: 8 }}>
                Verlängerung am{' '}
                <span style={{ color: '#8ba3c7' }}>{periodEnd}</span>
                {subscription?.billing_interval && (
                  <span style={{ color: '#1e3a6e', marginLeft: 4 }}>
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
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                fontSize: 12, color: '#4f8ef7',
                background: '#0d1f3c', border: '1px solid #1e3a6e',
                borderRadius: 8, padding: '7px 12px',
                textDecoration: 'none', flexShrink: 0,
              }}
            >
              Verwalten
              <ExternalLink size={12} />
            </a>
          )}
        </div>

        {/* Cancellation warning */}
        {subscription?.cancel_at_period_end && periodEnd && (
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            background: '#1c1508', border: '1px solid #78350f',
            borderRadius: 8, padding: '10px 14px', marginTop: 16,
            color: '#f59e0b', fontSize: 13,
          }}>
            <AlertTriangle size={14} style={{ marginTop: 1, flexShrink: 0 }} />
            <span>
              Abo endet am <strong>{periodEnd}</strong>. Zugang bleibt bis dahin erhalten.
            </span>
          </div>
        )}
      </div>

      {/* Usage card */}
      <div style={{
        background: '#0a1628', border: '1px solid #1e2d4a',
        borderRadius: 14, padding: 24,
      }}>
        <div style={{
          fontSize: 11, fontWeight: 600, color: '#4a6a9a',
          textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 20,
        }}>
          Nutzung
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <UsageRow
            icon={<Train size={13} />}
            label="Reisen"
            value={tripsCount}
            max={maxTrips}
            pct={tripsUsagePct}
            valueLabel={maxTrips === Infinity ? `${tripsCount}` : `${tripsCount} / ${maxTrips}`}
            infinite={maxTrips === Infinity}
          />
          <UsageRow
            icon={<HardDrive size={13} />}
            label="Foto-Speicher"
            value={storageMbUsed}
            max={maxStorageMb}
            pct={storageUsagePct}
            valueLabel={plan === 'free' ? '—' : `${storageMbUsed} / ${maxStorageMb} MB`}
            infinite={false}
          />
        </div>

        {/* Calendar feed */}
        {calendarUrl && (
          <div style={{
            marginTop: 20, paddingTop: 20,
            borderTop: '1px solid #1e2d4a',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Calendar size={13} style={{ color: '#4a6a9a' }} />
              <div>
                <div style={{ fontSize: 13, color: '#8ba3c7' }}>Kalender-Feed</div>
                <div style={{ fontSize: 11, color: '#4a6a9a' }}>Reisen in Kalender-App importieren</div>
              </div>
            </div>
            <button
              onClick={handleCopyCalendar}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                fontSize: 12, color: calCopied ? '#3ecf6e' : '#4f8ef7',
                background: '#0d1f3c', border: `1px solid ${calCopied ? '#1a4a2e' : '#1e3a6e'}`,
                borderRadius: 7, padding: '6px 10px', cursor: 'pointer',
              }}
            >
              {calCopied ? <Check size={12} /> : <Copy size={12} />}
              {calCopied ? 'Kopiert!' : 'iCal kopieren'}
            </button>
          </div>
        )}
      </div>

      {/* Upgrade section — free users only */}
      {plan === 'free' && (
        <div style={{
          background: '#0a1628', border: '1px solid #1e2d4a',
          borderRadius: 14, padding: 24,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div style={{
              fontSize: 11, fontWeight: 600, color: '#4a6a9a',
              textTransform: 'uppercase', letterSpacing: '0.08em',
            }}>
              Upgraden
            </div>

            {/* Interval toggle */}
            <div style={{
              display: 'flex', background: '#080d1a',
              border: '1px solid #1e2d4a', borderRadius: 8,
              padding: 3, gap: 3,
            }}>
              {(['monthly', 'yearly'] as const).map(b => (
                <button
                  key={b}
                  onClick={() => setBilling(b)}
                  style={{
                    fontSize: 12, fontWeight: 500,
                    padding: '5px 12px', borderRadius: 6,
                    cursor: 'pointer', border: 'none',
                    background: billing === b ? '#0d1f3c' : 'transparent',
                    color: billing === b ? '#fff' : '#4a6a9a',
                    transition: 'all 0.15s',
                  }}
                >
                  {b === 'monthly' ? 'Monatlich' : 'Jährlich'}
                  {b === 'yearly' && (
                    <span style={{ marginLeft: 5, fontSize: 10, color: '#3ecf6e' }}>−17%</span>
                  )}
                </button>
              ))}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
            {/* Plus */}
            <div style={{
              background: '#080d1a', border: '1px solid #1e3a6e',
              borderRadius: 12, padding: 20,
              display: 'flex', flexDirection: 'column', gap: 16,
            }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: 'rgba(79,142,247,0.12)', border: '1px solid #1e3a6e',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#4f8ef7',
                  }}>
                    <Star size={13} />
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>Plus</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontSize: 28, fontWeight: 700, color: '#4f8ef7' }}>
                    {billing === 'monthly' ? '€4' : '€40'}
                  </span>
                  <span style={{ fontSize: 12, color: '#4a6a9a' }}>
                    /{billing === 'monthly' ? 'Monat' : 'Jahr'}
                  </span>
                </div>
              </div>

              <ul style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  'Unbegrenzte Reisen',
                  'Reisetagebuch + Fotos',
                  'Ticket-Wallet',
                  'Vollständige Statistik',
                  'Verspätungs-Alerts',
                ].map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#8ba3c7' }}>
                    <CheckCircle2 size={13} style={{ color: '#4f8ef7', flexShrink: 0 }} />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleUpgrade('plus')}
                disabled={isLoading}
                style={{
                  marginTop: 'auto', padding: '10px 16px',
                  background: '#4f8ef7', color: '#fff', border: 'none',
                  borderRadius: 9, fontSize: 13, fontWeight: 600,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.7 : 1,
                }}
              >
                Plus wählen
              </button>
            </div>

            {/* Pro */}
            <div style={{
              background: 'linear-gradient(135deg, #0d0a1f 0%, #0a0d1f 100%)',
              border: '1px solid #4c1d95',
              borderRadius: 12, padding: 20,
              display: 'flex', flexDirection: 'column', gap: 16,
              position: 'relative', overflow: 'hidden',
            }}>
              {/* Glow */}
              <div style={{
                position: 'absolute', top: -30, right: -30,
                width: 120, height: 120, borderRadius: '50%',
                background: 'rgba(167,139,250,0.08)', pointerEvents: 'none',
              }} />

              <div style={{ position: 'relative' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: 8,
                    background: 'rgba(167,139,250,0.12)', border: '1px solid #4c1d95',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#a78bfa',
                  }}>
                    <Crown size={13} />
                  </div>
                  <span style={{ fontSize: 15, fontWeight: 600, color: '#fff' }}>Pro</span>
                  <span style={{
                    fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 4,
                    background: 'rgba(167,139,250,0.15)', color: '#a78bfa',
                    border: '1px solid #4c1d95',
                  }}>
                    BELIEBT
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 4 }}>
                  <span style={{ fontSize: 28, fontWeight: 700, color: '#a78bfa' }}>
                    {billing === 'monthly' ? '€8' : '€80'}
                  </span>
                  <span style={{ fontSize: 12, color: '#6d28d9' }}>
                    /{billing === 'monthly' ? 'Monat' : 'Jahr'}
                  </span>
                </div>
              </div>

              <ul style={{ display: 'flex', flexDirection: 'column', gap: 8, position: 'relative' }}>
                {[
                  'Alles aus Plus',
                  'REST-API-Zugang',
                  'Gemeinsame Reisen',
                  'KI-Reisevorschläge',
                  '5 GB Foto-Speicher',
                ].map(f => (
                  <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#8ba3c7' }}>
                    <CheckCircle2 size={13} style={{ color: '#a78bfa', flexShrink: 0 }} />
                    {f}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handleUpgrade('pro')}
                disabled={isLoading}
                style={{
                  marginTop: 'auto', padding: '10px 16px',
                  background: 'linear-gradient(135deg, #7c3aed, #a78bfa)',
                  color: '#fff', border: 'none',
                  borderRadius: 9, fontSize: 13, fontWeight: 600,
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.7 : 1,
                  position: 'relative',
                }}
              >
                Pro wählen
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
