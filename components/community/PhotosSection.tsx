'use client'

import { useState, useRef } from 'react'
import { Plus, X } from 'lucide-react'

interface PhotosSectionProps {
  communityTripId: string
  photos: { id: string; url: string; caption: string | null }[]
}

export function PhotosSection({ communityTripId, photos }: PhotosSectionProps) {
  const [uploading, setUploading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      await fetch(`/api/community/trips/${communityTripId}/photos`, {
        method: 'POST',
        body: formData,
      })

      window.location.reload()
    } catch {
      // silent fail
    } finally {
      setUploading(false)
    }
  }

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
        Fotos ({photos.length})
      </h3>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 8,
        }}
      >
        {photos.map((photo) => (
          <div
            key={photo.id}
            style={{
              aspectRatio: '1',
              borderRadius: 8,
              overflow: 'hidden',
              background: 'hsl(var(--secondary))',
            }}
          >
            <img
              src={photo.url}
              alt={photo.caption ?? ''}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          </div>
        ))}

        <button
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          style={{
            aspectRatio: '1',
            borderRadius: 8,
            border: '2px dashed hsl(var(--border))',
            background: 'transparent',
            cursor: uploading ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'hsl(var(--muted-foreground))',
            opacity: uploading ? 0.5 : 1,
          }}
        >
          {uploading ? <X size={20} /> : <Plus size={20} />}
        </button>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        onChange={handleUpload}
        style={{ display: 'none' }}
      />
    </div>
  )
}
