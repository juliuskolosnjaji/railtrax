'use client'

import { useState } from 'react'
import { ArrowRight, Pencil, Trash2, Clock, AlertTriangle, Loader2, CheckCircle2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { LegEditorSheet } from './LegEditorSheet'
import { useDeleteLeg, type Leg } from '@/hooks/useTrips'
import { useTraewellingStatus, useTraewellingCheckin } from '@/hooks/useTraewelling'

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

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
}

function durationMinutes(dep: string, arr: string) {
  return Math.round((new Date(arr).getTime() - new Date(dep).getTime()) / 60000)
}

export function LegCard({ leg, tripId }: { leg: Leg; tripId: string }) {
  const [editOpen, setEditOpen] = useState(false)
  const deleteLeg = useDeleteLeg(tripId)

  const { data: traewelling } = useTraewellingStatus()
  const checkin = useTraewellingCheckin(tripId)
  const [checkinError, setCheckinError] = useState<string | null>(null)

  const now = new Date()
  const depDateObj = new Date(leg.plannedDeparture)
  const minsUntilDep = (depDateObj.getTime() - now.getTime()) / 60000
  // Allow check-in from 2 hours before departure up to 24 hours in advance (very loose for testing)
  const canCheckIn = minsUntilDep >= -120 && minsUntilDep <= 1440
  const isCheckedIn = leg.status === 'checked_in' || leg.traewellingStatusId != null

  async function handleCheckin() {
    setCheckinError(null)
    try {
      await checkin.mutateAsync(leg.id)
    } catch (err: any) {
      setCheckinError(err.message)
      setTimeout(() => setCheckinError(null), 5000)
    }
  }

  const depDate = formatDate(leg.plannedDeparture)
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
          <div className="w-2.5 h-2.5 rounded-full bg-zinc-500 mt-1.5 shrink-0" />
          <div className="w-px flex-1 bg-zinc-800 my-1" />
        </div>

        {/* Card */}
        <div className="flex-1 pb-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-4 space-y-3">
            {/* Header row */}
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <p className="text-xs text-zinc-500">{depDate}</p>
                <div className="flex items-center gap-2 text-sm font-medium text-white">
                  <span>{depTime} {leg.originName}</span>
                  <ArrowRight className="h-3.5 w-3.5 text-zinc-600 shrink-0" />
                  <span>{arrTime} {leg.destName}</span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-zinc-500 hover:text-white hover:bg-zinc-800"
                  onClick={() => setEditOpen(true)}
                >
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-zinc-500 hover:text-red-400 hover:bg-zinc-800"
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
                <Badge variant="outline" className={`text-xs px-2 py-0 ${operatorStyle}`}>
                  {leg.operator}
                </Badge>
              )}
              {leg.trainNumber && (
                <span className="text-xs text-zinc-400">{leg.trainNumber}</span>
              )}
              <span className="flex items-center gap-1 text-xs text-zinc-500">
                <Clock className="h-3 w-3" />
                {durationStr}
              </span>
              {leg.delayMinutes > 0 && (
                <span className="flex items-center gap-1 text-xs text-amber-400">
                  <AlertTriangle className="h-3 w-3" />
                  +{leg.delayMinutes} min
                </span>
              )}
              {leg.seat && (
                <span className="text-xs text-zinc-500">Seat: {leg.seat}</span>
              )}
            </div>

            {traewelling?.connected && leg.status === 'planned' && canCheckIn && !isCheckedIn && (
              <div className="pt-2 border-t border-zinc-800/80 mt-1">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCheckin}
                  disabled={checkin.isPending}
                  className="w-full sm:w-auto bg-[#cc1f3a]/10 text-[#cc1f3a] hover:bg-[#cc1f3a]/20 hover:text-[#cc1f3a] border-[#cc1f3a]/30 h-8 font-medium transition-colors"
                >
                  {checkin.isPending ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5 mr-2" />}
                  Check in to Träwelling
                </Button>
                {checkinError && (
                  <p className="text-xs text-red-400 mt-2">{checkinError}</p>
                )}
              </div>
            )}
            {isCheckedIn && (
               <div className="pt-2 border-t border-zinc-800/80 mt-1 flex items-center gap-1.5 text-emerald-400 text-sm font-medium">
                  <CheckCircle2 className="h-4 w-4" /> Checked in
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
    </>
  )
}
