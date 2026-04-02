'use client'

import { useEffect, useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import { Camera } from 'lucide-react'

interface UserProfile {
  displayName: string | null
  avatarUrl: string | null
  username: string
  email: string
}

export default function ProfileClient() {
  const qc = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [editing, setEditing] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const { data: profile } = useQuery<UserProfile>({
    queryKey: ['user-profile'],
    queryFn: () =>
      fetch('/api/user/profile')
        .then((r) => r.json())
        .then((d) => d.data ?? d),
  })

  useEffect(() => {
    if (profile?.displayName) {
      setDisplayName(profile.displayName)
    }
  }, [profile?.displayName])

  const updateProfile = useMutation({
    mutationFn: async (data: { displayName?: string | null; avatarUrl?: string | null }) => {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Failed')
      }
      return res.json()
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['user-profile'] })
      setEditing(false)
    },
  })

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !profile) return

    const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp']
    const MAX_BYTES = 5 * 1024 * 1024 // 5 MB

    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError('Nur JPEG, PNG oder WebP erlaubt.')
      return
    }
    if (file.size > MAX_BYTES) {
      setUploadError('Bild darf maximal 5 MB groß sein.')
      return
    }

    setUploadError(null)
    setUploading(true)
    try {
      const supabase = createClient()

      const ext = file.name.split('.').pop()
      const path = `avatars/${profile.username}-${Date.now()}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from('photos')
        .upload(path, file)

      if (uploadError) throw new Error(uploadError.message)

      const {
        data: { publicUrl },
      } = supabase.storage.from('photos').getPublicUrl(path)

      await supabase.auth.updateUser({
        data: { avatar_url: publicUrl },
      })

      qc.invalidateQueries({ queryKey: ['user-profile'] })
    } catch (err) {
      console.error('Avatar upload failed:', err)
      setUploadError('Upload fehlgeschlagen. Bitte erneut versuchen.')
    } finally {
      setUploading(false)
    }
  }

  const handleSave = () => {
    updateProfile.mutate({ displayName: displayName.trim() || null })
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-foreground tracking-tight">Profil</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Dein öffentlicher Profilname und Avatar
        </p>
      </div>

      {uploadError && (
        <div className="text-xs text-red-400 bg-red-950/40 border border-red-900/50 rounded-lg px-3 py-2">
          {uploadError}
        </div>
      )}

      {/* Avatar */}
      <div className="flex items-center gap-6">
        <div className="relative">
          <div
            className="w-20 h-20 rounded-full bg-muted flex items-center justify-center text-2xl font-bold text-muted-foreground overflow-hidden border-2 border-border"
          >
            {profile?.avatarUrl ? (
              <img
                src={profile.avatarUrl}
                alt="Avatar"
                className="w-full h-full object-cover"
              />
            ) : (
              profile?.displayName?.[0]?.toUpperCase() ??
              profile?.username?.[0]?.toUpperCase() ??
              '?'
            )}
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center border-2 border-background hover:bg-primary/90 transition-colors"
            title="Avatar ändern"
          >
            <Camera className="w-3.5 h-3.5" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleAvatarUpload}
            className="hidden"
          />
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">
            {profile?.displayName || profile?.username || '–'}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {profile?.email}
          </p>
        </div>
      </div>

      {/* Display Name */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">
          Anzeigename
        </label>
        {editing ? (
          <div className="flex gap-3">
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Wie möchtest du genannt werden?"
              maxLength={50}
              className="flex-1 bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-brand"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave()
                if (e.key === 'Escape') {
                  setEditing(false)
                  setDisplayName(profile?.displayName ?? '')
                }
              }}
              autoFocus
            />
            <button
              onClick={handleSave}
              disabled={updateProfile.isPending}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              Speichern
            </button>
            <button
              onClick={() => {
                setEditing(false)
                setDisplayName(profile?.displayName ?? '')
              }}
              className="px-4 py-2 rounded-lg border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Abbrechen
            </button>
          </div>
        ) : (
          <div
            onClick={() => {
              setEditing(true)
              setDisplayName(profile?.displayName ?? '')
            }}
            className="flex items-center justify-between bg-card border border-border rounded-lg px-3 py-2.5 cursor-pointer hover:border-muted-foreground/30 transition-colors"
          >
            <span className="text-sm text-foreground">
              {profile?.displayName || (
                <span className="text-muted-foreground">Noch kein Anzeigename</span>
              )}
            </span>
            <span className="text-xs text-muted-foreground">Bearbeiten</span>
          </div>
        )}
        <p className="text-xs text-muted-foreground">
          Dein Anzeigename wird in der Community und bei Kommentaren angezeigt.
        </p>
      </div>

      {/* Username (read-only) */}
      <div className="space-y-3">
        <label className="text-sm font-medium text-foreground">
          Benutzername
        </label>
        <div className="bg-card border border-border rounded-lg px-3 py-2.5 text-sm text-muted-foreground">
          {profile?.username || '–'}
        </div>
        <p className="text-xs text-muted-foreground">
          Dein Benutzername kann nicht geändert werden.
        </p>
      </div>
    </div>
  )
}
