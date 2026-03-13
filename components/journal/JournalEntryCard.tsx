'use client'

import { useState } from 'react'
import { generateHTML } from '@tiptap/html'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Lightbox from 'yet-another-react-lightbox'
import 'yet-another-react-lightbox/styles.css'
import { MapPin, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useDeleteJournalEntry, type JournalEntry } from '@/hooks/useJournal'

const TIPTAP_EXTENSIONS = [StarterKit, Image, Link]

function renderBody(body: string | null): string {
  if (!body) return ''
  try {
    const doc = JSON.parse(body)
    return generateHTML(doc, TIPTAP_EXTENSIONS)
  } catch {
    return body
  }
}

interface JournalEntryCardProps {
  entry: JournalEntry
  tripId: string
  onEdit: (entry: JournalEntry) => void
  indented?: boolean
}

export function JournalEntryCard({ entry, tripId, onEdit, indented }: JournalEntryCardProps) {
  const [lightboxIndex, setLightboxIndex] = useState(-1)
  const deleteEntry = useDeleteJournalEntry(tripId)

  const html = renderBody(entry.body)
  const slides = entry.photos.map((p) => ({ src: p.url, title: p.caption ?? undefined }))

  async function handleDelete() {
    if (!confirm('Delete this journal entry?')) return
    await deleteEntry.mutateAsync(entry.id)
  }

  return (
    <div className={`group ${indented ? 'ml-6 border-l-2 border-zinc-800 pl-4' : ''}`}>
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4 space-y-3">
        {/* Header */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            {entry.mood && <span className="text-base">{entry.mood}</span>}
            <span>{new Date(entry.createdAt).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
            {entry.locationName && (
              <span className="flex items-center gap-1">
                <MapPin className="h-3 w-3" />
                {entry.locationName}
              </span>
            )}
          </div>
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              variant="ghost" size="icon"
              className="h-7 w-7 text-zinc-500 hover:text-white hover:bg-zinc-800"
              onClick={() => onEdit(entry)}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost" size="icon"
              className="h-7 w-7 text-zinc-500 hover:text-red-400 hover:bg-zinc-800"
              onClick={handleDelete}
              disabled={deleteEntry.isPending}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Body */}
        {html && (
          <div
            className="prose prose-invert prose-sm max-w-none text-zinc-300 [&_a]:text-blue-400 [&_a]:underline [&_img]:rounded-lg [&_img]:max-h-64 [&_img]:object-cover"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}

        {/* Photo grid */}
        {entry.photos.length > 0 && (
          <div className="grid grid-cols-3 gap-2 mt-2">
            {entry.photos.map((photo, i) => (
              <button
                key={photo.id}
                onClick={() => setLightboxIndex(i)}
                className="aspect-square rounded-lg overflow-hidden border border-zinc-800 hover:border-zinc-600 transition-colors"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={photo.url} alt={photo.caption ?? ''} className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <Lightbox
        open={lightboxIndex >= 0}
        close={() => setLightboxIndex(-1)}
        index={lightboxIndex}
        slides={slides}
      />
    </div>
  )
}
