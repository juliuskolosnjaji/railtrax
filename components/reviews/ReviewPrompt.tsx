'use client'

import { useState } from 'react'
import { Star } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'

interface ReviewLeg {
  id: string
  originName: string
  destName: string
  originIbnr?: string | null
  destIbnr?: string | null
  operator?: string | null
  trainType?: string | null
}

interface ReviewPromptProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  leg: ReviewLeg
  onComplete: () => void
}

export function ReviewPrompt({ open, onOpenChange, leg, onComplete }: ReviewPromptProps) {
  const [rating, setRating] = useState(0)
  const [hovered, setHovered] = useState(0)
  const [note, setNote] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    setSaving(true)
    try {
      await fetch(`/api/legs/${leg.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rating, note }),
      })
      onComplete()
      onOpenChange(false)
      setRating(0)
      setNote('')
    } catch {
      // silent fail for now
    } finally {
      setSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-zinc-900 border-zinc-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Rate this leg</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <p className="text-sm text-zinc-400">
            {leg.originName} → {leg.destName}
            {leg.operator && <span className="ml-2 text-zinc-500">({leg.operator})</span>}
          </p>

          <div className="space-y-1.5">
            <Label className="text-zinc-300 text-sm">Rating</Label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  onMouseEnter={() => setHovered(star)}
                  onMouseLeave={() => setHovered(0)}
                  className="p-0.5 transition-colors"
                >
                  <Star
                    className={`h-7 w-7 transition-colors ${
                      star <= (hovered || rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-zinc-600'
                    }`}
                  />
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-zinc-300 text-sm">Notes (optional)</Label>
            <Textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="How was the journey?"
              className="bg-zinc-800 border-zinc-700 text-white placeholder:text-zinc-500 resize-none"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-zinc-400 hover:text-white hover:bg-zinc-800"
            >
              Skip
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={rating === 0 || saving}
              className="bg-yellow-500 hover:bg-yellow-400 text-black font-medium"
            >
              Save review
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
