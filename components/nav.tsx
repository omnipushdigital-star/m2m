'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Users, FileBarChart2, Layers, TrendingUp, CheckCircle2, ClipboardList } from 'lucide-react'

const links = [
  { href: '/',               label: 'Dashboard',           icon: LayoutDashboard },
  { href: '/customers',      label: 'Customers',           icon: Users },
  { href: '/reports',        label: 'Reports',             icon: FileBarChart2 },
  { href: '/plans',          label: 'Plans',               icon: Layers },
  { href: '/funnel/stage1',  label: 'Stage 1 — Pipeline',  icon: TrendingUp },
  { href: '/funnel/stage4',  label: 'Stage 4 — PO Closed', icon: CheckCircle2 },
  { href: '/ltb',            label: 'Lead to Bill',        icon: ClipboardList },
]

export function Nav() {
  const pathname = usePathname()

  return (
    <aside
      className="w-56 flex-shrink-0 flex flex-col min-h-screen sticky top-0"
      style={{ background: '#1565c0' }}
    >
      {/* ── Logo block ── */}
      <div
        className="px-4 py-4 flex flex-col items-center"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.25)' }}
      >
        <Image
          src="/bsnl-logo.png"
          alt="BSNL"
          width={96}
          height={96}
          className="object-contain"
          priority
        />
        <p className="text-white/80 text-[10px] tracking-wide mt-1">Bharat Sanchar Nigam</p>
      </div>

      {/* ── Navigation items ── */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {links.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-semibold transition-colors',
                active
                  ? 'bg-white text-[#1565c0] shadow-sm'
                  : 'text-white hover:bg-white/20'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* ── Footer tag ── */}
      <div
        className="px-5 py-3"
        style={{ borderTop: '1px solid rgba(255,255,255,0.25)' }}
      >
        <p className="text-white/60 text-[11px] font-medium">BUSINESS ANALYTICS PORTAL</p>
        <p className="text-white/40 text-[10px]">Billing &amp; Activation Tracker</p>
      </div>
    </aside>
  )
}
