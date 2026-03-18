'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Search, BarChart2, Train, Settings, Clock } from 'lucide-react'

const ICON_MAP = {
  dashboard:     LayoutDashboard,
  search:        Search,
  stats:         BarChart2,
  trains:        Train,
  abfahrten:     Clock,
  settings:      Settings,
} as const

type IconKey = keyof typeof ICON_MAP

interface NavItem {
  href:    string
  label:   string
  iconKey: IconKey
}

const NAV_ITEMS: NavItem[] = [
  { href: '/dashboard',     label: 'Übersicht',         iconKey: 'dashboard' },
  { href: '/search',        label: 'Verbindungssuche',  iconKey: 'search'    },
  { href: '/abfahrten',     label: 'Live Abfahrten',    iconKey: 'abfahrten'  },
  { href: '/stats',         label: 'Statistik',         iconKey: 'stats'     },
  { href: '/rolling-stock', label: 'Meine Züge',        iconKey: 'trains'    },
  { href: '/settings',      label: 'Einstellungen',     iconKey: 'settings'  },
]

export function SidebarNav() {
  const pathname = usePathname()

  return (
    <nav className="flex-1 px-2 py-4 space-y-0.5">
      {NAV_ITEMS.map(({ href, label, iconKey }) => {
        const Icon = ICON_MAP[iconKey]
        const isActive = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors hover:bg-[#111e35] hover:text-white"
            style={{ color: isActive ? '#fff' : '#4a6a9a', background: isActive ? '#111e35' : undefined }}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}
