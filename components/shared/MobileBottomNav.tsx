'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { type LucideIcon } from 'lucide-react'
import { useBreakpoint } from '@/hooks/useBreakpoint'

interface NavItem {
  href: string
  label: string
  icon: LucideIcon
}

export function MobileBottomNav({ navItems }: { navItems: NavItem[] }) {
  const bp = useBreakpoint()
  const pathname = usePathname()

  if (bp !== 'mobile') return null

  return (
    <nav
      className="bottom-nav"
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
      {navItems.map(({ href, icon: Icon, label }) => {
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
