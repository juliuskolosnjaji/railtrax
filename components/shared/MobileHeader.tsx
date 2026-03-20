'use client'

import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Logo } from '@/components/ui/Logo'
import { SidebarNav } from './SidebarNav'

export function MobileHeader() {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Fixed top bar — mobile only */}
      <header
        className="md:hidden fixed top-0 left-0 right-0 z-30 flex items-center px-4 h-14"
        style={{
          background: 'hsl(var(--sidebar-background))',
          borderBottom: '1px solid hsl(var(--sidebar-border))',
        }}
      >
        <button
          onClick={() => setOpen(true)}
          className="tap-small w-9 h-9 rounded-lg border flex items-center justify-center transition-colors"
          style={{
            borderColor: 'hsl(var(--border))',
            color: 'hsl(var(--muted-foreground))',
            minHeight: 'unset',
            minWidth: 'unset',
          }}
          aria-label="Menü öffnen"
        >
          <Menu className="w-4 h-4" />
        </button>
        <div className="flex items-center gap-2 ml-3">
          <Logo />
        </div>
      </header>

      {/* Drawer overlay */}
      {open && (
        <div
          className="md:hidden fixed inset-0 z-40"
          onClick={() => setOpen(false)}
          style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
        />
      )}

      {/* Drawer panel */}
      <div
        className="md:hidden fixed top-0 left-0 bottom-0 z-50 w-64 flex flex-col transition-transform duration-200"
        style={{
          background: 'hsl(var(--sidebar-background))',
          borderRight: '1px solid hsl(var(--sidebar-border))',
          transform: open ? 'translateX(0)' : 'translateX(-100%)',
        }}
      >
        <div className="flex items-center justify-between px-4 h-14" style={{ borderBottom: '1px solid hsl(var(--sidebar-border))' }}>
          <Logo />
          <button
            onClick={() => setOpen(false)}
            className="tap-small w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{ color: 'hsl(var(--muted-foreground))', minHeight: 'unset', minWidth: 'unset' }}
            aria-label="Menü schließen"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto" onClick={() => setOpen(false)}>
          <SidebarNav />
        </div>
      </div>
    </>
  )
}
