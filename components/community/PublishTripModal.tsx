'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { X } from 'lucide-react'

interface PublishTripModalProps {
  onClose: () => void
}

export function PublishTripModal({ onClose }: PublishTripModalProps) {
  const router = useRouter()
  const [selectedTripId, setSelectedTripId] = useState('')
  const [description, setDescription] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [publishing, setPublishing] = useState(false)

  const { data: trips } = useQuery({
    queryKey: ['trips'],
    queryFn: () =>
      fetch('/api/trips')
        .then((r) => r.json())
        .then((d) => d.data ?? []),
  })

  const handlePublish = async () => {
    if (!selectedTripId) return
    setPublishing(true)
    try {
      const res = await fetch('/api/community/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tripId: selectedTripId,
          description: description || null,
          isPublic,
        }),
      })

      if (res.ok) {
        onClose()
        router.push('/entdecken')
      }
    } catch {
      // silent
    } finally {
      setPublishing(false)
    }
  }

  return (
    <>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 100,
          background: 'rgba(0,0,0,0.5)',
          backdropFilter: 'blur(4px)',
        }}
      />
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 101,
          background: 'hsl(var(--card))',
          border: '1px solid hsl(var(--border))',
          borderRadius: '14px 14px 0 0',
          maxHeight: '92vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '14px 18px',
            borderBottom: '1px solid hsl(var(--border))',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            flexShrink: 0,
          }}
        >
          <button
            onClick={onClose}
            style={{
              width: 28,
              height: 28,
              borderRadius: 7,
              border: '1px solid hsl(var(--border))',
              background: 'hsl(var(--secondary))',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: 'hsl(var(--muted-foreground))',
              flexShrink: 0,
            }}
          >
            <X size={13} />
          </button>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: 14,
                fontWeight: 500,
                color: 'hsl(var(--foreground))',
              }}
            >
              Reise veröffentlichen
            </div>
            <div
              style={{
                fontSize: 12,
                color: 'hsl(var(--muted-foreground))',
                marginTop: 2,
              }}
            >
              Teile deine Reise mit der Community
            </div>
          </div>
        </div>

        {/* Body */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '20px 18px',
          }}
        >
          {/* Trip selector */}
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                fontSize: 12,
                color: 'hsl(var(--muted-foreground))',
                marginBottom: 6,
                display: 'block',
              }}
            >
              Reise auswählen
            </label>
            <select
              value={selectedTripId}
              onChange={(e) => setSelectedTripId(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 8,
                color: 'hsl(var(--foreground))',
                fontSize: 14,
                outline: 'none',
              }}
            >
              <option value="">— Reise wählen —</option>
              {trips?.map((trip: { id: string; title: string }) => (
                <option key={trip.id} value={trip.id}>
                  {trip.title}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div style={{ marginBottom: 16 }}>
            <label
              style={{
                fontSize: 12,
                color: 'hsl(var(--muted-foreground))',
                marginBottom: 6,
                display: 'block',
              }}
            >
              Beschreibung (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Erzähl von deiner Reise..."
              rows={3}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'hsl(var(--background))',
                border: '1px solid hsl(var(--border))',
                borderRadius: 8,
                color: 'hsl(var(--foreground))',
                fontSize: 14,
                outline: 'none',
                resize: 'vertical',
              }}
            />
          </div>

          {/* Public toggle */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 0',
              borderTop: '1px solid hsl(var(--border))',
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: 'hsl(var(--foreground))',
                }}
              >
                Öffentlich
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: 'hsl(var(--muted-foreground))',
                }}
              >
                Jeder kann diese Reise sehen
              </div>
            </div>
            <button
              onClick={() => setIsPublic(!isPublic)}
              style={{
                width: 44,
                height: 24,
                borderRadius: 12,
                border: 'none',
                background: isPublic ? 'hsl(var(--primary))' : 'hsl(var(--muted))',
                cursor: 'pointer',
                position: 'relative',
                transition: 'background 0.2s',
              }}
            >
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: '50%',
                  background: '#fff',
                  position: 'absolute',
                  top: 3,
                  left: isPublic ? 23 : 3,
                  transition: 'left 0.2s',
                }}
              />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 16px',
            borderTop: '1px solid hsl(var(--border))',
            flexShrink: 0,
          }}
        >
          <button
            onClick={handlePublish}
            disabled={!selectedTripId || publishing}
            style={{
              width: '100%',
              height: 42,
              background:
                !selectedTripId || publishing
                  ? 'hsl(var(--muted))'
                  : 'hsl(var(--primary))',
              color: 'hsl(var(--primary-foreground))',
              border: 'none',
              borderRadius: 9,
              fontSize: 14,
              fontWeight: 600,
              cursor: !selectedTripId || publishing ? 'not-allowed' : 'pointer',
            }}
          >
            {publishing ? 'Veröffentliche...' : 'Veröffentlichen'}
          </button>
        </div>
      </div>
    </>
  )
}
