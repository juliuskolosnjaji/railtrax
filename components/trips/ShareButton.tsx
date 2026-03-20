'use client'

import { useState, useRef, useEffect } from 'react'
import { Share2, X, Link2, Copy, Check, Mail } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Trip {
  shareToken?: string | null
  isPublic?: boolean
}

interface ShareButtonProps {
  trip: Trip
  onShare?: () => Promise<void>
  onUnshare?: () => Promise<void>
}

export function ShareButton({ trip, onShare, onUnshare }: ShareButtonProps) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const [sharing, setSharing] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const shareUrl = trip.shareToken
    ? `${(process.env.NEXT_PUBLIC_URL ?? 'https://railtrax.eu').replace(/\/+$/, '')}/trip/${trip.shareToken}`
    : null

  useEffect(() => {
    function handleOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [open])

  async function handleToggleShare() {
    setSharing(true)
    try {
      if (trip.isPublic && onUnshare) await onUnshare()
      else if (onShare) await onShare()
    } finally {
      setSharing(false)
    }
  }

  function copyLink() {
    if (!shareUrl) return
    navigator.clipboard.writeText(shareUrl)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="tap-small h-8 px-3 rounded-lg border flex items-center gap-1.5 text-[13px] transition-colors"
        style={{
          borderColor: open ? 'hsl(var(--primary) / 0.5)' : 'hsl(var(--border))',
          color: open ? 'hsl(var(--primary))' : 'hsl(var(--muted-foreground))',
          background: open ? 'hsl(var(--primary) / 0.08)' : 'transparent',
          minHeight: 'unset', minWidth: 'unset',
        }}
      >
        <Share2 className="w-3.5 h-3.5" />
        Teilen
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 6 }}
            transition={{ duration: 0.12 }}
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              zIndex: 50,
              width: 280,
              background: 'hsl(var(--card))',
              border: '1px solid hsl(var(--border))',
              borderRadius: 12,
              boxShadow: '0 12px 40px rgba(0,0,0,0.4)',
              overflow: 'hidden',
            }}
          >
            {/* Header */}
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 14px',
              borderBottom: '1px solid hsl(var(--border))',
            }}>
              <span style={{ fontSize: 13, fontWeight: 500, color: 'hsl(var(--foreground))' }}>
                Reise teilen
              </span>
              <button
                onClick={() => setOpen(false)}
                className="tap-small w-6 h-6 rounded flex items-center justify-center transition-colors"
                style={{ color: 'hsl(var(--muted-foreground))', minHeight: 'unset', minWidth: 'unset' }}
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            <div style={{ padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {/* Enable sharing toggle */}
              {!trip.isPublic ? (
                <button
                  onClick={handleToggleShare}
                  disabled={sharing}
                  style={{
                    width: '100%', padding: '10px 14px',
                    background: 'hsl(var(--primary) / 0.1)',
                    border: '1px solid hsl(var(--primary) / 0.3)',
                    borderRadius: 8, cursor: 'pointer',
                    fontSize: 13, color: 'hsl(var(--primary))', fontWeight: 500,
                    textAlign: 'left',
                  }}
                >
                  {sharing ? 'Wird aktiviert…' : '🔗 Link-Sharing aktivieren'}
                </button>
              ) : (
                <>
                  {/* Copy link */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: 'hsl(var(--muted))', borderRadius: 8,
                    padding: '8px 12px',
                    border: '1px solid hsl(var(--border))',
                  }}>
                    <Link2 style={{ width: 13, height: 13, color: 'hsl(var(--muted-foreground))', flexShrink: 0 }} />
                    <span style={{
                      flex: 1, fontSize: 11, color: 'hsl(var(--muted-foreground))',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {shareUrl}
                    </span>
                    <button
                      onClick={copyLink}
                      className="tap-small flex items-center gap-1 rounded px-2 py-1 text-[12px] font-medium transition-colors"
                      style={{
                        background: copied ? 'hsl(var(--primary) / 0.15)' : 'hsl(var(--secondary))',
                        color: copied ? 'hsl(var(--primary))' : 'hsl(var(--foreground))',
                        border: 'none', cursor: 'pointer',
                        minHeight: 'unset', minWidth: 'unset',
                      }}
                    >
                      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copied ? 'Kopiert' : 'Kopieren'}
                    </button>
                  </div>

                   {/* Social share */}
                   <div style={{ display: 'flex', gap: 6 }}>
                     {[
                       {
                         label: 'E-Mail',
                         icon: <Mail className="w-3.5 h-3.5" />,
                         href: `mailto:?subject=Meine%20Reise%20auf%20Railtrax&body=${encodeURIComponent(shareUrl ?? '')}`,
                       },
                       {
                         label: 'WhatsApp',
                         icon: (
                           <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                             <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                           </svg>
                         ),
                         href: `https://wa.me/?text=${encodeURIComponent(shareUrl ?? '')}`,
                       },
                     ].map(({ label, icon, href }) => (
                       <a
                         key={label}
                         href={href}
                         target="_blank"
                         rel="noopener noreferrer"
                         className="tap-small flex-1 flex items-center justify-center gap-1.5 rounded-lg text-[12px] py-2 transition-colors"
                         style={{
                           background: 'hsl(var(--secondary))',
                           color: 'hsl(var(--secondary-foreground))',
                           border: '1px solid hsl(var(--border))',
                           textDecoration: 'none',
                           minHeight: 'unset',
                         }}
                       >
                         {icon}
                         {label}
                       </a>
                     ))}
                   </div>

                  {/* Disable sharing */}
                  <button
                    onClick={handleToggleShare}
                    disabled={sharing}
                    style={{
                      background: 'none', border: 'none',
                      fontSize: 11, color: 'hsl(var(--muted-foreground))',
                      cursor: 'pointer', textAlign: 'center', width: '100%',
                      padding: '4px 0',
                    }}
                  >
                    {sharing ? 'Wird deaktiviert…' : 'Link-Sharing deaktivieren'}
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
