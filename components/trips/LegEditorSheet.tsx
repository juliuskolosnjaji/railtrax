'use client'

import { useEffect, useRef, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQuery } from '@tanstack/react-query'
import { createLegSchema, OPERATORS, type CreateLegInput } from '@/lib/validators/leg'
import { useCreateLeg, useUpdateLeg, type Leg, apiFetch } from '@/hooks/useTrips'
import { useDebounce } from '@/hooks/useDebounce'
import type { HafasStation, HafasDeparture, HafasJourney } from '@/lib/hafas-types'
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'

// ─── Types ────────────────────────────────────────────────────────────────────

type Tab = 'departures' | 'train' | 'manual'

interface LegEditorSheetProps {
  tripId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pass a leg to edit, omit to create */
  leg?: Leg
}

// ─── Formatting helpers ───────────────────────────────────────────────────────

function fmtTime(iso: string | null): string {
  if (!iso) return '--:--'
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
}

function fmtDelay(seconds: number): string {
  if (!seconds) return ''
  const mins = Math.round(seconds / 60)
  return mins > 0 ? `+${mins}` : `${mins}`
}

function fmtDuration(dep: string | null, arr: string | null): string {
  if (!dep || !arr) return ''
  const mins = Math.round((new Date(arr).getTime() - new Date(dep).getTime()) / 60000)
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

function trainBadgeClass(lineName: string): string {
  const n = lineName.toUpperCase()
  if (n.startsWith('ICE') || n.startsWith('TGV') || n.startsWith('EC'))
    return 'bg-red-900 text-red-200 border-red-800'
  if (n.startsWith('IC') || n.startsWith('IR'))
    return 'bg-orange-900 text-orange-200 border-orange-800'
  if (n.startsWith('RE') || n.startsWith('RB') || n.startsWith('NJ'))
    return 'bg-blue-900 text-blue-200 border-blue-800'
  if (n.startsWith('S'))
    return 'bg-emerald-900 text-emerald-200 border-emerald-800'
  return 'bg-zinc-800 text-zinc-300 border-zinc-700'
}

function inferOperator(name: string | null): typeof OPERATORS[number] | undefined {
  if (!name) return undefined
  const n = name.toLowerCase()
  if (n.includes('db') || n.includes('ice') || n.includes(' ic') || n.includes('ec')) return 'DB'
  if (n.includes('sbb') || n.includes('schweizer')) return 'SBB'
  if (n.includes('öbb') || n.includes('oebb') || n.includes('austrian')) return 'ÖBB'
  if (n.includes('sncf')) return 'SNCF'
  if (n.includes('eurostar')) return 'Eurostar'
  if (n.includes(' ns') || n.startsWith('ns')) return 'NS'
  if (n.includes('renfe')) return 'Renfe'
  return 'other'
}

// Convert ISO string → datetime-local format "YYYY-MM-DDTHH:MM"
function toDatetimeLocal(iso: string | null | undefined): string {
  if (!iso) return ''
  return iso.slice(0, 16)
}

// Convert datetime-local "YYYY-MM-DDTHH:MM" → ISO string (treated as UTC)
function toISO(local: string): string {
  if (!local) return ''
  return new Date(local).toISOString()
}

// ─── Spinner ──────────────────────────────────────────────────────────────────

function Spinner() {
  return (
    <div className="animate-spin h-4 w-4 border-2 border-zinc-600 border-t-zinc-300 rounded-full" />
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function LegEditorSheet({ tripId, open, onOpenChange, leg }: LegEditorSheetProps) {
  const isEditing = !!leg
  const createLeg = useCreateLeg()
  const updateLeg = useUpdateLeg(tripId)
  const isPending = createLeg.isPending || updateLeg.isPending

  // ── Tab state ──────────────────────────────────────────────────────────────
  const [tab, setTab] = useState<Tab>(isEditing ? 'manual' : 'departures')

  // ── Departures tab state ───────────────────────────────────────────────────
  const [stationInput, setStationInput] = useState('')
  const [selectedStation, setSelectedStation] = useState<HafasStation | null>(null)
  const [depDatetime, setDepDatetime] = useState('')
  const [selectedTripId, setSelectedTripId] = useState<string | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const suggestionRef = useRef<HTMLDivElement>(null)

  // ── Train tab state ────────────────────────────────────────────────────────
  const [trainInput, setTrainInput] = useState('')
  const [trainDate, setTrainDate] = useState('')
  const [trainSearchKey, setTrainSearchKey] = useState('')

  // ── Journey confirm state ──────────────────────────────────────────────────
  const [boardIdx, setBoardIdx] = useState(0)
  const [alightIdx, setAlightIdx] = useState(0)
  const [smartSeat, setSmartSeat] = useState('')
  const [smartNotes, setSmartNotes] = useState('')

  // ── API error ──────────────────────────────────────────────────────────────
  const [apiError, setApiError] = useState<string | null>(null)

  // ── Manual form ────────────────────────────────────────────────────────────
  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } =
    useForm<CreateLegInput>({
      resolver: zodResolver(createLegSchema),
      defaultValues: { tripId },
    })

  // ── Reset when closing ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!open) {
      setSelectedStation(null)
      setStationInput('')
      setSelectedTripId(null)
      setTrainSearchKey('')
      setBoardIdx(0)
      setAlightIdx(0)
      setSmartSeat('')
      setSmartNotes('')
      setApiError(null)
      setShowSuggestions(false)
      setTab(isEditing ? 'manual' : 'departures')
    }
  }, [open, isEditing])

  // ── Populate manual form when editing ─────────────────────────────────────
  useEffect(() => {
    if (leg) {
      setValue('originName', leg.originName)
      setValue('originIbnr', leg.originIbnr ?? '')
      setValue('plannedDeparture', toDatetimeLocal(leg.plannedDeparture))
      setValue('destName', leg.destName)
      setValue('destIbnr', leg.destIbnr ?? '')
      setValue('plannedArrival', toDatetimeLocal(leg.plannedArrival))
      setValue('operator', (leg.operator as typeof OPERATORS[number]) ?? undefined)
      setValue('trainNumber', leg.trainNumber ?? '')
      setValue('lineName', leg.lineName ?? '')
      setValue('seat', leg.seat ?? '')
      setValue('notes', leg.notes ?? '')
    } else {
      reset({ tripId })
    }
  }, [leg, tripId, setValue, reset])

  // ── Queries: station search ────────────────────────────────────────────────
  const debouncedStation = useDebounce(stationInput, 300)
  const { data: stationSuggestions } = useQuery({
    queryKey: ['stations', debouncedStation],
    queryFn: () => apiFetch<HafasStation[]>(`/api/stations/search?q=${encodeURIComponent(debouncedStation)}`),
    enabled: debouncedStation.length >= 2 && !selectedStation,
    staleTime: 5 * 60 * 1000,
  })

  // ── Queries: departures ────────────────────────────────────────────────────
  const { data: departures, isFetching: fetchingDepartures } = useQuery({
    queryKey: ['departures', selectedStation?.id, depDatetime],
    queryFn: () => apiFetch<HafasDeparture[]>(
      `/api/departures?ibnr=${selectedStation!.id}&when=${new Date(depDatetime).toISOString()}`
    ),
    enabled: !!selectedStation && depDatetime.length > 0,
    staleTime: 60 * 1000,
  })

  // ── Queries: journey from departure selection ──────────────────────────────
  const { data: journeyFromDep, isFetching: fetchingJourneyFromDep } = useQuery({
    queryKey: ['journey', selectedTripId],
    queryFn: () => apiFetch<HafasJourney>(`/api/journey?tripId=${encodeURIComponent(selectedTripId!)}`),
    enabled: !!selectedTripId,
    staleTime: 5 * 60 * 1000,
  })

  // ── Queries: journey from train number search ──────────────────────────────
  const { data: trainJourney, isFetching: fetchingTrain, error: trainError } = useQuery({
    queryKey: ['train-journey', trainSearchKey],
    queryFn: () => apiFetch<HafasJourney>(`/api/trains?number=${encodeURIComponent(trainInput)}&date=${trainDate}`),
    enabled: trainSearchKey.length > 0,
    retry: false,
    staleTime: 5 * 60 * 1000,
  })

  // ── Active journey ─────────────────────────────────────────────────────────
  const activeJourney =
    tab === 'departures' ? (journeyFromDep ?? null) :
    tab === 'train' ? (trainJourney ?? null) :
    null

  // ── Initialize board/alight when journey loads ─────────────────────────────
  useEffect(() => {
    if (activeJourney) {
      setBoardIdx(0)
      setAlightIdx(activeJourney.stopovers.length - 1)
    }
  }, [activeJourney?.tripId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Close suggestions on outside click ────────────────────────────────────
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (suggestionRef.current && !suggestionRef.current.contains(e.target as Node)) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // ── Manual form submit ─────────────────────────────────────────────────────
  async function onManualSubmit(data: CreateLegInput) {
    setApiError(null)
    const payload = {
      ...data,
      plannedDeparture: toISO(data.plannedDeparture),
      plannedArrival: toISO(data.plannedArrival),
    }

    try {
      if (isEditing) {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { tripId: _tripId, ...updateData } = payload
        await updateLeg.mutateAsync({ id: leg!.id, data: updateData })
      } else {
        await createLeg.mutateAsync(payload)
      }
      onOpenChange(false)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong'
      setApiError(msg)
    }
  }

  // ── Smart (Departures / Train) submit ─────────────────────────────────────
  async function handleSmartSubmit() {
    if (!activeJourney) return
    const board = activeJourney.stopovers[boardIdx]
    const alight = activeJourney.stopovers[alightIdx]
    if (!board.plannedDeparture || !alight.plannedArrival) {
      setApiError('Selected stops have no departure/arrival time')
      return
    }

    const op = inferOperator(activeJourney.operator ?? activeJourney.lineName)

    setApiError(null)
    try {
      await createLeg.mutateAsync({
        tripId,
        originName: board.stationName,
        originIbnr: board.stationId || undefined,
        originLat: board.lat ?? undefined,
        originLon: board.lon ?? undefined,
        plannedDeparture: board.plannedDeparture,
        destName: alight.stationName,
        destIbnr: alight.stationId || undefined,
        destLat: alight.lat ?? undefined,
        destLon: alight.lon ?? undefined,
        plannedArrival: alight.plannedArrival,
        operator: op,
        trainNumber: activeJourney.lineName,
        tripIdVendo: activeJourney.tripId || undefined,
        seat: smartSeat || undefined,
        notes: smartNotes || undefined,
      })
      onOpenChange(false)
    } catch (err) {
      setApiError(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  // ─── Derived values for journey confirm ───────────────────────────────────
  const alightStops = activeJourney
    ? activeJourney.stopovers.slice(boardIdx + 1).filter(s => s.plannedArrival)
    : []

  const boardStop = activeJourney?.stopovers[boardIdx] ?? null
  const alightStop = activeJourney?.stopovers[alightIdx] ?? null

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="bg-zinc-900 border-zinc-800 text-white w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-white">{isEditing ? 'Edit leg' : 'Add leg'}</SheetTitle>
          <SheetDescription className="text-zinc-400">
            One train ride — one vehicle, one departure to one arrival.
          </SheetDescription>
        </SheetHeader>

        {/* Tab bar — only shown when creating */}
        {!isEditing && (
          <div className="mt-4 flex rounded-lg bg-zinc-800 p-1 gap-1">
            {(['departures', 'train', 'manual'] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={[
                  'flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
                  tab === t
                    ? 'bg-zinc-700 text-white'
                    : 'text-zinc-400 hover:text-zinc-200',
                ].join(' ')}
              >
                {t === 'departures' ? 'Departures' : t === 'train' ? 'Train' : 'Manual'}
              </button>
            ))}
          </div>
        )}

        <div className="mt-6 space-y-5">

          {/* ── DEPARTURES TAB ─────────────────────────────────────────────── */}
          {tab === 'departures' && (
            <div className="space-y-4">
              {/* Station search */}
              <div className="space-y-1.5 relative" ref={suggestionRef}>
                <Label className="text-zinc-300">Station</Label>
                <div className="relative flex items-center">
                  <Input
                    placeholder="Search station…"
                    value={selectedStation ? selectedStation.name : stationInput}
                    onChange={(e) => {
                      if (selectedStation) {
                        setSelectedStation(null)
                      }
                      setStationInput(e.target.value)
                      setShowSuggestions(true)
                    }}
                    onFocus={() => { if (!selectedStation) setShowSuggestions(true) }}
                    className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 pr-8"
                  />
                  {(selectedStation || stationInput) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStation(null)
                        setStationInput('')
                        setShowSuggestions(false)
                        setSelectedTripId(null)
                      }}
                      className="absolute right-2 text-zinc-400 hover:text-zinc-200 text-lg leading-none"
                      aria-label="Clear station"
                    >
                      ×
                    </button>
                  )}
                </div>

                {/* Suggestions dropdown */}
                {showSuggestions && !selectedStation && stationSuggestions && stationSuggestions.length > 0 && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-lg border border-zinc-700 bg-zinc-900 shadow-lg overflow-hidden">
                    {stationSuggestions.map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        className="w-full text-left px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-800 transition-colors"
                        onMouseDown={(e) => {
                          e.preventDefault()
                          setSelectedStation(s)
                          setStationInput('')
                          setShowSuggestions(false)
                          setSelectedTripId(null)
                        }}
                      >
                        <span className="font-medium">{s.name}</span>
                        {s.id && <span className="text-zinc-500 ml-2 text-xs">{s.id}</span>}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Datetime */}
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Departure time</Label>
                <Input
                  type="datetime-local"
                  value={depDatetime}
                  onChange={(e) => setDepDatetime(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>

              {/* Departures list */}
              {fetchingDepartures && (
                <div className="flex items-center gap-2 text-sm text-zinc-400 py-2">
                  <Spinner />
                  <span>Searching…</span>
                </div>
              )}

              {!fetchingDepartures && departures && departures.length === 0 && (
                <p className="text-sm text-zinc-500 py-2">No departures found.</p>
              )}

              {!fetchingDepartures && departures && departures.length > 0 && (
                <div className="space-y-2">
                  {departures.map((dep) => (
                    <button
                      key={dep.tripId}
                      type="button"
                      onClick={() => setSelectedTripId(dep.tripId === selectedTripId ? null : dep.tripId)}
                      className={[
                        'w-full text-left rounded-lg border p-3 cursor-pointer transition-all',
                        dep.tripId === selectedTripId
                          ? 'border-zinc-400 bg-zinc-800 text-white'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-200 hover:border-zinc-600',
                      ].join(' ')}
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-mono font-semibold tabular-nums">
                          {fmtTime(dep.plannedWhen)}
                        </span>
                        {dep.delay > 0 && (
                          <span className="text-amber-400 text-xs">{fmtDelay(dep.delay)}</span>
                        )}
                        <span className={[
                          'text-xs px-1.5 py-0.5 rounded border font-medium',
                          trainBadgeClass(dep.lineName),
                        ].join(' ')}>
                          {dep.lineName}
                        </span>
                        <span className="text-zinc-400 text-xs">→</span>
                        <span className="text-sm flex-1 min-w-0 truncate">{dep.direction}</span>
                        {dep.platform && (
                          <span className="bg-zinc-800 text-zinc-300 text-xs px-2 py-0.5 rounded border border-zinc-700 shrink-0">
                            Gl. {dep.platform}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}

              {/* Journey loading indicator */}
              {selectedTripId && fetchingJourneyFromDep && (
                <div className="flex items-center gap-2 text-sm text-zinc-400 py-2">
                  <Spinner />
                  <span>Loading journey details…</span>
                </div>
              )}
            </div>
          )}

          {/* ── TRAIN TAB ──────────────────────────────────────────────────── */}
          {tab === 'train' && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Train number</Label>
                <Input
                  placeholder="ICE 724"
                  value={trainInput}
                  onChange={(e) => setTrainInput(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Date</Label>
                <Input
                  type="date"
                  value={trainDate}
                  onChange={(e) => setTrainDate(e.target.value)}
                  className="bg-zinc-800 border-zinc-700 text-white"
                />
              </div>
              <Button
                type="button"
                disabled={fetchingTrain || !trainInput || !trainDate}
                onClick={() => setTrainSearchKey(`${trainInput}__${trainDate}__${Date.now()}`)}
                className="w-full bg-zinc-700 hover:bg-zinc-600 text-white border-zinc-600"
              >
                {fetchingTrain ? (
                  <span className="flex items-center gap-2">
                    <Spinner />
                    Looking for {trainInput}…
                  </span>
                ) : 'Find train'}
              </Button>

              {trainError && !fetchingTrain && (
                <div className="rounded-lg border border-amber-900/50 bg-amber-950/30 p-3 text-sm text-amber-300">
                  <p>Train not found. Try the Departures tab instead.</p>
                  <button
                    type="button"
                    onClick={() => setTab('departures')}
                    className="mt-1 text-amber-200 underline text-xs"
                  >
                    Switch to Departures
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ── JOURNEY CONFIRM (shared: Departures + Train) ──────────────── */}
          {(tab === 'departures' || tab === 'train') && activeJourney && (
            <div className="space-y-4 border-t border-zinc-800 pt-4">
              {/* Journey header */}
              <div className="rounded-lg bg-zinc-800/50 border border-zinc-700 p-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={[
                    'text-sm px-2 py-0.5 rounded border font-semibold',
                    trainBadgeClass(activeJourney.lineName),
                  ].join(' ')}>
                    {activeJourney.lineName}
                  </span>
                  {activeJourney.operator && (
                    <span className="text-xs text-zinc-400">{activeJourney.operator}</span>
                  )}
                </div>
              </div>

              {/* Board at */}
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Board at</Label>
                <Select
                  value={String(boardIdx)}
                  onValueChange={(v) => {
                    const idx = Number(v)
                    setBoardIdx(idx)
                    if (alightIdx <= idx) {
                      const nextAlight = activeJourney.stopovers
                        .slice(idx + 1)
                        .findIndex(s => s.plannedArrival)
                      setAlightIdx(nextAlight >= 0 ? idx + 1 + nextAlight : idx + 1)
                    }
                  }}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue placeholder="Select boarding stop…" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    {activeJourney.stopovers.map((s, i) => {
                      if (!s.plannedDeparture) return null
                      return (
                        <SelectItem key={i} value={String(i)} className="text-white focus:bg-zinc-700">
                          <span className="font-mono tabular-nums text-xs mr-2">
                            {fmtTime(s.plannedDeparture)}
                          </span>
                          {s.stationName}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Alight at */}
              <div className="space-y-1.5">
                <Label className="text-zinc-300">Alight at</Label>
                <Select
                  value={String(alightIdx)}
                  onValueChange={(v) => setAlightIdx(Number(v))}
                >
                  <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                    <SelectValue placeholder="Select alighting stop…" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-800 border-zinc-700">
                    {alightStops.map((s) => {
                      const realIdx = activeJourney.stopovers.indexOf(s)
                      return (
                        <SelectItem key={realIdx} value={String(realIdx)} className="text-white focus:bg-zinc-700">
                          <span className="font-mono tabular-nums text-xs mr-2">
                            {fmtTime(s.plannedArrival)}
                          </span>
                          {s.stationName}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Preview */}
              {boardStop && alightStop && (
                <div className="rounded-lg bg-zinc-800/50 border border-zinc-700 p-3 text-sm space-y-1">
                  <div className="flex items-center gap-2 text-white">
                    <span className="font-medium">{boardStop.stationName}</span>
                    <span className="font-mono text-zinc-400">{fmtTime(boardStop.plannedDeparture)}</span>
                    <span className="text-zinc-500">→</span>
                    <span className="font-medium">{alightStop.stationName}</span>
                    <span className="font-mono text-zinc-400">{fmtTime(alightStop.plannedArrival)}</span>
                  </div>
                  <div className="text-zinc-400 text-xs">
                    Duration: {fmtDuration(boardStop.plannedDeparture, alightStop.plannedArrival)}
                  </div>
                </div>
              )}

              {/* Seat + Notes */}
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <Label className="text-zinc-300">Seat</Label>
                  <Input
                    placeholder="Wagen 5, Platz 42"
                    value={smartSeat}
                    onChange={(e) => setSmartSeat(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-zinc-300">Notes</Label>
                  <Textarea
                    placeholder="Any notes about this leg…"
                    rows={2}
                    value={smartNotes}
                    onChange={(e) => setSmartNotes(e.target.value)}
                    className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 resize-none"
                  />
                </div>
              </div>

              {apiError && (
                <p className="text-xs text-red-400 bg-red-950/40 border border-red-900/50 rounded-md px-3 py-2">
                  {apiError}
                </p>
              )}

              <div className="flex gap-3 pt-1">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  className="flex-1 bg-white text-zinc-900 hover:bg-zinc-100"
                  disabled={isPending || !boardStop || !alightStop}
                  onClick={handleSmartSubmit}
                >
                  {isPending ? 'Adding…' : 'Add leg'}
                </Button>
              </div>
            </div>
          )}

          {/* ── MANUAL TAB ─────────────────────────────────────────────────── */}
          {tab === 'manual' && (
            <form onSubmit={handleSubmit(onManualSubmit)} className="space-y-5">
              {/* Origin */}
              <fieldset className="space-y-3">
                <legend className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Origin</legend>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <Label htmlFor="originName" className="text-zinc-300">Station *</Label>
                    <Input
                      id="originName"
                      placeholder="München Hbf"
                      className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                      {...register('originName')}
                    />
                    {errors.originName && <p className="text-xs text-red-400">{errors.originName.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="originIbnr" className="text-zinc-300">IBNR</Label>
                    <Input
                      id="originIbnr"
                      placeholder="8000261"
                      className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                      {...register('originIbnr')}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="plannedDeparture" className="text-zinc-300">Departure *</Label>
                  <Input
                    id="plannedDeparture"
                    type="datetime-local"
                    className="bg-zinc-800 border-zinc-700 text-white"
                    {...register('plannedDeparture')}
                  />
                  {errors.plannedDeparture && <p className="text-xs text-red-400">{errors.plannedDeparture.message}</p>}
                </div>
              </fieldset>

              {/* Destination */}
              <fieldset className="space-y-3">
                <legend className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Destination</legend>
                <div className="grid grid-cols-3 gap-3">
                  <div className="col-span-2 space-y-1.5">
                    <Label htmlFor="destName" className="text-zinc-300">Station *</Label>
                    <Input
                      id="destName"
                      placeholder="Berlin Hbf"
                      className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                      {...register('destName')}
                    />
                    {errors.destName && <p className="text-xs text-red-400">{errors.destName.message}</p>}
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="destIbnr" className="text-zinc-300">IBNR</Label>
                    <Input
                      id="destIbnr"
                      placeholder="8011160"
                      className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                      {...register('destIbnr')}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="plannedArrival" className="text-zinc-300">Arrival *</Label>
                  <Input
                    id="plannedArrival"
                    type="datetime-local"
                    className="bg-zinc-800 border-zinc-700 text-white"
                    {...register('plannedArrival')}
                  />
                  {errors.plannedArrival && <p className="text-xs text-red-400">{errors.plannedArrival.message}</p>}
                </div>
              </fieldset>

              {/* Train info */}
              <fieldset className="space-y-3">
                <legend className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Train</legend>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-zinc-300">Operator</Label>
                    <Select
                      value={watch('operator') ?? ''}
                      onValueChange={(v) => setValue('operator', v as typeof OPERATORS[number])}
                    >
                      <SelectTrigger className="bg-zinc-800 border-zinc-700 text-white">
                        <SelectValue placeholder="Select…" />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-800 border-zinc-700">
                        {OPERATORS.map((op) => (
                          <SelectItem key={op} value={op} className="text-white focus:bg-zinc-700">
                            {op}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="trainNumber" className="text-zinc-300">Train number</Label>
                    <Input
                      id="trainNumber"
                      placeholder="ICE 724"
                      className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                      {...register('trainNumber')}
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="seat" className="text-zinc-300">Seat</Label>
                  <Input
                    id="seat"
                    placeholder="Wagen 5, Platz 42"
                    className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500"
                    {...register('seat')}
                  />
                </div>
              </fieldset>

              <div className="space-y-1.5">
                <Label htmlFor="notes" className="text-zinc-300">Notes</Label>
                <Textarea
                  id="notes"
                  placeholder="Any notes about this leg…"
                  rows={2}
                  className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 resize-none"
                  {...register('notes')}
                />
              </div>

              {apiError && (
                <p className="text-xs text-red-400 bg-red-950/40 border border-red-900/50 rounded-md px-3 py-2">
                  {apiError}
                </p>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  className="flex-1 border-zinc-700 text-zinc-300 hover:bg-zinc-800"
                  onClick={() => onOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-white text-zinc-900 hover:bg-zinc-100"
                  disabled={isPending}
                >
                  {isPending
                    ? (isEditing ? 'Saving…' : 'Adding…')
                    : (isEditing ? 'Save changes' : 'Add leg')}
                </Button>
              </div>
            </form>
          )}

        </div>
      </SheetContent>
    </Sheet>
  )
}
