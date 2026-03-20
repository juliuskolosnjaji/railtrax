'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Search, BarChart2, Settings, Clock, LogIn, Train } from 'lucide-react'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

const ICON_MAP = {
  dashboard: LayoutDashboard,
  search: Search,
  stats: BarChart2,
  abfahrten: Clock,
  settings: Settings,
  trains: Train,
  login: LogIn,
} as const

type IconKey = keyof typeof ICON_MAP

const PUBLIC_NAV = [
  { href: '/search',        label: 'Suche',     iconKey: 'search' as IconKey },
  { href: '/abfahrten',     label: 'Abfahrten', iconKey: 'abfahrten' as IconKey },
  { href: '/rolling-stock', label: 'Züge',      iconKey: 'trains' as IconKey },
  { href: '/login',         label: 'Anmelden',  iconKey: 'login' as IconKey },
]

const AUTH_NAV = [
  { href: '/dashboard',     label: 'Dashboard',      iconKey: 'dashboard' as IconKey },
  { href: '/search',        label: 'Suche',          iconKey: 'search' as IconKey },
  { href: '/abfahrten',     label: 'Abfahrten',      iconKey: 'abfahrten' as IconKey },
  { href: '/settings',      label: 'Einstellungen',  iconKey: 'settings' as IconKey },
]

export function MobileBottomNav() {
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
      {navItems.map(({ href, iconKey, label }) => {
        const Icon = ICON_MAP[iconKey]
        const isActive = pathname === href || pathname.startsWith(href + '/')
        const isLogin = href === '/login'
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
              color: isLogin ? '#4f8ef7' : isActive ? '#4f8ef7' : '#4a6a9a',
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
