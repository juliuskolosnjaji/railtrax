'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Search, BarChart2, Settings, Clock } from 'lucide-react'

const ICON_MAP = {
  dashboard: LayoutDashboard,
  search: Search,
  stats: BarChart2,
  abfahrten: Clock,
  settings: Settings,
} as const

const NAV_ITEMS = [
  { href: '/dashboard',     label: 'Dashboard',  iconKey: 'dashboard' },
  { href: '/search',        label: 'Suche',     iconKey: 'search' },
  { href: '/abfahrten',     label: 'Abfahrten', iconKey: 'abfahrten' },
  { href: '/stats',         label: 'Statistik',  iconKey: 'stats' },
  { href: '/settings',      label: 'Einstellungen', iconKey: 'settings' },
] as const

export function MobileBottomNav() {
  const pathname = usePathname()

return (
    <nav
      className="bottom-nav mobile-bottom-nav"
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        background: '#0a1628',
        borderTop: '1px solid #1e2d4a',
        display: 'flex',
        height: 64,
      }}
    >
      {NAV_ITEMS.map(({ href, iconKey, label }) => {
        const Icon = ICON_MAP[iconKey as keyof typeof ICON_MAP]
        const isActive = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 3,
              color: isActive ? '#4f8ef7' : '#4a6a9a',
              textDecoration: 'none',
              fontSize: 10,
              minHeight: 44,
            }}
          >
            <Icon size={22} />
            <span>{label}</span>
          </Link>
        )
      })}
    </nav>
  )
}
