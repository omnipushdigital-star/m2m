'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Users, FileBarChart2, Layers, TrendingUp, CheckCircle2 } from 'lucide-react'

const links = [
  { href: '/',          label: 'Dashboard', icon: LayoutDashboard },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/reports',   label: 'Reports',   icon: FileBarChart2 },
  { href: '/plans',     label: 'Plans',     icon: Layers },
  { href: '/funnel/stage1', label: 'Stage 1 — Pipeline', icon: TrendingUp },
  { href: '/funnel/stage4', label: 'Stage 4 — PO Closed', icon: CheckCircle2 },
]

export function Nav() {
  const pathname = usePathname()

  return (
    <aside
      className="w-56 flex-shrink-0 flex flex-col min-h-screen sticky top-0"
      style={{ background: '#f57c00' }}
    >
      {/* ── Logo block ── */}
      <div
        className="px-5 py-5 flex flex-col gap-0.5"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.25)' }}
      >
        {/* BSNL sun-burst icon (CSS only) */}
        <div className="flex items-center gap-2 mb-1">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
            style={{ background: '#1a237e' }}
          >
            <span className="text-white font-black text-xs tracking-tighter leading-none">
              BSNL
            </span>
          </div>
          <div className="leading-none">
            <p className="text-white font-black text-base tracking-widest leading-none">BSNL</p>
            <p className="text-white/70 text-[10px] tracking-wide leading-none mt-0.5">
              Bharat Sanchar Nigam
            </p>
          </div>
        </div>
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
                  ? 'bg-white text-[#f57c00] shadow-sm'
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
        <p className="text-white/60 text-[11px] font-medium">M2M / IoT SIM Inventory</p>
        <p className="text-white/40 text-[10px]">Billing &amp; Activation Tracker</p>
      </div>
    </aside>
  )
}
