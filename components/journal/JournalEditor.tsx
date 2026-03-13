'use client'

import { useRef, useCallback, useState, useEffect } from 'react'
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import {
  Bold, Italic, List, Link as LinkIcon, ImageIcon, Loader2, X, Save,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useCreateJournalEntry, useUpdateJournalEntry } from '@/hooks/useJournal'

const MOOD_OPTIONS = ['😊', '😐', '😴', '🤩', '😤', '🌧️', '🥰', '😌']

interface JournalEditorProps {
  tripId: string
  legId?: string | null
  entry?: { id: string; body: string | null; mood: string | null } | null
  onSaved?: (entryId: string) => void
  onClose: () => void
}

interface EditorInnerProps extends JournalEditorProps {
  initialContent: object | undefined
}

function EditorInner({ tripId, legId, entry, onSaved, onClose, initialContent }: EditorInnerProps) {
  const entryIdRef = useRef<string | null>(entry?.id ?? null)
  const autosaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [mood, setMood] = useState(entry?.mood ?? '')
  const [lastSaved, setLastSaved] = useState<Date | null>(null)

  const createEntry = useCreateJournalEntry(tripId)
  const updateEntry = useUpdateJournalEntry(tripId)

  const saveContent = useCallback(async (doc: object, currentMood: string) => {
    setIsSaving(true)
    try {
      if (!entryIdRef.current) {
        const created = await createEntry.mutateAsync({
          trip_id: tripId,
          leg_id: legId ?? null,
          body: doc,
          mood: currentMood || null,
        })
        entryIdRef.current = created.id
        onSaved?.(created.id)
      } else {
        await updateEntry.mutateAsync({ id: entryIdRef.current, body: doc, mood: currentMood || null })
      }
      setLastSaved(new Date())
    } catch (err) {
      console.error('Journal autosave failed:', err)
    } finally {
      setIsSaving(false)
    }
  }, [tripId, legId, createEntry, updateEntry, onSaved])

  const scheduleAutosave = useCallback((doc: object, currentMood: string) => {
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)
    autosaveTimerRef.current = setTimeout(() => saveContent(doc, currentMood), 30_000)
  }, [saveContent])

  const editor = useEditor({
    extensions: [
      StarterKit,
      Image.configure({ inline: false }),
      Link.configure({ openOnClick: false }),
      Placeholder.configure({ placeholder: 'Write about this journey…' }),
    ],
    content: initialContent,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      scheduleAutosave(editor.getJSON(), mood)
    },
  })

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !editor) return

    if (!entryIdRef.current) {
      await saveContent(editor.getJSON(), mood)
    }
    if (!entryIdRef.current) return

    const formData = new FormData()
    formData.append('file', file)
    const res = await fetch(`/api/journal/${entryIdRef.current}/photos`, { method: 'POST', body: formData })
    if (!res.ok) return
    const json = await res.json()
    editor.chain().focus().setImage({ src: json.data.url }).run()
  }

  function handleSetLink() {
    if (!editor) return
    const url = window.prompt('URL')
    if (!url) return
    editor.chain().focus().setLink({ href: url }).run()
  }

  async function handleSave() {
    if (!editor) return
    if (autosaveTimerRef.current) clearTimeout(autosaveTimerRef.current)
    await saveContent(editor.getJSON(), mood)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-1 p-3 border-b border-zinc-800 flex-wrap">
        <button
          onClick={() => editor?.chain().focus().toggleBold().run()}
          className={`p-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors ${editor?.isActive('bold') ? 'text-white bg-zinc-800' : ''}`}
          title="Bold"
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          className={`p-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors ${editor?.isActive('italic') ? 'text-white bg-zinc-800' : ''}`}
          title="Italic"
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          className={`p-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors ${editor?.isActive('bulletList') ? 'text-white bg-zinc-800' : ''}`}
          title="Bullet list"
        >
          <List className="h-4 w-4" />
        </button>
        <button
          onClick={handleSetLink}
          className={`p-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors ${editor?.isActive('link') ? 'text-white bg-zinc-800' : ''}`}
          title="Link"
        >
          <LinkIcon className="h-4 w-4" />
        </button>
        <label className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer" title="Upload image">
          <ImageIcon className="h-4 w-4" />
          <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        </label>

        <div className="flex-1" />

        {/* Mood picker */}
        <div className="flex gap-0.5">
          {MOOD_OPTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => { setMood(m => m === emoji ? '' : emoji); scheduleAutosave(editor?.getJSON() ?? {}, mood === emoji ? '' : emoji) }}
              className={`w-7 h-7 rounded text-base transition-colors ${mood === emoji ? 'bg-zinc-700' : 'hover:bg-zinc-800'}`}
              title={`Mood: ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-y-auto p-4">
        <EditorContent
          editor={editor}
          className="prose prose-invert prose-sm max-w-none focus:outline-none min-h-[200px] [&_.tiptap]:outline-none [&_.tiptap_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.tiptap_p.is-editor-empty:first-child::before]:text-zinc-600 [&_.tiptap_p.is-editor-empty:first-child::before]:float-left [&_.tiptap_p.is-editor-empty:first-child::before]:pointer-events-none"
        />
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 p-3 border-t border-zinc-800">
        <span className="text-xs text-zinc-600">
          {isSaving ? (
            <span className="flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" /> Saving…</span>
          ) : lastSaved ? (
            `Saved ${lastSaved.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
          ) : 'Not saved yet'}
        </span>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" className="text-zinc-400 hover:text-white" onClick={onClose}>
            <X className="h-4 w-4 mr-1.5" /> Close
          </Button>
          <Button size="sm" className="bg-white text-zinc-900 hover:bg-zinc-100" onClick={handleSave} disabled={isSaving}>
            <Save className="h-4 w-4 mr-1.5" /> Save
          </Button>
        </div>
      </div>
    </div>
  )
}

export function JournalEditor(props: JournalEditorProps) {
  const [hydrated, setHydrated] = useState(false)
  useEffect(() => { setHydrated(true) }, [])

  let initialContent: object | undefined
  try {
    initialContent = props.entry?.body ? JSON.parse(props.entry.body) : undefined
  } catch {
    initialContent = undefined
  }

  if (!hydrated) return <div className="flex flex-col h-full bg-zinc-950" />
  return <EditorInner {...props} initialContent={initialContent} />
}
