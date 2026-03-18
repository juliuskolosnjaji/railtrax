'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { ArrowLeft, Plus, Trash2, BookOpen, X, FileText, Image as ImageIcon, Pencil, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { LegCard } from '@/components/trips/LegCard'
import { LegEditorSheet } from '@/components/trips/LegEditorSheet'
import { TripEditorSheet } from '@/components/trips/TripEditorSheet'
import { JournalEntryCard } from '@/components/journal/JournalEntryCard'
import { SharingSheet } from '@/components/trips/SharingSheet'
const JournalEditor = dynamic(() => import('@/components/journal/JournalEditor').then(m => m.JournalEditor), { ssr: false })
import { UpgradeModal } from '@/components/billing/UpgradeModal'
import { useTrip, useDeleteTrip, useShareTrip, useUnshareTrip, type Leg } from '@/hooks/useTrips'
import { useJournalEntries, type JournalEntry } from '@/hooks/useJournal'
import { useEntitlements } from '@/hooks/useEntitlements'
import { TripRouteCard } from '@/components/trips/TripRouteCard'



const STATUS_STYLES: Record<string, { bg: string; color: string; border: string }> = {
  planned:   { bg: '#0d1f3c', color: '#4f8ef7',  border: '#1e3a6e' },
  active:    { bg: '#0d2618', color: '#3ecf6e',  border: '#1a4a2e' },
  completed: { bg: '#1a1a1a', color: '#6b7280',  border: '#2a2a2a' },
  cancelled: { bg: '#1f0d0d', color: '#e25555',  border: '#3a1515' },
}

