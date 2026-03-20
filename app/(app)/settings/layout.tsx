'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Train, Bell, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

const SETTINGS_TABS = [
  { name: 'Verbindungen',      href: '/settings/connections',   icon: Train },
  { name: 'Benachrichtigungen', href: '/settings/notifications', icon: Bell },
  { name: 'Daten & Privatsphäre', href: '/settings/privacy',   icon: Shield },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col md:flex-row h-full bg-background">
      {/* Settings Sidebar */}
      <aside className="w-full md:w-56 shrink-0 border-b md:border-b-0 md:border-r border-border bg-surface px-4 py-6 md:px-5">
        <p className="text-[11px] font-semibold text-muted uppercase tracking-widest mb-4 px-3">
          Einstellungen
        </p>
        <nav className="flex flex-row md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0">
          {SETTINGS_TABS.map((tab) => {
            const isActive = pathname === tab.href
            const Icon = tab.icon

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors shrink-0',
                  isActive
                    ? 'bg-brand/10 text-brand border border-brand/20'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                )}
              >
                <Icon className={cn('w-4 h-4 shrink-0', isActive ? 'text-brand' : 'text-muted-foreground')} />
                {tab.name}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main Settings Content */}
      <main className="flex-1 overflow-y-auto bg-background">
        <div className="max-w-2xl mx-auto px-4 md:px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
