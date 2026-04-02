'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { ArrowLeft, Plus, Trash2, BookOpen, X, FileText, Image as ImageIcon, Pencil } from 'lucide-react'
import { Skeleton } from '@/components/ui/skeleton'
import { LegCard } from '@/components/trips/LegCard'
import { LegEditorSheet } from '@/components/trips/LegEditorSheet'
import { JournalEntryCard } from '@/components/journal/JournalEntryCard'
import { ShareButton } from '@/components/trips/ShareButton'
import { TrainDetailSheet } from '@/components/trains/TrainDetailSheet'
const JournalEditor = dynamic(() => import('@/components/journal/JournalEditor').then(m => m.JournalEditor), { ssr: false })
import { useTrip, useDeleteTrip, useShareTrip, useUnshareTrip } from '@/hooks/useTrips'
import { useTraewellingAutoCheckin } from '@/hooks/useTraewelling'
import { useJournalEntries, type JournalEntry } from '@/hooks/useJournal'
import { TripRouteCard } from '@/components/trips/TripRouteCard'
import { PublishTripModal } from '@/components/community/PublishTripModal'


const STATUS_BADGE_CLASS: Record<string, string> = {
  active:    'bg-primary/15 text-primary',
  completed: 'bg-success/15 text-success',
  planned:   'bg-secondary text-secondary-foreground',
  cancelled: 'bg-destructive/15 text-destructive',
}

