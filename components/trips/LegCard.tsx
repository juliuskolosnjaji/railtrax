'use client'

import { useState } from 'react'
import { Pencil, Trash2, Clock, MapPin, Train, ChevronDown, CheckCircle2, Loader2, ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LegEditorSheet } from './LegEditorSheet'
import { useDeleteLeg, useUpdateLeg, type Leg } from '@/hooks/useTrips'
import { useTraewellingStatus, useTraewellingCheckin, useTraewellingAutoCheckinPreference } from '@/hooks/useTraewelling'
import { ReviewPrompt } from '@/components/reviews/ReviewPrompt'
import { formatDate as fmtDate } from '@/lib/i18n/format'
import { useJourneyNumber } from '@/hooks/useJourneyNumber'

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

// ── Platform pill component ─────────────────────────────────────────────────

function PlatformPill({ value, changed }: { value: string; changed: boolean }) {
  return (
    <span className="inline-flex items-center gap-1 shrink-0" style={{
      height: 22,
      padding: '0 6px',
      borderRadius: 4,
      background: changed ? 'hsl(var(--destructive) / 0.12)' : 'hsl(var(--primary) / 0.1)',
      border: `1px solid ${changed ? 'hsl(var(--destructive) / 0.3)' : 'hsl(var(--primary) / 0.2)'}`,
      fontSize: 10,
      fontWeight: 700,
      fontFamily: '"JetBrains Mono", "Fira Mono", monospace',
      color: changed ? 'hsl(var(--destructive))' : 'hsl(var(--primary))',
      letterSpacing: '0.3px',
    }}>
      {value}
    </span>
  )
}

