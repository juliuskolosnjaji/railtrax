'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CreditCard, Train } from 'lucide-react'
import { cn } from '@/lib/utils'

const SETTINGS_TABS = [
  { name: 'Billing', href: '/settings/billing', icon: CreditCard },
  { name: 'Connections', href: '/settings/connections', icon: Train },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col md:flex-row h-full">
      {/* Settings Sidebar */}
      <aside className="w-full md:w-64 shrink-0 border-b md:border-b-0 md:border-r border-zinc-800 bg-zinc-950/50 p-6 space-y-2">
        <h2 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider mb-4 px-3">
          Settings
        </h2>
        <nav className="flex flex-row md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0">
          {SETTINGS_TABS.map((tab) => {
            const isActive = pathname === tab.href
            const Icon = tab.icon

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  'flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors whitespace-nowrap',
                  isActive
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800/50'
                )}
              >
                <Icon className={cn('h-4 w-4', isActive ? 'text-zinc-200' : 'text-zinc-500')} />
                {tab.name}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main Settings Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-4 md:p-8 max-w-4xl">
          {children}
        </div>
      </div>
    </div>
  )
}
