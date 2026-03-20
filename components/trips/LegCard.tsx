'use client'

import { useState } from 'react'
import { ArrowRight, Pencil, Trash2, Clock, AlertTriangle, Loader2, CheckCircle2, Star, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LegEditorSheet } from './LegEditorSheet'
import { useDeleteLeg, useUpdateLeg, type Leg } from '@/hooks/useTrips'
import { useTraewellingStatus, useTraewellingCheckin } from '@/hooks/useTraewelling'
import { ReviewPrompt } from '@/components/reviews/ReviewPrompt'
import { useLegRollingStock, useFormation, useLinkRollingStock, useUnlinkRollingStock } from '@/hooks/useRollingStock'
import { RollingStockChip } from '@/components/rolling-stock/RollingStockChip'
import { RollingStockSelectorSheet } from '@/components/rolling-stock/RollingStockSelectorSheet'
import { StaticRollingStockChip } from '@/components/rolling-stock/StaticRollingStockChip'
import { identifyRollingStock } from '@/lib/rollingStock'
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

export function LegCard({ leg, tripId, onTrainClick }: { leg: Leg; tripId: string; onTrainClick?: (trainNumber: string, departure?: string, operator?: string | null) => void }) {
  const [editOpen, setEditOpen] = useState(false)
  const [reviewOpen, setReviewOpen] = useState(false)
  const [rollingStockOpen, setRollingStockOpen] = useState(false)
  const deleteLeg = useDeleteLeg(tripId)
  const updateLeg = useUpdateLeg(tripId)

  const { data: traewelling } = useTraewellingStatus()
  const checkin = useTraewellingCheckin(tripId)
  const [checkinError, setCheckinError] = useState<string | null>(null)

  // Rolling stock data and mutations
  const { data: legRollingStockData } = useLegRollingStock(leg.id)
  const legRollingStock = legRollingStockData?.manualLink ?? null
  const linkRollingStock = useLinkRollingStock(leg.id)
  const unlinkRollingStock = useUnlinkRollingStock(leg.id)

  // Formation — live API (Marudor/SwissOTD/NS/SNCF/RTT) with static fallback.
  // Falls back to instant client-side lookup while the server query is in-flight.
  const { data: formation } = useFormation(leg.id)
  const instantFallback = identifyRollingStock(leg)
  // Convert instantFallback to a minimal FormationResult shape so the chip can render immediately
  const displayFormation = formation ?? (instantFallback ? {
    series: instantFallback.name,
    operator: instantFallback.operator,
    topSpeedKmh: instantFallback.topSpeed,
    hasWifi: instantFallback.hasWifi,
    hasBistro: instantFallback.hasBistro,
    hasBike: instantFallback.hasBike,
    hasWheelchair: false,
    description: instantFallback.description,
    wikipediaUrl: instantFallback.wikiUrl ?? null,
    imageUrl: null,
    source: 'static' as const,
    trainName: null,
  } : null)

  const now = new Date()
  const depDateObj = new Date(leg.plannedDeparture)
  const minsUntilDep = (depDateObj.getTime() - now.getTime()) / 60000
  // Allow check-in from 2 hours before departure up to 24 hours in advance (very loose for testing)
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
      await linkRollingStock.mutateAsync({
        rollingStockId: rollingStock.id,
        setNumber,
        source: 'manual',
      })
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
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            {/* Header row */}
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <p className="text-xs text-muted-foreground">{depDate}</p>
                <div className="flex items-center gap-2 text-sm font-medium text-white">
                  <span>{depTime} {leg.originName}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-[#1e3a6e] shrink-0" />
                  <span>{arrTime} {leg.destName}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-white hover:bg-secondary"
                  onClick={() => setEditOpen(true)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-secondary"
                  onClick={() => deleteLeg.mutate(leg.id)}
                  disabled={deleteLeg.isPending}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Meta row */}
            <div className="flex items-center gap-2 flex-wrap">
              {leg.operator && (
                <div 
                  onClick={() => onTrainClick?.(leg.trainNumber || '', leg.plannedDeparture, leg.operator)}
                  className="cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <Badge variant="outline" className={`text-xs px-2 py-0 ${operatorStyle}`}>
                    {leg.operator}
                  </Badge>
                </div>
              )}
              {leg.trainNumber && (
                <span 
                  onClick={() => onTrainClick?.(leg.trainNumber!, leg.plannedDeparture, leg.operator)}
                  className="text-xs text-secondary-foreground cursor-pointer hover:text-primary transition-colors"
                >
                  {leg.trainNumber}
                </span>
              )}
              {displayFormation && (
                <StaticRollingStockChip formation={displayFormation} />
              )}
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                {durationStr}
              </span>
              <PlatformBadge planned={leg.platformPlanned} actual={leg.platformActual} />
              {leg.delayMinutes > 0 && (
                <span className="tap-small flex items-center gap-1 text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded">
                  <AlertTriangle className="h-3 w-3" />
                  {formatDelay(leg.delayMinutes)}
                </span>
              )}
              {leg.seat && (
                <span className="text-xs text-muted-foreground">Platz: {leg.seat}</span>
              )}
            </div>

            {/* Wagenreihung + Rolling Stock - inline on mobile */}
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Wagenreihung */}
              {(() => {
                const url = getWagenreihungUrl({
                  trainNumber: leg.trainNumber,
                  lineName: leg.lineName,
                  operator: leg.operator,
                  originIbnr: leg.originIbnr,
                  plannedDeparture: leg.plannedDeparture,
                })
                return url ? (
                  <a
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 5,
                      fontSize: 12, color: 'hsl(var(--muted-foreground))', textDecoration: 'none',
                      padding: '3px 0',
                    }}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="1" y="10" width="22" height="10" rx="2" />
                      <path d="M5 10V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3" />
                      <circle cx="7" cy="20" r="2" />
                      <circle cx="17" cy="20" r="2" />
                    </svg>
                    Wagenreihung
                  </a>
                ) : null
              })()}

              {/* Rolling Stock */}
              {legRollingStock && legRollingStock.rollingStock ? (
                <div className="flex items-center gap-2">
                  <RollingStockChip
                    rollingStock={legRollingStock.rollingStock}
                    setNumber={legRollingStock.setNumber}
                    confirmed={legRollingStock.confirmed}
                    onClick={() => setRollingStockOpen(true)}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleUnlinkRollingStock}
                    disabled={unlinkRollingStock.isPending}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ) : (
                <button
                  onClick={() => setRollingStockOpen(true)}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
                >
                  <Plus size={10} />
                  Zugtyp verknüpfen
                </button>
              )}
            </div>

            {traewelling?.connected && leg.status === 'planned' && canCheckIn && !isCheckedIn && (
              <div className="pt-2 border-t border-border mt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCheckin}
                  disabled={checkin.isPending}
                  className="w-full sm:w-auto bg-transparent text-[#e25555] hover:bg-destructive/10 border-destructive rounded-lg h-8 font-medium transition-colors"
                >
                  {checkin.isPending ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-2" />}
                  Bei Träwelling einchecken
                </Button>
                {checkinError && (
                  <p className="text-xs text-[#e25555] mt-2">{checkinError}</p>
                )}
              </div>
            )}
            {isCheckedIn && !isCompleted && (
               <div className="pt-2 border-t border-border mt-1 flex flex-col gap-2">
                  <div className="flex items-center gap-1.5 text-success text-sm font-medium">
                     <CheckCircle2 className="h-4 w-4" /> Eingecheckt
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleComplete}
                    disabled={updateLeg.isPending}
                    className="w-full sm:w-auto bg-success/10 text-success hover:bg-success/15 border-success/30 h-8 font-medium transition-colors"
                  >
                    {updateLeg.isPending ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-2" />}
                    Als abgeschlossen markieren
                  </Button>
               </div>
            )}
            {isCompleted && (
               <div className="pt-2 border-t border-border mt-1 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-success text-sm font-medium">
                     <CheckCircle2 className="h-4 w-4" /> Abgeschlossen
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setReviewOpen(true)}
                    className="text-yellow-400 hover:text-yellow-300 hover:bg-yellow-950/30"
                  >
                    <Star className="h-3.5 w-3.5 mr-1.5" />
                    Bewerten
                  </Button>
               </div>
            )}
          </div>
        </div>
      </div>

      <LegEditorSheet
        tripId={tripId}
        open={editOpen}
        onOpenChange={setEditOpen}
        leg={leg}
      />

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
