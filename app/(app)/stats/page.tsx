'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import dynamic from 'next/dynamic'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'

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

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="glass-panel rounded-xl p-6">
      <p className="stat-label mb-1">{label}</p>
      <p className="text-[28px] font-bold text-foreground">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
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
    if (Math.abs(kg - c.kg) < Math.abs(kg - closest.kg)) closest = c
  }
  return closest
}

function formatMonth(monthKey: string): string {
  const [year, month] = monthKey.split('-')
  const date = new Date(parseInt(year), parseInt(month) - 1)
  return date.toLocaleDateString('de-DE', { month: 'short', year: '2-digit' })
}

type Tab = 'overview' | 'heatmap'

// Chart color values derived from CSS vars — used directly in recharts props
const CHART = {
  grid:    'hsl(220 14% 16%)',
  axis:    'hsl(215 12% 38%)',
  label:   'hsl(215 12% 55%)',
  tooltip: { bg: 'hsl(220 18% 10%)', border: 'hsl(220 14% 16%)', text: 'hsl(210 20% 92%)' },
  primary: 'hsl(215 10% 50%)',
  success: 'hsl(152 60% 45%)',
}

export default function StatsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('overview')

  const { data, isLoading, isError } = useQuery<{ data: StatsData }>({
    queryKey: ['stats'],
    queryFn: () => fetch('/api/stats').then((r) => r.json()),
    staleTime: 60_000,
  })

  const { data: heatmapData } = useQuery<{ data: HeatmapData }>({
    queryKey: ['stats-heatmap'],
    queryFn: () => fetch('/api/stats/heatmap').then((r) => r.json()),
    enabled: activeTab === 'heatmap',
  })

  const stats = data?.data

  const monthlyData = stats?.monthly_distances
    ? Object.entries(stats.monthly_distances)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-12)
        .map(([month, km]: [string, number]) => ({ month: formatMonth(month), km: Math.round(km) }))
    : []

  const operatorData = stats?.top_operators ?? []
  const co2Comparison = stats?.co2_saved_kg ? findClosestComparison(stats.co2_saved_kg) : null

  return (
    <div className="p-8 max-w-4xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-foreground tracking-tight mb-1">Statistik</h1>
      <p className="text-sm text-muted-foreground mb-6">Zurückgelegte Strecke, besuchte Länder, CO₂ gespart und mehr.</p>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b border-border">
        {(['overview', 'heatmap'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={[
              'tap-small px-4 py-2 text-sm font-medium transition-colors relative',
              activeTab === t ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
            ].join(' ')}
            style={{ background: 'none', border: 'none', cursor: 'pointer' }}
          >
            {t === 'overview' ? 'Übersicht' : 'Heatmap'}
            {activeTab === t && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-zinc-500 rounded-t" />
            )}
          </button>
        ))}
      </div>

      {isError && (
        <p className="text-destructive text-sm mb-6">Fehler beim Laden der Statistik.</p>
      )}

      {activeTab === 'overview' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-6 animate-pulse">
                  <div className="h-3 w-20 bg-secondary rounded mb-3" />
                  <div className="h-8 w-16 bg-secondary rounded" />
                </div>
              ))
            ) : (
              <>
                <StatCard label="Gesamtstrecke" value={stats ? `${stats.total_km.toLocaleString('de-DE')} km` : '—'} />
                <StatCard label="Reisen gesamt" value={stats?.total_trips ?? '—'} sub={stats ? `${stats.total_legs} Abschnitte` : undefined} />
                <StatCard label="Zeit im Zug" value={stats ? `${stats.total_hours} Std.` : '—'} />
                <StatCard label="Besuchte Länder" value={stats?.countries.length ?? '—'} sub={stats?.countries.join(' · ') || undefined} />
              </>
            )}
          </div>

          {/* CO₂ card */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
            {isLoading ? (
              <div className="rounded-xl border border-border bg-card p-6 animate-pulse">
                <div className="h-3 w-20 bg-secondary rounded mb-3" />
                <div className="h-8 w-16 bg-secondary rounded" />
              </div>
            ) : (
              <div className="rounded-xl border border-success/30 bg-success/10 p-6">
                <p className="text-sm text-success mb-1">CO₂ eingespart</p>
                <p className="text-3xl font-bold text-success">{stats?.co2_saved_kg ?? 0} kg</p>
                {co2Comparison && (
                  <p className="text-xs text-success/60 mt-1">≈ {co2Comparison.label}</p>
                )}
              </div>
            )}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {isLoading ? (
              <>
                <div className="rounded-xl border border-border bg-card p-6 animate-pulse min-h-[300px]" />
                <div className="rounded-xl border border-border bg-card p-6 animate-pulse min-h-[300px]" />
              </>
            ) : (
              <>
                <div className="glass-panel rounded-xl p-6">
                  <p className="stat-label mb-4">Monatliche Strecke</p>
                  {monthlyData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={monthlyData} margin={{ top: 5, right: 5, bottom: 5, left: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} vertical={false} />
                        <XAxis dataKey="month" tick={{ fill: CHART.axis, fontSize: 11 }} tickLine={false} axisLine={{ stroke: CHART.grid }} />
                        <YAxis tick={{ fill: CHART.axis, fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}km`} />
                        <Tooltip
                          contentStyle={{ backgroundColor: CHART.tooltip.bg, border: `1px solid ${CHART.tooltip.border}`, borderRadius: 8, fontSize: 12 }}
                          labelStyle={{ color: CHART.tooltip.text }}
                          itemStyle={{ color: CHART.label }}
                          formatter={(value) => [`${value} km`, 'Strecke']}
                        />
                        <Bar dataKey="km" fill={CHART.success} radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">Noch keine Daten</p>
                  )}
                </div>

                <div className="glass-panel rounded-xl p-6">
                  <p className="stat-label mb-4">Top-Betreiber</p>
                  {operatorData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={operatorData.slice(0, 5)} layout="vertical" margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke={CHART.grid} horizontal={false} />
                        <XAxis type="number" tick={{ fill: CHART.axis, fontSize: 11 }} tickLine={false} axisLine={{ stroke: CHART.grid }} tickFormatter={(v) => `${v}km`} />
                        <YAxis type="category" dataKey="operator" tick={{ fill: CHART.label, fontSize: 11 }} tickLine={false} axisLine={false} width={60} />
                        <Tooltip
                          contentStyle={{ backgroundColor: CHART.tooltip.bg, border: `1px solid ${CHART.tooltip.border}`, borderRadius: 8, fontSize: 12 }}
                          labelStyle={{ color: CHART.tooltip.text }}
                          itemStyle={{ color: CHART.label }}
                          formatter={(value) => [`${value} km`, 'Strecke']}
                        />
                        <Bar dataKey="km" fill={CHART.primary} radius={[0, 4, 4, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">Noch keine Daten</p>
                  )}
                </div>
              </>
            )}
          </div>
        </>
      )}

      {activeTab === 'heatmap' && (
        <div className="rounded-xl border border-border bg-card overflow-hidden" style={{ height: 500 }}>
          {heatmapData?.data?.features?.length ? (
            <HeatmapMap geojson={heatmapData.data} />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
              Noch keine Routendaten zum Anzeigen
            </div>
          )}
        </div>
      )}
    </div>
  )
}
