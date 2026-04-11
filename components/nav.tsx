'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const links = [
  { href: '/', label: 'Dashboard' },
  { href: '/customers', label: 'Customers' },
  { href: '/reports', label: 'Reports' },
  { href: '/plans', label: 'Plans' },
]

export function Nav() {
  const pathname = usePathname()
  return (
    <header className="sticky top-0 z-10 shadow-md" style={{ background: '#1a237e' }}>
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center gap-8">
        {/* BSNL brand mark */}
        <div className="flex items-center gap-2 shrink-0">
          <span
            className="text-xs font-bold leading-tight"
            style={{ color: '#f57c00', letterSpacing: '0.05em' }}
          >
            BSNL
          </span>
          <span className="text-white/40 text-lg font-thin">|</span>
          <span className="font-semibold text-sm text-white tracking-wide">M2M Dashboard</span>
        </div>

        <nav className="flex gap-1 ml-auto">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'px-3 py-1.5 rounded text-sm font-medium transition-colors',
                pathname === href || (href !== '/' && pathname.startsWith(href))
                  ? 'text-white'
                  : 'text-white/70 hover:text-white hover:bg-white/10'
              )}
              style={
                pathname === href || (href !== '/' && pathname.startsWith(href))
                  ? { background: '#f57c00' }
                  : {}
              }
            >
              {label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  )
}
