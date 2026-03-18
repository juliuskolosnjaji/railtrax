'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { UpgradeModal } from '@/components/billing/UpgradeModal'

const HeatmapMap = dynamic(
  () => import('@/components/map/HeatmapMap').then((m) => m.HeatmapMap),
  { ssr: false }
)

interface StatsData {
  total_km: number
  total_trips: number
  total_legs: number
  total_hours: number
  countries: string[]
  co2_saved_kg: number | null
  monthly_distances?: Record<string, number>
  top_operators?: { operator: string; km: number }[]
  countries_detail?: { country: string; km: number }[]
  upgradeRequired?: boolean
}

interface HeatmapData {
  type: 'FeatureCollection'
  features: {
    type: 'Feature'
    geometry: {
      type: 'LineString'
      coordinates: [number, number][]
    }
    properties: {
      origin: string
      destination: string
      operator: string | null
      distanceKm: number | null
    }
  }[]
}

const CARD_STYLE: React.CSSProperties = {
  background: '#0a1628',
  border: '1px solid #1e2d4a',
  borderRadius: 12,
  padding: 24,
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string
  value: string | number
  sub?: string
}) {
  return (
    <div style={CARD_STYLE}>
      <p style={{ fontSize: 12, color: '#4a6a9a', marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 28, fontWeight: 700, color: '#fff' }}>{value}</p>
      {sub && <p style={{ fontSize: 11, color: '#4a6a9a', marginTop: 4 }}>{sub}</p>}
    </div>
  )
}

function LockedCard({ label, onUnlock }: { label: string; onUnlock: () => void }) {
  return (
    <div
      style={{ ...CARD_STYLE, position: 'relative', cursor: 'pointer' }}
      onClick={onUnlock}
    >
      <div style={{ filter: 'blur(4px)', userSelect: 'none' }}>
        <p style={{ fontSize: 12, color: '#4a6a9a', marginBottom: 4 }}>{label}</p>
        <p style={{ fontSize: 28, fontWeight: 700, color: '#fff' }}>—</p>
      </div>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{
          borderRadius: 99, border: '1px solid #1e3a6e',
          background: 'rgba(10,22,40,0.85)', padding: '4px 12px',
          fontSize: 12, color: '#4f8ef7',
        }}>
          Plus — upgraden zum Freischalten
        </span>
      </div>
    </div>
  )
}

const CO2_COMPARISONS = [
  { kg: 100, label: '1 smartphone charged' },
  { kg: 500, label: '1km driven in a car' },
  { kg: 1000, label: '1 laundry load' },
  { kg: 2500, label: 'one-way flight Paris-London' },
]

function findClosestComparison(kg: number) {
  if (kg <= 0) return null
  let closest = CO2_COMPARISONS[0]
  for (const c of CO2_COMPARISONS) {
    if (Math.abs(kg - c.kg) < Math.abs(kg - closest.kg)) {
      closest = c
    }
  }
  return closest
}

function formatMonth(monthKey: string): string {
  const [year, month] = monthKey.split('-')
  const date = new Date(parseInt(year), parseInt(month) - 1)
  return date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
}

type Tab = 'overview' | 'heatmap'

