'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { CreditCard, Train, Bell, Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

const SETTINGS_TABS = [
  { name: 'Abonnement',        href: '/settings/billing',       icon: CreditCard },
  { name: 'Verbindungen',      href: '/settings/connections',   icon: Train },
  { name: 'Benachrichtigungen', href: '/settings/notifications', icon: Bell },
  { name: 'Daten & Privatsphäre', href: '/settings/privacy',   icon: Shield },
]

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
         className="md:flex-row">
      {/* Settings Sidebar */}
      <aside style={{
        flexShrink: 0, padding: 24,
        borderBottom: '1px solid #1e2d4a',
        background: '#080d1a',
      }} className="w-full md:w-64 md:border-b-0 md:border-r md:border-[#1e2d4a]">
        <h2 style={{
          fontSize: 11, fontWeight: 600, color: '#4a6a9a',
          textTransform: 'uppercase', letterSpacing: '0.08em',
          marginBottom: 16, paddingLeft: 12,
        }}>
          Einstellungen
        </h2>
        <nav className="flex flex-row md:flex-col gap-1 overflow-x-auto pb-2 md:pb-0">
          {SETTINGS_TABS.map((tab: any) => {
            const isActive = pathname === tab.href
            const Icon = tab.icon

            return (
              <Link
                key={tab.href}
                href={tab.href}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '8px 12px', borderRadius: 8,
                  fontSize: 14, fontWeight: 500,
                  textDecoration: 'none', whiteSpace: 'nowrap',
                  transition: 'background 0.15s, color 0.15s',
                  background: isActive ? '#0d1f3c' : 'transparent',
                  color: isActive ? '#fff' : '#4a6a9a',
                  border: isActive ? '1px solid #1e3a6e' : '1px solid transparent',
                }}
              >
                <Icon style={{ width: 16, height: 16, color: isActive ? '#4f8ef7' : '#4a6a9a' }} />
                {tab.name}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main Settings Content */}
      <div style={{ flex: 1, overflowY: 'auto', background: '#080d1a' }}>
        <div style={{ padding: '24px 16px', maxWidth: 768 }}
             className="md:p-8">
          {children}
        </div>
      </div>
    </div>
  )
}
