'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Plus, Trash2, GripVertical, Calendar, Clock, Save } from 'lucide-react'
import { useTrip, useUpdateTrip, useUpdateLeg, useDeleteLeg, type Leg } from '@/hooks/useTrips'
import { LegEditorSheet } from '@/components/trips/LegEditorSheet'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'

const STATUS_OPTIONS = [
  { value: 'planned',   label: 'Geplant' },
  { value: 'active',    label: 'Aktiv' },
  { value: 'completed', label: 'Abgeschlossen' },
] as const

// Extract "YYYY-MM-DD" from ISO string (treating stored value as UTC)
function isoToDate(iso: string | null | undefined): string {
  if (!iso) return ''
  return iso.slice(0, 10)
}

// Extract "HH:MM" from ISO string (treating stored value as UTC)
function isoToTime(iso: string | null | undefined): string {
  if (!iso) return ''
  return iso.slice(11, 16)
}

// Combine back to ISO (UTC)
function combineToISO(date: string, time: string): string {
  if (!date || !time) return ''
  return `${date}T${time}:00.000Z`
}

interface LegFormState {
  originName: string
  destName: string
  trainNumber: string
  date: string
  depTime: string
  arrTime: string
  dirty: boolean
}

export default function TripEditPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: trip, isLoading } = useTrip(id)
  const updateTrip = useUpdateTrip(id)
  const updateLeg = useUpdateLeg(id)
  const deleteLeg = useDeleteLeg(id)

  // Trip metadata form
  const [title, setTitle] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [status, setStatus] = useState<string>('planned')

  // Legs
  const [expandedLegId, setExpandedLegId] = useState<string | null>(null)
  const [legForms, setLegForms] = useState<Record<string, LegFormState>>({})
  const [addLegOpen, setAddLegOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [apiError, setApiError] = useState<string | null>(null)

  useEffect(() => {
    if (trip) {
      setTitle(trip.title || '')
      setStartDate(isoToDate(trip.startDate))
      setEndDate(isoToDate(trip.endDate))
      setStatus(trip.status || 'planned')
    }
  }, [trip])

  function initLegForm(leg: Leg): LegFormState {
    return {
      originName: leg.originName,
      destName: leg.destName,
      trainNumber: leg.trainNumber || '',
      date: isoToDate(leg.plannedDeparture),
      depTime: isoToTime(leg.plannedDeparture),
      arrTime: isoToTime(leg.plannedArrival),
      dirty: false,
    }
  }

  function handleExpandLeg(leg: Leg) {
    if (expandedLegId === leg.id) {
      setExpandedLegId(null)
      return
    }
    setExpandedLegId(leg.id)
    if (!legForms[leg.id]) {
      setLegForms(prev => ({ ...prev, [leg.id]: initLegForm(leg) }))
    }
  }

  function updateLegForm(legId: string, field: keyof Omit<LegFormState, 'dirty'>, value: string) {
    setLegForms(prev => ({
      ...prev,
      [legId]: { ...prev[legId], [field]: value, dirty: true },
    }))
  }

  async function handleSave() {
    setApiError(null)
    setIsSaving(true)
    try {
      // Save trip metadata
      await updateTrip.mutateAsync({
        title,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        status: status as any,
      })
      // Save dirty legs
      const dirtyLegs = Object.entries(legForms).filter(([, f]) => f.dirty)
      await Promise.all(
        dirtyLegs.map(([legId, form]) =>
          updateLeg.mutateAsync({
            id: legId,
            data: {
              originName: form.originName,
              destName: form.destName,
              trainNumber: form.trainNumber || undefined,
              plannedDeparture: combineToISO(form.date, form.depTime),
              plannedArrival: combineToISO(form.date, form.arrTime),
            },
          })
        )
      )
      router.push(`/trips/${id}`)
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Fehler beim Speichern')
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 space-y-4 max-w-3xl mx-auto">
        <Skeleton className="h-8 w-64 bg-[#0d1f3c]" />
        <Skeleton className="h-[200px] rounded-xl bg-[#0d1f3c] mt-6" />
        <Skeleton className="h-[400px] rounded-xl bg-[#0d1f3c]" />
      </div>
    )
  }

  if (!trip) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Reise nicht gefunden.</p>
      </div>
    )
  }

  return (
    <div className="p-8 max-w-3xl mx-auto w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex flex-col gap-1">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors w-fit"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Zurück
          </button>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Reise bearbeiten</h1>
        </div>
        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
          style={{ border: 'none', cursor: 'pointer' }}
        >
          <Save className="w-4 h-4" />
          {isSaving ? 'Speichern…' : 'Speichern'}
        </button>
      </div>

      {apiError && (
        <div className="mb-4 text-xs text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2">
          {apiError}
        </div>
      )}

      {/* Trip details card */}
      <div className="rounded-xl border border-[#1e2d4a] bg-[#0a1628] p-6 mb-4">
        <p className="text-[11px] font-semibold uppercase tracking-wider text-[#4a6a9a] mb-5">
          Reisedetails
        </p>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[#8ba3c7] text-xs">Reisename</Label>
            <Input
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="bg-[#060c18] border-[#1e2d4a] text-white"
              placeholder="Interrail Sommer 2026"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-[#8ba3c7] text-xs flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-[#4a6a9a]" />
                Startdatum
              </Label>
              <Input
                type="date"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
                className="bg-[#060c18] border-[#1e2d4a] text-white"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[#8ba3c7] text-xs flex items-center gap-1.5">
                <Calendar className="w-3 h-3 text-[#4a6a9a]" />
                Enddatum
              </Label>
              <Input
                type="date"
                value={endDate}
                onChange={e => setEndDate(e.target.value)}
                className="bg-[#060c18] border-[#1e2d4a] text-white"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-[#8ba3c7] text-xs">Status</Label>
            <div className="flex gap-2">
              {STATUS_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setStatus(opt.value)}
                  className={[
                    'px-4 py-1.5 rounded-lg text-sm font-medium transition-colors border',
                    status === opt.value
                      ? 'bg-primary text-primary-foreground border-primary'
                      : 'bg-transparent text-muted-foreground border-[#1e2d4a] hover:border-[#2e3d5a] hover:text-foreground',
                  ].join(' ')}
                  style={{ cursor: 'pointer' }}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Legs card */}
      <div className="rounded-xl border border-[#1e2d4a] bg-[#0a1628] p-6">
        <div className="flex items-start justify-between mb-5">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-[#4a6a9a]">
              Reiseabschnitte
            </p>
            <p className="text-[11px] text-[#4a6a9a] mt-0.5">
              Ziehen zum Sortieren · Klicken zum Bearbeiten
            </p>
          </div>
          <button
            onClick={() => setAddLegOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
            style={{ border: 'none', cursor: 'pointer' }}
          >
            <Plus className="w-3.5 h-3.5" />
            Abschnitt
          </button>
        </div>

        {/* Route dots visualization */}
        {trip.legs.length > 0 && (
          <div className="flex items-start mb-6 overflow-x-auto pb-1">
            {trip.legs.map((leg, i) => (
              <div key={leg.id} className="flex items-center shrink-0">
                <div className="flex flex-col items-center gap-1">
                  <div
                    className={`w-2.5 h-2.5 rounded-full border-2 ${
                      i === 0
                        ? 'bg-primary border-primary'
                        : 'bg-[#060c18] border-[#4a6a9a]'
                    }`}
                  />
                  <span className="text-[10px] text-[#4a6a9a] text-center w-14 truncate">
                    {leg.originName}
                  </span>
                </div>
                <div className="h-px w-12 bg-[#1e2d4a] mb-4 shrink-0" />
              </div>
            ))}
            {/* Last station */}
            <div className="flex flex-col items-center gap-1 shrink-0">
              <div className="w-2.5 h-2.5 rounded-full border-2 bg-primary border-primary" />
              <span className="text-[10px] text-[#4a6a9a] text-center w-14 truncate">
                {trip.legs[trip.legs.length - 1].destName}
              </span>
            </div>
          </div>
        )}

        {/* Leg list */}
        <div className="space-y-2">
          {trip.legs.length === 0 && (
            <div className="text-center py-10 rounded-xl border border-dashed border-[#1e2d4a]">
              <p className="text-[#4a6a9a] text-sm">Noch keine Abschnitte.</p>
            </div>
          )}

          {trip.legs.map((leg, idx) => {
            const isExpanded = expandedLegId === leg.id
            const form = legForms[leg.id]
            const depTime = leg.plannedDeparture.slice(11, 16)
            const arrTime = leg.plannedArrival.slice(11, 16)

            return (
              <div
                key={leg.id}
                className={`rounded-xl border transition-colors ${
                  isExpanded
                    ? 'border-primary/40 bg-[#0d1a2e]'
                    : 'border-[#1e2d4a] bg-[#060c18]'
                }`}
              >
                {/* Collapsed row */}
                <div
                  className="flex items-center gap-3 p-4 cursor-pointer select-none"
                  onClick={() => handleExpandLeg(leg)}
                >
                  <GripVertical className="w-4 h-4 text-[#2e3d5a] shrink-0 cursor-grab" />
                  <span className="w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-white truncate">
                      {leg.originName} → {leg.destName}
                    </p>
                    <p className="text-xs text-[#4a6a9a] mt-0.5">
                      {[leg.trainNumber, `${depTime} – ${arrTime}`].filter(Boolean).join('  ')}
                    </p>
                  </div>
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      deleteLeg.mutate(leg.id)
                    }}
                    className="w-7 h-7 flex items-center justify-center text-[#2e3d5a] hover:text-[#e25555] transition-colors rounded"
                    style={{ background: 'transparent', border: 'none', cursor: 'pointer' }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Expanded form */}
                {isExpanded && (
                  <div className="px-4 pb-4 pt-3 border-t border-[#1e2d4a] space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[#8ba3c7] text-xs flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                          Von
                        </Label>
                        <Input
                          value={form?.originName ?? leg.originName}
                          onChange={e => updateLegForm(leg.id, 'originName', e.target.value)}
                          className="bg-[#080d1a] border-[#1e2d4a] text-white h-9"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[#8ba3c7] text-xs flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                          Nach
                        </Label>
                        <Input
                          value={form?.destName ?? leg.destName}
                          onChange={e => updateLegForm(leg.id, 'destName', e.target.value)}
                          className="bg-[#080d1a] border-[#1e2d4a] text-white h-9"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[#8ba3c7] text-xs flex items-center gap-1.5">
                          <span className="text-[#4a6a9a] text-xs leading-none">≡</span>
                          Zugnummer
                        </Label>
                        <Input
                          value={form?.trainNumber ?? leg.trainNumber ?? ''}
                          onChange={e => updateLegForm(leg.id, 'trainNumber', e.target.value)}
                          className="bg-[#080d1a] border-[#1e2d4a] text-white h-9"
                          placeholder="ICE 724"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[#8ba3c7] text-xs flex items-center gap-1.5">
                          <Calendar className="w-3 h-3 text-[#4a6a9a]" />
                          Datum
                        </Label>
                        <Input
                          type="date"
                          value={form?.date ?? isoToDate(leg.plannedDeparture)}
                          onChange={e => updateLegForm(leg.id, 'date', e.target.value)}
                          className="bg-[#080d1a] border-[#1e2d4a] text-white h-9"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <Label className="text-[#8ba3c7] text-xs flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-[#4a6a9a]" />
                          Abfahrt
                        </Label>
                        <Input
                          type="time"
                          value={form?.depTime ?? isoToTime(leg.plannedDeparture)}
                          onChange={e => updateLegForm(leg.id, 'depTime', e.target.value)}
                          className="bg-[#080d1a] border-[#1e2d4a] text-white h-9"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[#8ba3c7] text-xs flex items-center gap-1.5">
                          <Clock className="w-3 h-3 text-[#4a6a9a]" />
                          Ankunft
                        </Label>
                        <Input
                          type="time"
                          value={form?.arrTime ?? isoToTime(leg.plannedArrival)}
                          onChange={e => updateLegForm(leg.id, 'arrTime', e.target.value)}
                          className="bg-[#080d1a] border-[#1e2d4a] text-white h-9"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <LegEditorSheet tripId={id} open={addLegOpen} onOpenChange={setAddLegOpen} />
    </div>
  )
}
