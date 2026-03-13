import Link from 'next/link'
import { redirect } from 'next/navigation'
import { LayoutDashboard, Search, BarChart2, Settings } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { SignOutButton } from '@/components/shared/SignOutButton'
import { getPlan } from '@/lib/entitlements'

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/search', label: 'Search', icon: Search },
  { href: '/stats', label: 'Stats', icon: BarChart2 },
  { href: '/settings', label: 'Settings', icon: Settings },
]

const PLAN_BADGE: Record<string, string> = {
  free: 'Free',
  plus: 'Plus',
  pro: 'Pro',
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const plan = getPlan(user.app_metadata as { plan?: string })
  const displayName = user.user_metadata?.username ?? user.email ?? 'User'
  const avatarUrl = user.user_metadata?.avatar_url as string | undefined
  const initials = displayName.slice(0, 2).toUpperCase()

  return (
    <div className="flex h-screen bg-zinc-950 text-white overflow-hidden">
      {/* Sidebar */}
      <aside className="flex flex-col w-56 shrink-0 border-r border-zinc-800 bg-zinc-900">
        {/* Logo */}
        <div className="flex items-center gap-2 px-4 py-5">
          <span className="text-xl">🚂</span>
          <span className="font-semibold text-white">RailPlanner</span>
        </div>

        <Separator className="bg-zinc-800" />

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-0.5">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          ))}
        </nav>

        <Separator className="bg-zinc-800" />

        {/* User info */}
        <div className="p-3 space-y-1">
          <div className="flex items-center gap-3 px-2 py-2">
            <Avatar className="h-8 w-8 shrink-0">
              <AvatarImage src={avatarUrl} alt={displayName} />
              <AvatarFallback className="bg-zinc-700 text-zinc-300 text-xs">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{displayName}</p>
              <p className="text-xs text-zinc-500">
                {PLAN_BADGE[plan] ?? 'Free'}
              </p>
            </div>
          </div>
          <SignOutButton />
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