// ── Main card ────────────────────────────────────────────────────────────────

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
  const deleteLeg = useDeleteLeg(tripId)
  const updateLeg = useUpdateLeg(tripId)

  const { data: traewelling } = useTraewellingStatus()
  const { query: autoCheckinPref } = useTraewellingAutoCheckinPreference()
  const checkin = useTraewellingCheckin(tripId)
  const [checkinError, setCheckinError] = useState<string | null>(null)

  const now = new Date()
  const depDateObj = new Date(leg.plannedDeparture)
  const minsUntilDep = (depDateObj.getTime() - now.getTime()) / 60000
  const canCheckIn = minsUntilDep >= -120 && minsUntilDep <= 1440
  const isCheckedIn = leg.status === 'checked_in' || leg.traewellingStatusId != null
  const isCompleted = leg.status === 'completed'

  async function handleCheckin() {
    setCheckinError(null)
    try { await checkin.mutateAsync(leg.id) }
    catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error'
      setCheckinError(message)
      setTimeout(() => setCheckinError(null), 5000)
    }
  }

  async function handleComplete() {
    try { await updateLeg.mutateAsync({ id: leg.id, data: { status: 'completed' } }) }
    catch (err) { console.error('Failed to complete leg:', err) }
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

  const { data: journeyData } = useJourneyNumber(leg.id, isExpanded)
  const journeyNumber = leg.journeyNumber ?? journeyData?.journeyNumber ?? null
  const trainDisplay = journeyNumber && trainLabel
    ? `${trainLabel} (${journeyNumber})`
    : (trainLabel ?? null)

  // ── Platform resolution ──────────────────────────────────────────────────
  // Prefer actual (real-time) platform, fall back to planned.
  // Show change indicator when planned ≠ actual.
  const depPlatform = leg.platformActual ?? leg.platformPlanned
  const arrPlatform = leg.arrivalPlatformActual ?? leg.arrivalPlatformPlanned
  const depPlatformChanged = !!(leg.platformActual && leg.platformPlanned && leg.platformActual !== leg.platformPlanned)
  const arrPlatformChanged = !!(leg.arrivalPlatformActual && leg.arrivalPlatformPlanned && leg.arrivalPlatformActual !== leg.arrivalPlatformPlanned)

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
          <div className="rounded-xl border border-border bg-card overflow-hidden" style={{ borderRadius: 10 }}>
            {/* Main row — always visible */}
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
                <p style={{ fontSize: 11, color: 'hsla(var(--muted-foreground))', marginBottom: 6 }}>
                  {depDate}
                </p>

                {/* Departure row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: 'hsl(var(--foreground))', fontVariantNumeric: 'tabular-nums' }}>
                    {depTime}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--foreground))' }}>
                    {leg.originName}
                  </span>
                  {depPlatform && (
                    <PlatformPill value={`Gl. ${depPlatform}`} changed={depPlatformChanged} />
                  )}
                </div>

                {/* Connector line + arrow */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '2px 0' }}>
                  <span style={{ width: 8, height: 2, borderRadius: 1 }} />
                  <ArrowRight size={12} style={{ color: 'hsl(var(--muted-foreground) / 0.4)' }} />
                </div>

                {/* Arrival row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16, fontWeight: 700, color: 'hsl(var(--foreground))', fontVariantNumeric: 'tabular-nums' }}>
                    {arrTime}
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'hsl(var(--foreground))' }}>
                    {leg.destName}
                  </span>
                  {arrPlatform && (
                    <PlatformPill
                      value={`Gl. ${arrPlatform}`}
                      changed={arrPlatformChanged}
                    />
                  )}
                </div>

                {/* Status badges row */}
                <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  {leg.delayMinutes > 0 && (
                    <span className="tap-small flex items-center gap-1 text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded">
                      +{leg.delayMinutes} min
                    </span>
                  )}
                  {isCheckedIn && (
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      fontSize: 11, fontWeight: 600,
                      color: '#cc1f3a',
                      background: 'rgba(204,31,58,0.08)',
                      border: '1px solid rgba(204,31,58,0.2)',
                      borderRadius: 5, padding: '1px 6px',
                    }}>
                      <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                        <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.4" />
                        <path d="M3.5 6l1.8 1.8L8.5 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                      Träwelling
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
                    {trainDisplay && (
                      <span style={{
                        fontSize: 12,
                        fontWeight: 500,
                        color: 'hsl(var(--foreground))',
                        fontFamily: '"JetBrains Mono", "Fira Mono", monospace',
                      }}>
                        {trainDisplay}
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
                        {trainDisplay ?? '–'}
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
                  {traewelling?.connected && !isCheckedIn && canCheckIn && (
                    <button
                      onClick={e => { e.stopPropagation(); handleCheckin() }}
                      disabled={checkin.isPending}
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 5,
                        fontSize: 11, fontWeight: 600,
                        color: checkin.isPending ? 'hsl(var(--muted-foreground))' : '#cc1f3a',
                        background: checkin.isPending ? 'hsl(var(--secondary))' : 'rgba(204,31,58,0.08)',
                        border: `1px solid ${checkin.isPending ? 'hsl(var(--border))' : 'rgba(204,31,58,0.25)'}`,
                        borderRadius: 6, padding: '4px 10px',
                        cursor: checkin.isPending ? 'default' : 'pointer',
                        marginLeft: 'auto', transition: 'opacity 0.15s',
                      }}
                    >
                      {checkin.isPending
                        ? <Loader2 size={10} className="animate-spin" />
                        : (
                          <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                            <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.4" />
                            <path d="M3.5 6l1.8 1.8L8.5 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      {checkin.isPending ? 'Eincheckend…' : autoCheckinPref.data?.autoCheckin ? 'Jetzt einchecken' : 'Träwelling Check-in'}
                    </button>
                  )}

                  {isCheckedIn && !isCompleted && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 'auto' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        fontSize: 11, fontWeight: 600,
                        color: '#cc1f3a',
                        background: 'rgba(204,31,58,0.08)',
                        border: '1px solid rgba(204,31,58,0.2)',
                        borderRadius: 6, padding: '4px 10px',
                      }}>
                        <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                          <circle cx="6" cy="6" r="5" stroke="currentColor" strokeWidth="1.4" />
                          <path d="M3.5 6l1.8 1.8L8.5 4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                        Eingecheckt
                      </span>
                      <button
                        onClick={e => { e.stopPropagation(); handleComplete() }}
                        disabled={updateLeg.isPending}
                        style={{
                          display: 'inline-flex', alignItems: 'center', gap: 4,
                          fontSize: 11, color: 'hsl(var(--muted-foreground))',
                          background: 'none', border: 'none', padding: 0, cursor: 'pointer',
                        }}
                      >
                        <CheckCircle2 size={11} />
                        Abschließen
                      </button>
                    </div>
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
    </>
  )
}
