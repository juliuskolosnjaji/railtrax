'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import dynamic from 'next/dynamic'
import { ArrowLeft, Plus, Trash2, BookOpen, X, FileText, Image as ImageIcon, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { LegCard } from '@/components/trips/LegCard'
import { LegEditorSheet } from '@/components/trips/LegEditorSheet'
import { JournalEntryCard } from '@/components/journal/JournalEntryCard'
import { SharingSheet } from '@/components/trips/SharingSheet'
const JournalEditor = dynamic(() => import('@/components/journal/JournalEditor').then(m => m.JournalEditor), { ssr: false })
import { UpgradeModal } from '@/components/billing/UpgradeModal'
import { useTrip, useDeleteTrip, useShareTrip, useUnshareTrip, type Leg } from '@/hooks/useTrips'
import { useJournalEntries, type JournalEntry } from '@/hooks/useJournal'
import { useEntitlements } from '@/hooks/useEntitlements'

const TripMap = dynamic(
  () => import('@/components/map/TripMap').then((m) => m.TripMap),
  { ssr: false, loading: () => <div className="h-full w-full bg-zinc-800 animate-pulse" /> },
)

const STATUS_STYLES: Record<string, string> = {
  planned: 'bg-zinc-700 text-zinc-300',
  active: 'bg-blue-900 text-blue-200',
  completed: 'bg-emerald-900 text-emerald-200',
  cancelled: 'bg-red-900 text-red-300',
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return null
  return new Date(dateStr).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
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

  const mapContainerRef = useRef<HTMLDivElement>(null)
  const [addLegOpen, setAddLegOpen] = useState(false)
  const [editorOpen, setEditorOpen] = useState(false)
  const [editorLegId, setEditorLegId] = useState<string | null>(null)
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null)
  const [upgradeOpen, setUpgradeOpen] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

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

  async function handleExportPdf() {
    if (!trip || !mapContainerRef.current) return
    setIsExporting(true)
    try {
      const { exportTripAsPdf } = await import('@/lib/export/clientExport')
      await exportTripAsPdf(trip, mapContainerRef.current)
    } catch (err) {
      console.error('PDF export failed:', err)
    } finally {
      setIsExporting(false)
    }
  }

  async function handleExportImage() {
    if (!trip || !mapContainerRef.current) return
    setIsExporting(true)
    try {
      const { exportTripAsImage } = await import('@/lib/export/clientExport')
      await exportTripAsImage(trip, mapContainerRef.current)
    } catch (err) {
      console.error('Image export failed:', err)
    } finally {
      setIsExporting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="p-8 space-y-4">
        <Skeleton className="h-8 w-64 bg-zinc-800" />
        <Skeleton className="h-4 w-40 bg-zinc-800" />
        <Skeleton className="h-[400px] rounded-xl bg-zinc-800 mt-6" />
        <div className="mt-4 space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-xl bg-zinc-800" />
          ))}
        </div>
      </div>
    )
  }

  if (!trip) {
    return (
      <div className="p-8 text-center">
        <p className="text-zinc-400">Trip not found.</p>
        <Link href="/dashboard" className="text-zinc-300 hover:text-white text-sm mt-2 inline-block">← Back to dashboard</Link>
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
          <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-6">
            <ArrowLeft className="h-4 w-4" /> All trips
          </Link>

          <div className="flex items-start justify-between gap-4 mb-2">
            <h1 className="text-3xl font-bold text-white">{trip.title}</h1>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost" size="sm"
                className="text-zinc-400 hover:text-white hover:bg-zinc-800"
                disabled={isExporting}
                onClick={handleExportPdf}
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <FileText className="h-4 w-4 mr-2" />
                )}
                PDF
              </Button>
              <Button
                variant="ghost" size="sm"
                className="text-zinc-400 hover:text-white hover:bg-zinc-800"
                disabled={isExporting}
                onClick={handleExportImage}
              >
                {isExporting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ImageIcon className="h-4 w-4 mr-2" />
                )}
                Image
              </Button>
              {trip && (
                <SharingSheet
                  tripId={id}
                  isPublic={trip.isPublic}
                  shareToken={trip.shareToken}
                  onShare={handleShareTrip}
                  onUnshare={handleUnshareTrip}
                />
              )}
              <Button
                variant="ghost" size="icon"
                className="text-zinc-500 hover:text-red-400 hover:bg-zinc-800 shrink-0"
                onClick={handleDeleteTrip}
                disabled={deleteTrip.isPending}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-3 mb-8 flex-wrap">
            <Badge className={`${STATUS_STYLES[trip.status ?? 'planned']} capitalize`}>{trip.status ?? 'planned'}</Badge>
            {(startDate || endDate) && (
              <span className="text-sm text-zinc-400">
                {startDate && endDate ? `${startDate} → ${endDate}` : startDate ?? endDate}
              </span>
            )}
            {trip?.description && <p className="w-full text-sm text-zinc-400 mt-1">{trip.description}</p>}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
            {/* Map */}
            <div className="order-1">
              <div ref={mapContainerRef} className="rounded-xl overflow-hidden border border-zinc-800 h-[300px] lg:h-[calc(100vh-16rem)] lg:sticky lg:top-8">
                <TripMap legs={trip.legs} />
              </div>
            </div>

            {/* Timeline */}
            <div className="order-2">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">
                  Timeline
                  <span className="ml-2 text-sm font-normal text-zinc-500">
                    ({trip.legs.length} legs · {entries.length} {entries.length === 1 ? 'entry' : 'entries'})
                  </span>
                </h2>
                <div className="flex gap-2">
                  <Button
                    size="sm" variant="ghost"
                    onClick={() => openNewEntry()}
                    className="text-zinc-400 hover:text-white hover:bg-zinc-800 gap-1.5"
                  >
                    <BookOpen className="h-4 w-4" /> Add entry
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => setAddLegOpen(true)}
                    className="bg-white text-zinc-900 hover:bg-zinc-100 gap-1.5"
                  >
                    <Plus className="h-4 w-4" /> Add leg
                  </Button>
                </div>
              </div>

              {trip.legs.length === 0 && entries.length === 0 ? (
                <div className="text-center py-12 rounded-xl border border-dashed border-zinc-800">
                  <p className="text-zinc-500 text-sm mb-3">No legs yet. Add the first train ride.</p>
                  <Button
                    variant="outline" size="sm"
                    onClick={() => setAddLegOpen(true)}
                    className="border-zinc-700 text-zinc-300 hover:bg-zinc-800 gap-1.5"
                  >
                    <Plus className="h-4 w-4" /> Add leg
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
                            className="text-xs text-zinc-700 hover:text-zinc-400 transition-colors py-1"
                          >
                            + add journal entry for this leg
                          </button>
                        </div>
                      </div>
                    )
                  })}

                  {trip.legs.length > 0 && (
                    <div className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className="w-2.5 h-2.5 rounded-full bg-zinc-600" />
                      </div>
                      <p className="text-sm text-zinc-600 pb-2">{trip.legs[trip.legs.length - 1]?.destName}</p>
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
      </div>

      {/* Journal editor modal */}
      {editorOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/70" onClick={() => setEditorOpen(false)} />
          <div className="relative z-10 w-full sm:max-w-2xl sm:rounded-xl bg-zinc-950 border border-zinc-800 flex flex-col h-[80vh] sm:h-[70vh]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
              <h3 className="text-sm font-medium text-white">
                {editingEntry ? 'Edit entry' : 'New journal entry'}
                {editorLegId && <span className="ml-2 text-zinc-500 font-normal">· linked to leg</span>}
              </h3>
              <button onClick={() => setEditorOpen(false)} className="text-zinc-500 hover:text-white transition-colors">
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
      <UpgradeModal feature="journal" open={upgradeOpen} onOpenChange={setUpgradeOpen} />
    </div>
  )
}
