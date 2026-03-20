import { createClient } from '@/lib/supabase/server'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { SignOutButton } from '@/components/shared/SignOutButton'
import { Logo } from '@/components/ui/Logo'
import { MobileBottomNav } from '@/components/shared/MobileBottomNav'
import { MobileHeader } from '@/components/shared/MobileHeader'
import { SidebarNav } from '@/components/shared/SidebarNav'
import { PageTransition } from '@/components/shared/PageTransition'

function LegalFooter() {
  return (
    <footer className="border-t border-sidebar-border px-6 py-4 flex gap-5 justify-center flex-wrap">
      {[
        { href: '/impressum',               label: 'Impressum' },
        { href: '/datenschutz',             label: 'Datenschutz' },
        { href: '/nutzungsbedingungen',     label: 'AGB' },
        { href: 'mailto:legal@railtrax.eu', label: 'Kontakt' },
      ].map(({ href, label }) => (
        <a key={href} href={href} className="tap-small text-[11px] text-muted-foreground/40 hover:text-muted-foreground transition-colors" style={{ textDecoration: 'none', minHeight: 'unset', minWidth: 'unset' }}>
          {label}
        </a>
      ))}
      <span className="text-[11px] text-muted-foreground/30">
        © {new Date().getFullYear()} Railtrax
      </span>
    </footer>
  )
}

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const displayName = user ? (user.user_metadata?.username ?? user.email ?? 'User') : null
  const avatarUrl = user ? (user.user_metadata?.avatar_url as string | undefined) : undefined
  const initials = displayName ? displayName.slice(0, 2).toUpperCase() : ''

  return (
    <div className="flex h-screen overflow-hidden bg-background text-foreground">
      {/* Mobile header + drawer */}
      <MobileHeader />

      {/* Desktop sidebar */}
      <aside
        className="sidebar-wrapper hidden md:flex flex-col w-56 shrink-0"
        style={{
          background: 'hsl(var(--sidebar-background))',
          borderRight: '1px solid hsl(var(--sidebar-border))',
        }}
      >
        {/* Logo */}
        <div className="flex items-center px-4 py-5">
          <Logo />
        </div>

        <div className="border-t border-sidebar-border mx-4" />

        {/* Nav */}
        <SidebarNav />

        <div className="border-t border-sidebar-border" />

        {/* User info */}
        <div className="px-3 py-3 space-y-1">
          {user ? (
            <>
              <div className="flex items-center gap-2.5 px-3 py-2">
                <div
                  className="w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-semibold shrink-0"
                  style={{ background: 'hsl(var(--primary) / 0.2)', color: 'hsl(var(--primary))' }}
                >
                  {initials || (
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={avatarUrl} alt={displayName ?? ''} />
                      <AvatarFallback className="text-[11px]" style={{ background: 'hsl(var(--primary) / 0.2)', color: 'hsl(var(--primary))' }}>
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-foreground truncate">{displayName}</p>
                  <p className="text-[11px] text-muted-foreground">@{displayName}</p>
                </div>
              </div>
              <SignOutButton />
            </>
          ) : (
            <a
              href="/login"
              className="flex items-center gap-2.5 px-3 py-2.5 rounded-md text-[13px] font-medium text-primary-foreground bg-primary hover:bg-primary/90 transition-colors"
              style={{ textDecoration: 'none' }}
            >
              Anmelden
            </a>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main
        className="main-content flex-1 overflow-y-auto flex flex-col"
        style={{ background: 'hsl(var(--background))' }}
      >
        <PageTransition className="flex-1">
          {children}
        </PageTransition>
        <LegalFooter />
      </main>

      {/* Mobile bottom nav */}
      <MobileBottomNav />
    </div>
  )
}