const STATUS_LABELS: Record<string, string> = {
  planned:   'Geplant',
  active:    'Aktiv',
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
  const shareTrip = useShareTrip(id)
  const unshareTrip = useUnshareTrip(id)

  const [addLegOpen, setAddLegOpen] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorLegId, setEditorLegId] = useState<string | null>(null)
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null)
  const [detailTrain, setDetailTrain] = useState<{ trainNumber: string; departure?: string; operator?: string | null } | null>(null)
  const [expandedLeg, setExpandedLeg] = useState<string | null>(null)
  const [publishOpen, setPublishOpen] = useState(false)

  useTraewellingAutoCheckin(id, trip?.legs ?? [])

  const toggleLeg = (legId: string) =>
    setExpandedLeg(prev => prev === legId ? null : legId)

  const handleShareTrip = async () => {
    await shareTrip.mutateAsync()
  }

  const handleUnshareTrip = async () => {
    await unshareTrip.mutateAsync()
  }

  useEffect(() => {
    if (!trip?.legs.length) return
    const hasLegsToEnrich = trip.legs.some(
      (l) => (!l.polyline && l.originIbnr && l.trainNumber) || (!l.platformPlanned && !l.platformActual && l.originIbnr && l.trainNumber),
    )
    if (!hasLegsToEnrich) return
    // Fire both in parallel — polylines and platform data
    const promises = [
      fetch(`/api/trips/${id}/polylines`).then((r) => r.json()),
      fetch(`/api/trips/${id}/platforms`).then((r) => r.json()),
    ]
    Promise.allSettled(promises).then((results) => {
      if (results.some((r) => r.status === 'fulfilled' && ((r.value?.data?.updated ?? 0) > 0))) {
        qc.invalidateQueries({ queryKey: ['trips', id] })
      }
    }).catch(() => {})
  }, [id, trip, qc])

  function openNewEntry(legId?: string) {
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
    if (!confirm('Reise wirklich löschen? Dies kann nicht rückgängig gemacht werden.')) return
    await deleteTrip.mutateAsync(id)
    router.push('/dashboard')
  }

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-8 w-64 bg-secondary" />
        <Skeleton className="h-4 w-40 bg-secondary" />
        <Skeleton className="h-[400px] rounded-xl bg-secondary mt-6" />
        <div className="mt-4 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl bg-secondary" />
          ))}
        </div>
      </div>
    )
  }

  if (!trip) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Reise nicht gefunden.</p>
        <Link href="/dashboard" className="text-secondary-foreground hover:text-foreground text-sm mt-2 inline-block">← Zum Dashboard</Link>
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
          <button
            onClick={() => router.back()}
            className="tap-small flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors mb-4"
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, minHeight: 'unset', minWidth: 'unset' }}
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Alle Reisen
          </button>

          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 mb-3">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground tracking-tight">{trip.title}</h1>
              <Link
                href={`/trips/${id}/edit`}
                className="tap-small w-8 h-8 rounded-lg border flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                style={{ borderColor: 'hsl(var(--border))' }}
                title="Reise bearbeiten"
              >
                <Pencil className="w-3.5 h-3.5" />
              </Link>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <a
                href={`/api/trips/${id}/export/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="tap-small h-8 px-3 rounded-lg border flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
                style={{ borderColor: 'hsl(var(--border))', textDecoration: 'none', minHeight: 'unset' }}
              >
                <FileText className="w-3.5 h-3.5" />
                PDF
              </a>
              <button
                onClick={async () => {
                  const { exportTripAsImage } = await import('@/lib/export/clientExport')
                  await exportTripAsImage(trip, null as unknown as HTMLElement)
                }}
                className="tap-small h-8 px-3 rounded-lg border flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
                style={{ borderColor: 'hsl(var(--border))', background: 'transparent', cursor: 'pointer', minHeight: 'unset', minWidth: 'unset' }}
              >
                <ImageIcon className="w-3.5 h-3.5" />
                Bild
              </button>
              <ShareButton trip={trip} onShare={handleShareTrip} onUnshare={handleUnshareTrip} onPublish={() => setPublishOpen(true)} />
              <button
                onClick={handleDeleteTrip}
                disabled={deleteTrip.isPending}
                className="tap-small w-8 h-8 rounded-lg border flex items-center justify-center transition-colors"
                style={{
                  borderColor: 'hsl(var(--destructive) / 0.3)',
                  color: 'hsl(var(--destructive) / 0.7)',
                  background: 'transparent', cursor: 'pointer',
                  minHeight: 'unset', minWidth: 'unset',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = 'hsl(var(--destructive))'
                  e.currentTarget.style.borderColor = 'hsl(var(--destructive) / 0.6)'
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = 'hsl(var(--destructive) / 0.7)'
                  e.currentTarget.style.borderColor = 'hsl(var(--destructive) / 0.3)'
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-8 flex-wrap">
            {(() => {
              const status = trip.status ?? 'planned'
              const cls = STATUS_BADGE_CLASS[status] ?? STATUS_BADGE_CLASS.planned
              const label = STATUS_LABELS[status] ?? STATUS_LABELS.planned
              return (
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-semibold uppercase tracking-wider ${cls}`}>
                  {label}
                </span>
              )
            })()}
            {(startDate || endDate) && (
              <span className="text-sm text-muted-foreground">
                {startDate && endDate ? `${startDate} → ${endDate}` : startDate ?? endDate}
              </span>
            )}
            {trip?.description && <p className="w-full text-sm text-muted-foreground mt-1">{trip.description}</p>}
          </div>

          {trip.legs.length > 0 && (
            <div className="mb-8">
              <TripRouteCard legs={trip.legs} />
            </div>
          )}

          {/* Timeline */}
          <div className="pb-8">
            <div className="flex items-center justify-between mb-4 px-4 pt-4">
              <div className="flex items-center gap-3">
                <h2 className="text-lg font-semibold text-foreground">Zeitlinie</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-secondary text-[11px] font-medium text-secondary-foreground whitespace-nowrap">
                  {trip.legs.length} Abschnitte · {entries.length} Einträge
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openNewEntry()}
                  className="tap-small h-8 px-3 rounded-lg border flex items-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
                  style={{ borderColor: 'hsl(var(--border))', background: 'transparent', cursor: 'pointer', minHeight: 'unset', minWidth: 'unset' }}
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  Eintrag
                </button>
                <button
                  onClick={() => setAddLegOpen(true)}
                  className="tap-small h-8 px-3 rounded-lg bg-primary text-primary-foreground flex items-center gap-1.5 text-[13px] font-medium hover:bg-primary/90 transition-colors"
                  style={{ border: 'none', cursor: 'pointer', minHeight: 'unset', minWidth: 'unset' }}
                >
                  <Plus className="w-3.5 h-3.5" />
                  Abschnitt
                </button>
              </div>
            </div>

            <div>
              {trip.legs.length > 0 ? (
                trip.legs.map((leg) => (
                  <LegCard
                    key={leg.id}
                    leg={leg}
                    tripId={trip.id}
                    isExpanded={expandedLeg === leg.id}
                    onToggle={() => toggleLeg(leg.id)}
                    onTrainClick={(trainNumber, departure, operator) =>
                      setDetailTrain({ trainNumber, departure, operator })
                    }
                  />
                ))
              ) : (
                <div className="text-center py-12 rounded-xl border border-dashed border-border">
                  <p className="text-muted-foreground text-sm mb-3">Noch keine Abschnitte. Erste Zugfahrt hinzufügen.</p>
                  <button
                    onClick={() => setAddLegOpen(true)}
                    className="inline-flex items-center gap-1.5 text-sm text-secondary-foreground border border-border rounded-lg px-3 py-1.5 hover:bg-secondary transition-colors"
                    style={{ background: 'transparent', cursor: 'pointer' }}
                  >
                    <Plus className="h-4 w-4" /> Abschnitt hinzufügen
                  </button>
                </div>
              )}
            </div>

            {floatingEntries.length > 0 && (
              <div className="mt-6 space-y-3">
                <p className="text-sm font-medium text-muted-foreground">Allgemeine Einträge</p>
                {floatingEntries.map((entry) => (
                  <JournalEntryCard 
                    key={entry.id} 
                    entry={entry} 
                    tripId={trip.id} 
                    onEdit={openEditEntry} 
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Journal editor modal */}
      {editorOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setEditorOpen(false)} />
          <div className="relative z-10 w-full sm:max-w-2xl sm:rounded-xl bg-background border border-border flex flex-col h-[80vh] sm:h-[70vh]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <h3 className="text-sm font-medium text-foreground">
                {editingEntry ? 'Eintrag bearbeiten' : 'Neuer Journaleintrag'}
                {editorLegId && <span className="ml-2 text-muted-foreground font-normal">· Abschnitt verknüpft</span>}
              </h3>
              <button onClick={() => setEditorOpen(false)} className="text-muted-foreground hover:text-foreground transition-colors">
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
      {detailTrain && (
        <TrainDetailSheet
          trainNumber={detailTrain.trainNumber}
          date={detailTrain.departure}
          onClose={() => setDetailTrain(null)}
        />
      )}
      {publishOpen && (
        <PublishTripModal
          tripId={id}
          onClose={() => setPublishOpen(false)}
        />
      )}
      {publishOpen && (
        <PublishTripModal
          tripId={id}
          onClose={() => setPublishOpen(false)}
        />
      )}
    </div>
  )
}