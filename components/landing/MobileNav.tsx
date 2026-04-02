'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Menu, X } from 'lucide-react'

const NAV_LINKS = [
  { href: '#features', label: 'Features' },
  { href: '#wie-es-funktioniert', label: "So funktioniert's" },
  { href: '#züge', label: 'Züge' },
]

export function MobileNav() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handleOutsideClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleOutsideClick)
    return () => document.removeEventListener('mousedown', handleOutsideClick)
  }, [open])

  return (
    <div className="md:hidden" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="w-9 h-9 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
        aria-label={open ? 'Menü schließen' : 'Menü öffnen'}
      >
        {open ? <X size={18} /> : <Menu size={18} />}
      </button>

      {open && (
        <div className="absolute top-16 left-0 right-0 bg-background border-b border-border z-50 px-5 py-4 flex flex-col gap-1">
          {NAV_LINKS.map(({ href, label }) => (
            <a
              key={href}
              href={href}
              onClick={() => setOpen(false)}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-2.5"
            >
              {label}
            </a>
          ))}
          <div className="border-t border-border mt-2 pt-3 flex flex-col gap-2">
            <Link
              href="/login"
              onClick={() => setOpen(false)}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              Anmelden
            </Link>
            <Link
              href="/signup"
              onClick={() => setOpen(false)}
              className="bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium rounded-md px-4 h-10 inline-flex items-center justify-center transition-colors"
            >
              Kostenlos starten
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
