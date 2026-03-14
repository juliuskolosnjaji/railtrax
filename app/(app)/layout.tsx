import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LayoutDashboard, Search, BarChart2, Settings, Train } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { SignOutButton } from '@/components/shared/SignOutButton'
import { getPlan } from '@/lib/entitlements'
import { Logo } from '@/components/ui/Logo'

const NAV_ITEMS = [
  { href: '/dashboard',     label: 'Dashboard',      icon: LayoutDashboard },
  { href: '/search',        label: 'Suche',           icon: Search },
  { href: '/stats',         label: 'Statistik',       icon: BarChart2 },
  { href: '/rolling-stock', label: 'Züge',            icon: Train },
  { href: '/settings',      label: 'Einstellungen',   icon: Settings },
]

const PLAN_BADGE: Record<string, string> = {
  free: 'Free',
  plus: 'Plus',
  pro:  'Pro',
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const plan = getPlan(user.app_metadata as { plan?: string })
  const displayName = user.user_metadata?.username ?? user.email ?? 'User'
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined
  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: '#080d1a', color: '#fff' }}>
      {/* Sidebar */}
      <aside
        className="flex flex-col w-56 shrink-0"
        style={{ backgroundColor: '#080d1a', borderRight: '1px solid #1e2d4a' }}
      >
        {/* Logo */}
        <div className="flex items-center px-4 py-5">
          <Logo />
        </div>

        <div style={{ height: 1, backgroundColor: '#1e2d4a', margin: '0 16px' }} />

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-0.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm transition-colors hover:bg-[#111e35] hover:text-white"
              style={{ color: '#4a6a9a' }}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        <div style={{ height: 1, backgroundColor: '#1e2d4a' }} />

        {/* User info */}
        <div className="p-3 space-y-1">
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={avatarUrl} alt={displayName} />
              <AvatarFallback
                className="text-xs"
                style={{ backgroundColor: '#0d1f3c', color: '#8ba3c7' }}
              >
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: '#fff' }}>{displayName}</p>
              <p className="text-xs" style={{ color: '#4a6a9a' }}>
                {PLAN_BADGE[plan] ?? 'Free'}
              </p>
            </div>
          </div>
          <SignOutButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto" style={{ backgroundColor: '#080d1a' }}>
        {children}
      </main>
    </div>
  )
}