const STATUS_LABELS: Record<string, string> = {
  planned: 'Geplant',
  active: '● Aktiv',
  completed: 'Abgeschlossen',
  cancelled: 'Storniert',
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function TripDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { data: trip, isLoading } = useTrip(id)
  const { data: entries = [] } = useJournalEntries(id)
  const deleteTrip = useDeleteTrip()
  const qc = useQueryClient()
  const { can } = useEntitlements()
  const canJournal = can('journal')
  const shareTrip = useShareTrip(id)
  const unshareTrip = useUnshareTrip(id)

  const [addLegOpen, setAddLegOpen] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorLegId, setEditorLegId] = useState<string | null>(null)
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [tripEditOpen, setTripEditOpen] = useState(false)

  const handleShareTrip = async () => {
    await shareTrip.mutateAsync()
  }

  const handleUnshareTrip = async () => {
    await unshareTrip.mutateAsync()
  }

  useEffect(() => {
    if (!trip?.legs.length) return
    const hasLegsWithoutPolyline = trip.legs.some((l) => !l.polyline && l.originIbnr && l.trainNumber)
    if (!hasLegsWithoutPolyline) return
    fetch(`/api/trips/${id}/polylines`)
      .then((r) => r.json())
      .then((j) => { if ((j.data?.updated ?? 0) > 0) qc.invalidateQueries({ queryKey: ['trips', id] }) })
      .catch(() => {})
  }, [id, trip, qc])

  function openNewEntry(legId?: string) {
    if (!canJournal) { setUpgradeOpen(true); return }
    setEditingEntry(null)
    setEditorLegId(legId ?? null)
    setEditorOpen(true)
  }

  function openEditEntry(entry: JournalEntry) {
    setEditingEntry(entry)
    setEditorLegId(entry.legId)
    setEditorOpen(true)
  }

  async function handleDeleteTrip() {
    if (!confirm('Delete this trip? This cannot be undone.')) return
    await deleteTrip.mutateAsync(id)
    router.push('/dashboard')
  }

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-8 w-64 bg-[#0d1f3c]" />
        <Skeleton className="h-4 w-40 bg-[#0d1f3c]" />
        <Skeleton className="h-[400px] rounded-xl bg-[#0d1f3c] mt-6" />
        <div className="mt-4 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl bg-[#0d1f3c]" />
          ))}
        </div>
      </div>
    )
  }

  if (!trip) {
    return (
      <div className="p-8 text-center">
        <p className="text-[#4a6a9a]">Reise nicht gefunden.</p>
        <Link href="/dashboard" className="text-[#8ba3c7] hover:text-white text-sm mt-2 inline-block">← Zum Dashboard</Link>
      </div>
    )
  }

  const startDate = formatDate(trip.startDate)
  const endDate = formatDate(trip.endDate)
  const floatingEntries = entries.filter((e) => !e.legId)

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        <div className="p-8 max-w-7xl mx-auto w-full">
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-[#4a6a9a] hover:text-[#8ba3c7] transition-colors mb-6">
            <ArrowLeft className="h-4 w-4" /> Alle Reisen
          </Link>

          <div className="flex items-start justify-between gap-4 mb-2">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-medium text-white">{trip.title}</h1>
              {/* Edit button — icon only */}
              <button
                onClick={() => setTripEditOpen(true)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 36, height: 36,
                  background: '#0d1f3c', border: '1px solid #1e3a6e',
                  borderRadius: 8, cursor: 'pointer', flexShrink: 0,
                }}
              >
                <Pencil size={15} color="#4f8ef7" />
              </button>
            </div>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              flexWrap: 'wrap',
            }}>
              {/* PDF button */}
              <a
                href={`/api/trips/${id}/export/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 6, height: 36, padding: '0 14px',
                  background: '#0d1f3c', border: '1px solid #1e3a6e',
                  borderRadius: 8, cursor: 'pointer',
                  fontSize: 13, fontWeight: 500, color: '#4f8ef7',
                  flexShrink: 0,
                }}
              >
                <FileText size={14} />
                PDF
              </a>
              {/* Image/Bild button */}
              <button
                onClick={async () => {
                  const { exportTripAsImage } = await import('@/lib/export/clientExport')
                  await exportTripAsImage(trip, null as unknown as HTMLElement)
                }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 6, height: 36, padding: '0 14px',
                  background: '#0d1f3c', border: '1px solid #1e3a6e',
                  borderRadius: 8, cursor: 'pointer',
                  fontSize: 13, fontWeight: 500, color: '#4f8ef7',
                  flexShrink: 0,
                }}
              >
                <ImageIcon size={14} />
                Bild
              </button>
              {/* Share button */}
              {trip && (
                <SharingSheet
                  tripId={id}
                  isPublic={trip.isPublic}
                  shareToken={trip.shareToken}
                  onShare={handleShareTrip}
                  onUnshare={handleUnshareTrip}
                />
              )}
              {/* Delete button */}
              <button
                onClick={handleDeleteTrip}
                disabled={deleteTrip.isPending}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 36, height: 36,
                  background: '#0d1f3c', border: '1px solid #1e3a6e',
                  borderRadius: 8, cursor: 'pointer', flexShrink: 0,
                }}
              >
                <Trash2 size={15} color="#e25555" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-8 flex-wrap">
            {(() => {
              const status = trip.status ?? 'planned'
              const s = STATUS_STYLES[status] ?? STATUS_STYLES.planned
              const label = STATUS_LABELS[status] ?? STATUS_LABELS.planned
              return (
                <span style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}
                  className="rounded-full px-3 py-1 text-xs font-medium">
                  {label}
                </span>
              )
            })()}
            {(startDate || endDate) && (
              <span className="text-sm text-[#4a6a9a]">
                {startDate && endDate ? `${startDate} → ${endDate}` : startDate ?? endDate}
              </span>
            )}
            {trip?.description && <p className="w-full text-sm text-[#8ba3c7] mt-1">{trip.description}</p>}
          </div>

          {trip.legs.length > 0 && (
            <div className="mb-8">
              <TripRouteCard
                legs={trip.legs.map((l) => ({
                  originName:   l.originName,
                  originLat:    l.originLat,
                  originLon:    l.originLon,
                  destName:     l.destName,
                  destLat:      l.destLat,
                  destLon:      l.destLon,
                  polyline:     l.polyline,
                  trainType:    l.trainType,
                  trainNumber:  l.trainNumber,
                  operator:     l.operator,
                }))}
                stats={{
                  distanceKm: trip.legs.reduce((s, l) => s + (l.distanceKm ?? 0), 0) || null,
                  durationMs: (() => {
                    const first = trip.legs[0]
                    const last  = trip.legs[trip.legs.length - 1]
                    const dep = first.actualDeparture ?? first.plannedDeparture
                    const arr = last.actualArrival   ?? last.plannedArrival
                    const ms  = new Date(arr).getTime() - new Date(dep).getTime()
                    return ms > 0 ? ms : null
                  })(),
                }}
              />
            </div>
          )}

          {/* Timeline */}
          <div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                gap: 10,
                flexWrap: 'nowrap',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10,
                              minWidth: 0, flex: 1 }}>
                  <h2 style={{ fontSize: 16, fontWeight: 600, color: '#fff',
                               margin: 0, whiteSpace: 'nowrap' }}>
                    Zeitlinie
                  </h2>
                  {/* Count badge — smaller, doesn't wrap */}
                  <span style={{
                    fontSize: 11, color: '#4a6a9a',
                    background: '#0d1f3c', border: '1px solid #1e2d4a',
                    borderRadius: 5, padding: '2px 8px', whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}>
                    {trip.legs.length} Abschnitte · {entries.length} Einträge
                  </span>
                </div>

                {/* Action buttons — right side */}
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => openNewEntry()}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      gap: 5, height: 34, padding: '0 12px',
                      background: '#0d1f3c', border: '1px solid #1e3a6e',
                      borderRadius: 7, cursor: 'pointer',
                      fontSize: 12, fontWeight: 500, color: '#4f8ef7',
                    }}
                  >
                    <BookOpen size={13} />
                    Eintrag
                  </button>
                  <button
                    onClick={() => setAddLegOpen(true)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      gap: 5, height: 34, padding: '0 12px',
                      background: '#2563eb', border: 'none',
                      borderRadius: 7, cursor: 'pointer',
                      fontSize: 12, fontWeight: 600, color: '#fff',
                    }}
                  >
                    <Plus size={13} />
                    Abschnitt
                  </button>
                </div>
              </div>

              {trip.legs.length === 0 && entries.length === 0 ? (
                <div className="text-center py-12 rounded-xl border border-dashed border-[#1e2d4a]">
                  <p className="text-[#4a6a9a] text-sm mb-3">Noch keine Abschnitte. Erste Zugfahrt hinzufügen.</p>
                  <Button
                    variant="outline" size="sm"
                    onClick={() => setAddLegOpen(true)}
                    className="border-[#1e2d4a] text-[#8ba3c7] hover:bg-[#0d1f3c] gap-1.5"
                  >
                    <Plus className="h-4 w-4" /> Abschnitt hinzufügen
                  </Button>
                </div>
              ) : (
                <div className="pb-8">
                  {trip.legs.map((leg: Leg) => {
                    const legEntries = entries.filter((e) => e.legId === leg.id)
                    return (
                      <div key={leg.id}>
                        <LegCard leg={leg} tripId={trip.id} />
                        {legEntries.map((entry) => (
                          <div key={entry.id} className="ml-6 mb-3 -mt-2">
                            <JournalEntryCard entry={entry} tripId={trip.id} onEdit={openEditEntry} indented />
                          </div>
                        ))}
                        <div className="ml-6 mb-1">
                          <button
                            onClick={() => openNewEntry(leg.id)}
                            className="text-xs text-[#4a6a9a] hover:text-[#4f8ef7] transition-colors py-1"
                          >
                            + Journaleintrag für diesen Abschnitt
                          </button>
                        </div>
                      </div>
                    )
                  })}

                  {trip.legs.length > 0 && (
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#1e3a6e]" />
                      </div>
                      <p className="text-sm text-[#4a6a9a] pb-2">{trip.legs[trip.legs.length - 1]?.destName}</p>
                    </div>
                  )}

                  {floatingEntries.length > 0 && (
                    <div className="mt-6 space-y-3">
                      <p className="text-sm font-medium text-zinc-500">General entries</p>
                      {floatingEntries.map((entry) => (
                        <JournalEntryCard key={entry.id} entry={entry} tripId={trip.id} onEdit={openEditEntry} />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
      </div>

      {/* Journal editor modal */}
      {editorOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setEditorOpen(false)} />
          <div className="relative z-10 w-full sm:max-w-2xl sm:rounded-xl bg-[#080d1a] border border-[#1e2d4a] flex flex-col h-[80vh] sm:h-[70vh]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e2d4a]">
              <h3 className="text-sm font-medium text-white">
                {editingEntry ? 'Eintrag bearbeiten' : 'Neuer Journaleintrag'}
                {editorLegId && <span className="ml-2 text-[#4a6a9a] font-normal">· Abschnitt verknüpft</span>}
              </h3>
              <button onClick={() => setEditorOpen(false)} className="text-[#4a6a9a] hover:text-white transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <JournalEditor
                tripId={trip.id}
                legId={editorLegId}
                entry={editingEntry}
                onSaved={() => {}}
                onClose={() => setEditorOpen(false)}
              />
            </div>
          </div>
        </div>
      )}

      <LegEditorSheet tripId={id} open={addLegOpen} onOpenChange={setAddLegOpen} />
      <TripEditorSheet open={tripEditOpen} onOpenChange={setTripEditOpen} trip={trip} />
      <UpgradeModal feature="journal" open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </div>
  )
}
