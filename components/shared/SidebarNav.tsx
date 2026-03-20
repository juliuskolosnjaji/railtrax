'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Search, BarChart2, Train, Settings, Clock, LogIn, Map } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const ICON_MAP = {
  dashboard:     LayoutDashboard,
  search:        Search,
  stats:         BarChart2,
  trains:        Train,
  abfahrten:     Clock,
  settings:      Settings,
  trips:         Map,
} as const

type IconKey = keyof typeof ICON_MAP

interface NavItem {
  href:    string
  label:   string
  iconKey: IconKey
}

const PUBLIC_NAV: NavItem[] = [
  { href: '/search',        label: 'Verbindungssuche',  iconKey: 'search'    },
  { href: '/abfahrten',     label: 'Live Abfahrten',    iconKey: 'abfahrten' },
  { href: '/rolling-stock', label: 'Züge',              iconKey: 'trains'    },
]

const AUTH_NAV: NavItem[] = [
  { href: '/dashboard',     label: 'Übersicht',         iconKey: 'dashboard' },
  { href: '/search',        label: 'Verbindungssuche',  iconKey: 'search'    },
  { href: '/abfahrten',     label: 'Live Abfahrten',    iconKey: 'abfahrten' },
  { href: '/stats',         label: 'Statistik',         iconKey: 'stats'     },
  { href: '/trips',         label: 'Meine Reisen',      iconKey: 'trips'     },
  { href: '/settings',      label: 'Einstellungen',     iconKey: 'settings'  },
]

export function SidebarNav() {
  const pathname = usePathname()
  const [user, setUser] = useState<{ id: string } | null | undefined>(undefined)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  const navItems = user ? AUTH_NAV : PUBLIC_NAV

  return (
    <nav className="flex-1 px-2 py-4 space-y-0.5">
      {navItems.map(({ href, label, iconKey }) => {
        const Icon = ICON_MAP[iconKey]
        const isActive = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            className={
              isActive
                ? 'w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium bg-sidebar-accent text-sidebar-accent-foreground'
                : 'w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium text-sidebar-foreground hover:text-sidebar-accent-foreground hover:bg-sidebar-accent/50 transition-colors'
            }
          >
            <Icon className="h-4 w-4 shrink-0" />
            {label}
          </Link>
        )
      })}

      {user === null && (
        <a
          href="/login"
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md text-[13px] font-medium text-primary-foreground bg-primary hover:bg-primary/90 transition-colors mt-2"
          style={{ textDecoration: 'none' }}
        >
          <LogIn className="h-4 w-4 shrink-0" />
          Anmelden
        </a>
      )}
    </nav>
  )
}