export default function StatsPage() {
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  const { data, isLoading, isError } = useQuery<{ data: StatsData }>({
    queryKey: ['stats'],
    queryFn: () => fetch('/api/stats').then((r) => r.json()),
  })

  const { data: heatmapData } = useQuery<{ data: HeatmapData }>({
    queryKey: ['stats-heatmap'],
    queryFn: () => fetch('/api/stats/heatmap').then((r) => r.json()),
    enabled: activeTab === 'heatmap' && !!data?.data && !data?.data.upgradeRequired,
  })

  const stats = data?.data

  const monthlyData = stats?.monthly_distances
    ? Object.entries(stats.monthly_distances)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-12)
        .map(([month, km]: [string, number]) => ({
          month: formatMonth(month),
          km: Math.round(km),
        }))
    : []

  const operatorData = stats?.top_operators ?? []

  const co2Comparison = stats?.co2_saved_kg ? findClosestComparison(stats.co2_saved_kg) : null

  return (
    <div style={{ padding: '24px 16px', maxWidth: 900 }} className="md:p-8">
      <h1 style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 4 }}>Statistik</h1>
      <p style={{ fontSize: 13, color: '#4a6a9a', marginBottom: 24 }}>Zurückgelegte Strecke, besuchte Länder, CO₂ gespart und mehr.</p>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid #1e2d4a' }}>
        {(['overview', 'heatmap'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            style={{
              padding: '8px 16px', fontSize: 14, fontWeight: 500,
              background: 'none', border: 'none', cursor: 'pointer',
              color: activeTab === t ? '#fff' : '#4a6a9a',
              position: 'relative', transition: 'color 0.15s',
            }}
          >
            {t === 'overview' ? 'Übersicht' : 'Heatmap'}
            {activeTab === t && (
              <span style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 2, background: '#4f8ef7', borderRadius: 2 }} />
            )}
          </button>
        ))}
      </div>

      {isError && (
        <p style={{ color: '#e25555', fontSize: 13, marginBottom: 24 }}>Fehler beim Laden der Statistik.</p>
      )}

      {activeTab === 'overview' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {isLoading ? (
              <>
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 animate-pulse">
                    <div className="h-3 w-20 bg-zinc-800 rounded mb-3" />
                    <div className="h-8 w-16 bg-zinc-700 rounded" />
                  </div>
                ))}
              </>
            ) : (
              <>
                <StatCard
                  label="Gesamtstrecke"
                  value={stats ? `${stats.total_km.toLocaleString('de-DE')} km` : '—'}
                />
                <StatCard
                  label="Abgeschlossene Reisen"
                  value={stats?.total_trips ?? '—'}
                  sub={stats ? `${stats.total_legs} Abschnitte` : undefined}
                />
                <StatCard
                  label="Zeit im Zug"
                  value={stats ? `${stats.total_hours} Std.` : '—'}
                />
                <StatCard
                  label="Besuchte Länder"
                  value={stats?.countries.length ?? '—'}
                  sub={stats?.countries.join(' · ') || undefined}
                />
              </>
            )}
          </div>

          {/* CO2 card — Plus only */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {isLoading ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 animate-pulse">
                <div className="h-3 w-20 bg-zinc-800 rounded mb-3" />
                <div className="h-8 w-16 bg-zinc-700 rounded" />
              </div>
            ) : stats?.upgradeRequired ? (
              <LockedCard label="CO₂ eingespart" onUnlock={() => setUpgradeOpen(true)} />
            ) : (
              <div className="rounded-xl border border-green-900/50 bg-green-950/30 p-6">
                <p className="text-sm text-green-400 mb-1">CO₂ eingespart</p>
                <p className="text-3xl font-bold text-green-400">{stats?.co2_saved_kg} kg</p>
                {co2Comparison && (
                  <p className="text-xs text-green-500/70 mt-1">
                    ≈ {co2Comparison.label}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Monthly distance chart — Plus only */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isLoading ? (
              <>
                <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 animate-pulse min-h-[300px]" />
                <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6 animate-pulse min-h-[300px]" />
              </>
            ) : stats?.upgradeRequired ? (
              <>
                <LockedCard label="Monatliche Strecke" onUnlock={() => setUpgradeOpen(true)} />
                <LockedCard label="Top-Betreiber" onUnlock={() => setUpgradeOpen(true)} />
              </>
            ) : (
              <>
                {/* Monthly distance bar chart */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
                  <p className="text-sm text-zinc-500 mb-4">Monatliche Strecke</p>
                  {monthlyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={monthlyData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" vertical={false} />
                        <XAxis
                          dataKey="month"
                          tick={{ fill: '#71717a', fontSize: 11 }}
                          tickLine={false}
                          axisLine={{ stroke: '#3f3f46' }}
                        />
                        <YAxis
                          tick={{ fill: '#71717a', fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                          tickFormatter={(v) => `${v}km`}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#18181b',
                            border: '1px solid #3f3f46',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                          labelStyle={{ color: '#e4e4e7' }}
                          itemStyle={{ color: '#a1a1aa' }}
                          formatter={(value) => [`${value} km`, 'Strecke']}
                        />
                        <Bar dataKey="km" fill="#22c55e" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-zinc-500 text-center py-8">Noch keine Daten</p>
                  )}
                </div>

                {/* Top operators horizontal bar chart */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-6">
                  <p className="text-sm text-zinc-500 mb-4">Top-Betreiber</p>
                  {operatorData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={operatorData.slice(0, 5)} layout="vertical" margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#3f3f46" horizontal={false} />
                        <XAxis
                          type="number"
                          tick={{ fill: '#71717a', fontSize: 11 }}
                          tickLine={false}
                          axisLine={{ stroke: '#3f3f46' }}
                          tickFormatter={(v) => `${v}km`}
                        />
                        <YAxis
                          type="category"
                          dataKey="operator"
                          tick={{ fill: '#a1a1aa', fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                          width={60}
                        />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#18181b',
                            border: '1px solid #3f3f46',
                            borderRadius: '8px',
                            fontSize: '12px',
                          }}
                          labelStyle={{ color: '#e4e4e7' }}
                          itemStyle={{ color: '#a1a1aa' }}
                          formatter={(value) => [`${value} km`, 'Strecke']}
                        />
                        <Bar dataKey="km" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-zinc-500 text-center py-8">Noch keine Daten</p>
                  )}
                </div>
              </>
            )}
          </div>
        </>
      )}

      {activeTab === 'heatmap' && (
        <>
          {stats?.upgradeRequired ? (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-12 flex flex-col items-center justify-center">
              <p className="text-zinc-500 text-sm mb-4">Heatmap ist verfügbar für Plus-Abonnenten</p>
              <button
                onClick={() => setUpgradeOpen(true)}
                className="px-4 py-2 bg-white text-zinc-900 rounded-lg text-sm font-medium hover:bg-zinc-100 transition-colors"
              >
                Plus wählen
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-zinc-800 bg-zinc-900 overflow-hidden" style={{ height: '500px' }}>
              {heatmapData?.data?.features?.length ? (
                <HeatmapMap geojson={heatmapData.data} />
              ) : (
                <div className="flex items-center justify-center h-full text-zinc-500 text-sm">
                  Noch keine Routendaten zum Anzeigen
                </div>
              )}
            </div>
          )}
        </>
      )}

      <UpgradeModal
        feature="fullStats"
        open={upgradeOpen}
        onOpenChange={setUpgradeOpen}
      />
    </div>
  )
}
