'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { Star } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { useUser } from '@/hooks/useUser'

interface ReviewData {
  id: string
  operator: string | null
  trainType: string | null
  scoreOverall: number
  scoreScenery: number | null
  scoreComfort: number | null
  scorePunctuality: number | null
  scoreWifi: number | null
  text: string | null
  createdAt: string
  username: string
}

interface RouteReviewsProps {
  originIbnr: string
  destIbnr: string
}

function StarRating({
  value,
  onChange,
  disabled,
}: {
  value: number
  onChange: (v: number) => void
  disabled?: boolean
}) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          disabled={disabled}
          className="p-0.5 hover:scale-110 transition-transform"
        >
          <Star
            className={`h-4 w-4 ${
              n <= value ? 'fill-yellow-400 text-yellow-400' : 'text-zinc-600'
            }`}
          />
        </button>
      ))}
    </div>
  )
}

function ScoreBar({ label, score }: { label: string; score: number | null }) {
  if (score === null) return null
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-zinc-500 w-20">{label}</span>
      <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
        <div
          className="h-full bg-violet-500 rounded-full"
          style={{ width: `${(score / 5) * 100}%` }}
        />
      </div>
      <span className="text-xs text-zinc-400 w-8 text-right">{score.toFixed(1)}</span>
    </div>
  )
}

function ReviewForm({
  originIbnr,
  destIbnr,
  legId,
  onCancel,
  onSuccess,
}: {
  originIbnr: string
  destIbnr: string
  legId?: string
  onCancel: () => void
  onSuccess: () => void
}) {
  const queryClient = useQueryClient()
  const { user } = useUser()
  
  const [scoreOverall, setScoreOverall] = useState(0)
  const [scoreScenery, setScoreScenery] = useState(0)
  const [scoreComfort, setScoreComfort] = useState(0)
  const [scorePunctuality, setScorePunctuality] = useState(0)
  const [scoreWifi, setScoreWifi] = useState(0)
  const [text, setText] = useState('')

  const createMutation = useMutation({
    mutationFn: async (data: { legId: string; originIbnr: string; destIbnr: string; operator?: string; trainType?: string; scoreOverall: number; scoreScenery?: number; scoreComfort?: number; scorePunctuality?: number; scoreWifi?: number; text?: string }) => {
      const res = await fetch('/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) throw new Error('Failed to submit review')
      return res.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', originIbnr, destIbnr] })
      onSuccess()
    },
  })

  const handleSubmit = () => {
    if (scoreOverall === 0) return
    createMutation.mutate({
      legId: legId || '00000000-0000-0000-0000-000000000000',
      originIbnr,
      destIbnr,
      scoreOverall,
      scoreScenery: scoreScenery || undefined,
      scoreComfort: scoreComfort || undefined,
      scorePunctuality: scorePunctuality || undefined,
      scoreWifi: scoreWifi || undefined,
      text: text || undefined,
    })
  }

  return (
    <div className="bg-zinc-900 rounded-lg p-4 space-y-4">
      <div>
        <p className="text-xs text-zinc-500 mb-1">Overall rating *</p>
        <StarRating value={scoreOverall} onChange={setScoreOverall} disabled={!user} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-zinc-500 mb-1">Scenery</p>
          <StarRating value={scoreScenery} onChange={setScoreScenery} disabled={!user} />
        </div>
        <div>
          <p className="text-xs text-zinc-500 mb-1">Comfort</p>
          <StarRating value={scoreComfort} onChange={setScoreComfort} disabled={!user} />
        </div>
        <div>
          <p className="text-xs text-zinc-500 mb-1">Punctuality</p>
          <StarRating value={scorePunctuality} onChange={setScorePunctuality} disabled={!user} />
        </div>
        <div>
          <p className="text-xs text-zinc-500 mb-1">WiFi</p>
          <StarRating value={scoreWifi} onChange={setScoreWifi} disabled={!user} />
        </div>
      </div>

      <div>
        <Textarea
          placeholder="Share your experience (optional)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="bg-zinc-800 border-zinc-700 text-sm"
          maxLength={2000}
        />
      </div>

      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={scoreOverall === 0 || createMutation.isPending}
        >
          {createMutation.isPending ? 'Submitting...' : 'Submit review'}
        </Button>
      </div>
    </div>
  )
}

export function RouteReviews({ originIbnr, destIbnr }: RouteReviewsProps) {
  const [showForm, setShowForm] = useState(false)
  const { user } = useUser()

  const { data, isLoading } = useQuery<{
    data: {
      count: number
      aggregate: {
        avgOverall: number
        avgScenery: number | null
        avgComfort: number | null
        avgPunctuality: number | null
        avgWifi: number | null
      } | null
      reviews: ReviewData[]
    }
  }>({
    queryKey: ['reviews', originIbnr, destIbnr],
    queryFn: () =>
      fetch(`/api/reviews?origin=${originIbnr}&destination=${destIbnr}`).then((r) => r.json()),
  })

  if (isLoading) {
    return <div className="animate-pulse h-20 bg-zinc-900 rounded-lg" />
  }

  const { count, aggregate, reviews } = data?.data ?? { count: 0, aggregate: null, reviews: [] }

  return (
    <div className="space-y-4">
      {/* Aggregate scores */}
      {aggregate && (
        <div className="bg-zinc-900 rounded-lg p-4 space-y-2">
          <div className="flex items-center gap-3 mb-3">
            <span className="text-2xl font-bold text-white">
              {aggregate.avgOverall.toFixed(1)}
            </span>
            <div className="flex">
              {[1, 2, 3, 4, 5].map((n) => (
                <Star
                  key={n}
                  className={`h-4 w-4 ${
                    n <= Math.round(aggregate.avgOverall)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-zinc-600'
                  }`}
                />
              ))}
            </div>
            <span className="text-xs text-zinc-500">{count} reviews</span>
          </div>

          <ScoreBar label="Scenery" score={aggregate.avgScenery} />
          <ScoreBar label="Comfort" score={aggregate.avgComfort} />
          <ScoreBar label="Punctuality" score={aggregate.avgPunctuality} />
          <ScoreBar label="WiFi" score={aggregate.avgWifi} />
        </div>
      )}

      {/* Review list */}
      {reviews.length > 0 && (
        <div className="space-y-2">
          {reviews.map((review) => (
            <div key={review.id} className="bg-zinc-900 rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">@{review.username}</span>
                  {review.operator && (
                    <span className="text-xs px-1.5 py-0.5 bg-zinc-800 rounded text-zinc-400">
                      {review.operator}
                    </span>
                  )}
                </div>
                <div className="flex">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <Star
                      key={n}
                      className={`h-3 w-3 ${
                        n <= review.scoreOverall
                          ? 'fill-yellow-400 text-yellow-400'
                          : 'text-zinc-600'
                      }`}
                    />
                  ))}
                </div>
              </div>
              {review.text && <p className="text-sm text-zinc-400">{review.text}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Add review button or form */}
      {user && !showForm && (
        <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
          Write a review
        </Button>
      )}

      {showForm && (
        <ReviewForm
          originIbnr={originIbnr}
          destIbnr={destIbnr}
          onCancel={() => setShowForm(false)}
          onSuccess={() => setShowForm(false)}
        />
      )}

      {!user && count === 0 && (
        <p className="text-sm text-zinc-500 text-center py-2">No reviews yet</p>
      )}
    </div>
  )
}
