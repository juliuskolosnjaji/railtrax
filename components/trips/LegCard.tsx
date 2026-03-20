'use client'

import { useState } from 'react'
import { Pencil, Trash2, Clock, MapPin, Train, ChevronDown, Plus, Loader2, CheckCircle2, Star } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LegEditorSheet } from './LegEditorSheet'
import { useDeleteLeg, useUpdateLeg, type Leg } from '@/hooks/useTrips'
import { useTraewellingStatus, useTraewellingCheckin } from '@/hooks/useTraewelling'
import { ReviewPrompt } from '@/components/reviews/ReviewPrompt'
import { useLegRollingStock, useLinkRollingStock, useUnlinkRollingStock } from '@/hooks/useRollingStock'
import { RollingStockSelectorSheet } from '@/components/rolling-stock/RollingStockSelectorSheet'
import { getWagenreihungUrl } from '@/lib/wagenreihung'
import { PlatformBadge } from '@/components/ui/PlatformBadge'
import { formatDate as fmtDate, formatDelay } from '@/lib/i18n/format'

const OPERATOR_STYLES: Record<string, string> = {
  DB: 'bg-red-950 text-red-300 border-red-800',
  SBB: 'bg-red-950 text-red-200 border-red-900',
  ÖBB: 'bg-red-900 text-red-200 border-red-800',
  SNCF: 'bg-orange-950 text-orange-300 border-orange-800',
  Eurostar: 'bg-yellow-950 text-yellow-300 border-yellow-800',
  NS: 'bg-yellow-950 text-yellow-200 border-yellow-900',
  Renfe: 'bg-red-950 text-red-300 border-red-800',
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

function durationMinutes(dep: string, arr: string) {
  return Math.round((new Date(arr).getTime() - new Date(dep).getTime()) / 60000)
}

interface Props {
  leg: Leg
  tripId: string
  isExpanded: boolean
  onToggle: () => void
  onTrainClick?: (trainNumber: string, departure?: string, operator?: string | null) => void
}

export function LegCard({ leg, tripId, isExpanded, onToggle, onTrainClick }: Props) {
  const [editOpen, setEditOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [rollingStockOpen, setRollingStockOpen] = useState(false)
  const deleteLeg = useDeleteLeg(tripId)
  const updateLeg = useUpdateLeg(tripId)

  const { data: traewelling } = useTraewellingStatus()
  const checkin = useTraewellingCheckin(tripId)
  const [checkinError, setCheckinError] = useState<string | null>(null)

  const { data: legRollingStockData } = useLegRollingStock(leg.id)
  const legRollingStock = legRollingStockData?.manualLink ?? null
  const linkRollingStock = useLinkRollingStock(leg.id)
  const unlinkRollingStock = useUnlinkRollingStock(leg.id)

  const now = new Date()
  const depDateObj = new Date(leg.plannedDeparture)
  const minsUntilDep = (depDateObj.getTime() - now.getTime()) / 60000
  const canCheckIn = minsUntilDep >= -120 && minsUntilDep <= 1440
  const isCheckedIn = leg.status === 'checked_in' || leg.traewellingStatusId != null
  const isCompleted = leg.status === 'completed'

  async function handleCheckin() {
    setCheckinError(null)
    try {
      await checkin.mutateAsync(leg.id)
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setCheckinError(message)
      setTimeout(() => setCheckinError(null), 5000)
    }
  }

  async function handleComplete() {
    try {
      await updateLeg.mutateAsync({ id: leg.id, data: { status: 'completed' } })
    } catch (err) {
      console.error('Failed to complete leg:', err)
    }
  }

  async function handleLinkRollingStock(rollingStock: { id: string; series: string; operator: string; [key: string]: unknown }, setNumber?: string) {
    try {
      await linkRollingStock.mutateAsync({ rollingStockId: rollingStock.id, setNumber, source: 'manual' })
    } catch (err) {
      console.error('Failed to link rolling stock:', err)
    }
  }

  async function handleUnlinkRollingStock() {
    try {
      await unlinkRollingStock.mutateAsync()
    } catch (err) {
      console.error('Failed to unlink rolling stock:', err)
    }
  }

  const depDate = fmtDate(leg.plannedDeparture)
  const depTime = formatTime(leg.plannedDeparture)
  const arrTime = formatTime(leg.plannedArrival)
  const duration = durationMinutes(leg.plannedDeparture, leg.plannedArrival)
  const hours = Math.floor(duration / 60)
  const mins = duration % 60
  const durationStr = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
  const operatorStyle = OPERATOR_STYLES[leg.operator ?? ''] ?? 'bg-zinc-800 text-zinc-300 border-zinc-700'
  const trainLabel = leg.lineName ?? leg.trainNumber

  const wagenreihungUrl = getWagenreihungUrl({
    trainNumber: leg.trainNumber,
    lineName: leg.lineName,
    operator: leg.operator,
    originIbnr: leg.originIbnr,
    plannedDeparture: leg.plannedDeparture,
  })

  return (
    <>
      <div className="flex gap-4 group">
        {/* Timeline dot + line */}
        <div className="flex flex-col items-center">
          <div className="w-3 h-3 rounded-full bg-primary/20 border-2 border-primary mt-1 shrink-0" />
          <div className="w-px flex-1 border-l border-border my-1" />
        </div>

        {/* Card */}
        <div className="flex-1 pb-4">
          <div
            className="rounded-xl border border-border bg-card overflow-hidden"
            style={{ borderRadius: 10 }}
          >
            {/* Main row — always visible, clickable to expand */}
            <button
              onClick={onToggle}
              className="w-full text-left"
              style={{
                padding: '14px 16px',
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                gap: 12,
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                {/* Date */}
                <p style={{ fontSize: 11, color: 'hsl(var(--muted-foreground))', marginBottom: 4 }}>
                  {depDate}
                </p>

                {/* Times + stations in teal */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  fontSize: 14,
                  fontWeight: 600,
                  flexWrap: 'wrap',
                }}>
                  <span style={{ color: 'hsl(var(--foreground))' }}>{depTime}</span>
                  <span style={{ color: 'hsl(var(--primary))', fontWeight: 500 }}>{leg.originName}</span>
                  <span style={{ color: 'hsl(var(--primary))', fontSize: 12 }}>→</span>
                  <span style={{ color: 'hsl(var(--foreground))' }}>{arrTime}</span>
                  <span style={{ color: 'hsl(var(--primary))', fontWeight: 500 }}>{leg.destName}</span>
                </div>

                {/* Status badges */}
                <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap', alignItems: 'center' }}>
                  {leg.delayMinutes > 0 && (
                    <span className="tap-small flex items-center gap-1 text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded">
                      +{leg.delayMinutes} min
                    </span>
                  )}
                  <PlatformBadge planned={leg.platformPlanned} actual={leg.platformActual} />
                  {isCheckedIn && (
                    <span className="flex items-center gap-1 text-xs text-success">
                      <CheckCircle2 className="h-3 w-3" /> Eingecheckt
                    </span>
                  )}
                  {isCompleted && (
                    <span className="flex items-center gap-1 text-xs text-success">
                      <CheckCircle2 className="h-3 w-3" /> Abgeschlossen
                    </span>
                  )}
                </div>

                {/* Collapsed train info row */}
                {!isExpanded && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginTop: 8,
                    flexWrap: 'wrap',
                  }}>
                    {leg.operator && (
                      <div onClick={e => { e.stopPropagation(); onTrainClick?.(leg.trainNumber || '', leg.plannedDeparture, leg.operator) }}>
                        <Badge variant="outline" className={`text-xs px-2 py-0 ${operatorStyle}`}>
                          {leg.operator}
                        </Badge>
                      </div>
                    )}
                    {trainLabel && (
                      <span style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: 'hsl(var(--foreground))',
                        fontFamily: '"JetBrains Mono", "Fira Mono", monospace',
                      }}>
                        {trainLabel}
                      </span>
                    )}
                    <span style={{
                      fontSize: 12,
                      color: 'hsl(var(--muted-foreground))',
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3,
                    }}>
                      <Clock size={11} />
                      {durationStr}
                    </span>
                    {leg.seat && (
                      <span style={{ fontSize: 12, color: 'hsl(var(--muted-foreground))' }}>
                        Platz {leg.seat}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* Right side: edit/delete (hover) + chevron */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
                <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-white hover:bg-secondary"
                    onClick={e => { e.stopPropagation(); setEditOpen(true) }}
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-secondary"
                    onClick={e => { e.stopPropagation(); deleteLeg.mutate(leg.id) }}
                    disabled={deleteLeg.isPending}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <ChevronDown
                  size={16}
                  color="hsl(var(--muted-foreground))"
                  style={{
                    transition: 'transform 0.2s',
                    transform: isExpanded ? 'rotate(180deg)' : 'none',
                  }}
                />
              </div>
            </button>

            {/* Expanded details */}
            {isExpanded && (
              <div style={{ borderTop: '1px solid hsl(var(--border))', padding: '0 16px 14px' }}>
                {/* Stats grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 16,
                  padding: '12px 0',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Train size={13} color="hsl(var(--primary))" />
                    <div>
                      <p style={{ fontSize: 9, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, marginBottom: 2 }}>
                        Zug
                      </p>
                      <p style={{ fontSize: 13, fontWeight: 600, fontFamily: '"JetBrains Mono", "Fira Mono", monospace', color: 'hsl(var(--foreground))' }}>
                        {trainLabel ?? '–'}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Clock size={13} color="hsl(var(--primary))" />
                    <div>
                      <p style={{ fontSize: 9, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, marginBottom: 2 }}>
                        Dauer
                      </p>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--foreground))' }}>
                        {durationStr}
                      </p>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MapPin size={13} color="hsl(var(--primary))" />
                    <div>
                      <p style={{ fontSize: 9, color: 'hsl(var(--muted-foreground))', textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600, marginBottom: 2 }}>
                        Strecke
                      </p>
                      <p style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--foreground))' }}>
                        {leg.distanceKm ? `${Math.round(leg.distanceKm)} km` : '–'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Bottom row: links */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 16,
                  paddingTop: 10,
                  borderTop: '1px solid hsl(var(--border) / 0.5)',
                  flexWrap: 'wrap',
                }}>
                  {wagenreihungUrl && (
                    <a
                      href={wagenreihungUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: 12, color: 'hsl(var(--muted-foreground))', textDecoration: 'none',
                      }}
                    >
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                        <rect x="1" y="3" width="10" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.2" />
                        <line x1="4" y1="3" x2="4" y2="10" stroke="currentColor" strokeWidth="0.8" />
                        <line x1="8" y1="3" x2="8" y2="10" stroke="currentColor" strokeWidth="0.8" />
                      </svg>
                      Wagenreihung
                    </a>
                  )}

                  <button
                    onClick={e => { e.stopPropagation(); setRollingStockOpen(true) }}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontSize: 12, color: 'hsl(var(--muted-foreground))',
                      background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                    }}
                  >
                    <Plus size={11} />
                    {legRollingStock ? 'Zugtyp ändern' : 'Zugtyp verknüpfen'}
                  </button>

                  {traewelling?.connected && !isCheckedIn && canCheckIn && (
                    <button
                      onClick={e => { e.stopPropagation(); handleCheckin() }}
                      disabled={checkin.isPending}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: 12,
                        color: checkin.isPending ? 'hsl(var(--muted-foreground))' : 'hsl(var(--primary))',
                        background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                        marginLeft: 'auto',
                      }}
                    >
                      {checkin.isPending
                        ? <Loader2 size={11} className="animate-spin" />
                        : (
                          <svg width="11" height="11" viewBox="0 0 12 12" fill="none">
                            <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.2" />
                            <path d="M4 6l1.5 1.5L8 4" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      {checkin.isPending ? 'Eincheckend…' : 'Träwelling Check-in'}
                    </button>
                  )}

                  {isCheckedIn && !isCompleted && (
                    <button
                      onClick={e => { e.stopPropagation(); handleComplete() }}
                      disabled={updateLeg.isPending}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: 12, color: 'hsl(var(--primary))',
                        background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                        marginLeft: 'auto',
                      }}
                    >
                      <CheckCircle2 size={11} />
                      Als abgeschlossen markieren
                    </button>
                  )}

                  {isCompleted && (
                    <button
                      onClick={e => { e.stopPropagation(); setReviewOpen(true) }}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: 12, color: 'hsl(var(--primary))',
                        background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                        marginLeft: 'auto',
                      }}
                    >
                      Bewerten
                    </button>
                  )}
                </div>

                {checkinError && (
                  <p style={{ fontSize: 11, color: 'hsl(var(--destructive))', marginTop: 6 }}>
                    {checkinError}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      <LegEditorSheet tripId={tripId} open={editOpen} onOpenChange={setEditOpen} leg={leg} />

      <ReviewPrompt
        open={reviewOpen}
        onOpenChange={setReviewOpen}
        leg={{
          id: leg.id,
          originName: leg.originName,
          destName: leg.destName,
          originIbnr: leg.originIbnr,
          destIbnr: leg.destIbnr,
          operator: leg.operator,
          trainType: leg.trainType,
        }}
        onComplete={() => {}}
      />

      <RollingStockSelectorSheet
        open={rollingStockOpen}
        onOpenChange={setRollingStockOpen}
        operator={leg.operator || undefined}
        onSelect={handleLinkRollingStock}
        currentSelection={legRollingStock ? {
          rollingStockId: legRollingStock.rollingStockId,
          setNumber: legRollingStock.setNumber || undefined,
        } : undefined}
      />
    </>
  )
}
