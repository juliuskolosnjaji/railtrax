'use client'

import { useState, useEffect } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Heart } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface CommentsSectionProps {
  communityTripId: string
  comments: {
    id: string
    text: string
    createdAt: string
    user: { id: string; username: string; avatarUrl: string | null }
    _count: { likes: number }
    likes: { userId: string }[]
  }[]
}

export function CommentsSection({
  communityTripId,
  comments: initialComments,
}: CommentsSectionProps) {
  const [text, setText] = useState('')
  const [comments, setComments] = useState(initialComments)
  const [user, setUser] = useState<{ id: string } | null>(null)
  const qc = useQueryClient()

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  const commentMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(
        `/api/community/trips/${communityTripId}/comments`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text }),
        },
      )
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onSuccess: (data) => {
      setComments((prev) => [...prev, data.data])
      setText('')
      qc.invalidateQueries({
        queryKey: ['community-trip', communityTripId],
      })
    },
  })

  const commentLikeMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const res = await fetch(
        `/api/community/comments/${commentId}/like`,
        { method: 'POST' },
      )
      if (!res.ok) throw new Error('Failed')
      return res.json()
    },
    onMutate: async (commentId) => {
      setComments((prev) =>
        prev.map((c) => {
          if (c.id !== commentId) return c
          const wasLiked = c.likes?.some((l) => l.userId === user?.id) ?? false
          return {
            ...c,
            _count: {
              likes: wasLiked
                ? Math.max(0, (c._count?.likes ?? 0) - 1)
                : (c._count?.likes ?? 0) + 1,
            },
            likes: wasLiked
              ? c.likes?.filter((l) => l.userId !== user?.id) ?? []
              : [...(c.likes ?? []), { userId: user?.id ?? '' }],
          }
        }),
      )
    },
  })

  return (
    <div
      style={{
        background: 'hsl(var(--card))',
        border: '1px solid hsl(var(--border))',
        borderRadius: 12,
        padding: '16px 20px',
        marginBottom: 16,
      }}
    >
      <h3
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: 'hsl(var(--foreground))',
          margin: 0,
          marginBottom: 12,
        }}
      >
        Kommentare ({comments.length})
      </h3>

      {/* Comment input */}
      {user ? (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Kommentar schreiben..."
            rows={2}
            style={{
              flex: 1,
              background: 'hsl(var(--background))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 8,
              padding: '8px 12px',
              color: 'hsl(var(--foreground))',
              fontSize: 13,
              resize: 'vertical',
              outline: 'none',
            }}
          />
          <button
            onClick={() => text.trim() && commentMutation.mutate()}
            disabled={!text.trim() || commentMutation.isPending}
            style={{
              height: 40,
              padding: '0 16px',
              background: 'hsl(var(--primary))',
              color: 'hsl(var(--primary-foreground))',
              border: 'none',
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 500,
              cursor: text.trim() ? 'pointer' : 'not-allowed',
              alignSelf: 'flex-end',
            }}
          >
            Senden
          </button>
        </div>
      ) : (
        <p
          style={{
            fontSize: 13,
            color: 'hsl(var(--muted-foreground))',
            marginBottom: 16,
          }}
        >
          <a href="/login" style={{ color: 'hsl(var(--primary))' }}>
            Anmelden
          </a>{' '}
          um zu kommentieren
        </p>
      )}

      {/* Comments list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {comments.map((comment) => {
          const isLiked = comment.likes?.some((l) => l.userId === user?.id) ?? false
          return (
            <div
              key={comment.id}
              style={{
                display: 'flex',
                gap: 10,
                paddingBottom: 12,
                borderBottom: '1px solid hsl(var(--border))',
              }}
            >
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: '50%',
                  background: 'hsl(var(--muted))',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 12,
                  color: 'hsl(var(--muted-foreground))',
                  flexShrink: 0,
                  overflow: 'hidden',
                }}
              >
                {comment.user.avatarUrl ? (
                  <img
                    src={comment.user.avatarUrl}
                    alt=""
                    style={{ width: 28, height: 28, borderRadius: '50%' }}
                  />
                ) : (
                  comment.user.username[0]?.toUpperCase()
                )}
              </div>
              <div style={{ flex: 1 }}>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginBottom: 4,
                  }}
                >
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 500,
                      color: 'hsl(var(--foreground))',
                    }}
                  >
                    {comment.user.username}
                  </span>
                  <span
                    style={{
                      fontSize: 11,
                      color: 'hsl(var(--muted-foreground))',
                    }}
                  >
                    {new Date(comment.createdAt).toLocaleDateString('de-DE', {
                      day: 'numeric',
                      month: 'short',
                    })}
                  </span>
                </div>
                <p
                  style={{
                    fontSize: 13,
                    color: 'hsl(var(--foreground))',
                    margin: 0,
                    lineHeight: 1.5,
                  }}
                >
                  {comment.text}
                </p>
                <button
                  onClick={() => commentLikeMutation.mutate(comment.id)}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: 0,
                    marginTop: 4,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    fontSize: 11,
                    color: isLiked ? 'hsl(var(--destructive))' : 'hsl(var(--muted-foreground))',
                    transition: 'color 0.15s',
                  }}
                >
                  <Heart size={12} fill={isLiked ? 'currentColor' : 'none'} />{' '}
                  {comment._count?.likes ?? 0}
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
