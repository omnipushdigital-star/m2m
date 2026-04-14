'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard, Users, FileBarChart2, Layers, TrendingUp,
  CheckCircle2, ClipboardList, ChevronLeft, ChevronRight, Menu, X, Target, Wifi, BarChart3, UserCog,
} from 'lucide-react'

const links = [
  { href: '/',              label: 'Dashboard',           icon: LayoutDashboard, adminOnly: false },
  { href: '/kpi',           label: 'KPI Tracker',         icon: Target,          adminOnly: false },
  { href: '/customers',     label: 'Customers',           icon: Users,           adminOnly: false },
  { href: '/reports',       label: 'Reports',             icon: FileBarChart2,   adminOnly: false },
  { href: '/plans',         label: 'Plans',               icon: Layers,          adminOnly: false },
  { href: '/funnel/stage1', label: 'Stage 1 — Pipeline',  icon: TrendingUp,      adminOnly: false },
  { href: '/funnel/stage4', label: 'Stage 4 — PO Closed', icon: CheckCircle2,    adminOnly: false },
  { href: '/ltb',           label: 'Lead to Bill',        icon: ClipboardList,   adminOnly: false },
  { href: '/sim-inventory', label: 'SIM Analytics',       icon: BarChart3,       adminOnly: false },
  { href: '/sim-upload',    label: 'SIM Upload',          icon: Wifi,            adminOnly: true  },
  { href: '/nams',          label: 'NAM Registry',        icon: UserCog,         adminOnly: true  },
]

// ── Desktop collapsible sidebar ──────────────────────────────────────────────
export function Nav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname()
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    const stored = localStorage.getItem('nav-collapsed')
    if (stored === 'true') setCollapsed(true)
  }, [])

  function toggle() {
    const next = !collapsed
    setCollapsed(next)
    localStorage.setItem('nav-collapsed', String(next))
  }

  return (
    <aside
      className={cn(
        'hidden md:flex flex-shrink-0 flex-col min-h-screen sticky top-0 transition-all duration-200',
        collapsed ? 'w-14' : 'w-56'
      )}
      style={{ background: '#1565c0' }}
    >
      {/* Logo */}
      <div
        className="px-2 py-4 flex flex-col items-center overflow-hidden"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.25)' }}
      >
        <Image
          src="/bsnl-logo.png"
          alt="BSNL"
          width={collapsed ? 36 : 100}
          height={collapsed ? 36 : 100}
          className="object-contain transition-all duration-200"
          priority
        />
        {!collapsed && (
          <p className="text-white/80 text-[11px] tracking-wide mt-2 whitespace-nowrap font-medium">
            Bharat Sanchar Nigam
          </p>
        )}
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-2 py-4 space-y-1">
        {links.filter(l => !l.adminOnly || isAdmin).map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (href !== '/' && pathname.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              title={collapsed ? label : undefined}
              className={cn(
                'flex items-center gap-3 py-2.5 rounded-lg text-sm font-semibold transition-colors',
                collapsed ? 'justify-center px-2' : 'px-3',
                active ? 'bg-white text-[#1565c0] shadow-sm' : 'text-white hover:bg-white/20'
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {!collapsed && <span className="truncate">{label}</span>}
            </Link>
          )
        })}
      </nav>

      {/* Footer tag */}
      {!collapsed && (
        <div className="px-5 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.25)' }}>
          <p className="text-white/60 text-[11px] font-medium">BUSINESS ANALYTICS PORTAL</p>
          <p className="text-white/40 text-[10px]">Billing &amp; Activation Tracker</p>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={toggle}
        className="flex items-center justify-center py-3 text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        style={{ borderTop: '1px solid rgba(255,255,255,0.25)' }}
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
      </button>
    </aside>
  )
}

// ── Mobile hamburger + slide-in drawer ───────────────────────────────────────
export function MobileNav({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)

  // Close drawer on route change
  useEffect(() => { setOpen(false) }, [pathname])

  // Prevent body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      {/* Hamburger button — mobile only */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden flex items-center justify-center w-9 h-9 rounded-lg text-white hover:bg-white/20 transition-colors"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>

      {/* Overlay + drawer */}
      {open && (
        <div className="fixed inset-0 z-50 md:hidden">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          />

          {/* Drawer */}
          <aside
            className="absolute left-0 top-0 h-full w-72 flex flex-col shadow-2xl"
            style={{ background: '#1565c0' }}
          >
            {/* Header with logo + close */}
            <div
              className="px-4 py-4 flex items-center justify-between"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.25)' }}
            >
              <div className="flex items-center gap-3">
                <Image src="/bsnl-logo.png" alt="BSNL" width={40} height={40} className="object-contain" priority />
                <div>
                  <p className="text-white font-extrabold text-sm leading-tight">EB PLATINUM GURGAON</p>
                  <p className="text-white/60 text-[10px]">BUSINESS ANALYTICS PORTAL</p>
                </div>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="flex items-center justify-center w-8 h-8 rounded-lg text-white/70 hover:text-white hover:bg-white/20 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Nav items */}
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
              {links.filter(l => !l.adminOnly || isAdmin).map(({ href, label, icon: Icon }) => {
                const active = pathname === href || (href !== '/' && pathname.startsWith(href))
                return (
                  <Link
                    key={href}
                    href={href}
                    className={cn(
                      'flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-semibold transition-colors',
                      active ? 'bg-white text-[#1565c0] shadow-sm' : 'text-white hover:bg-white/20'
                    )}
                  >
                    <Icon className="w-5 h-5 shrink-0" />
                    {label}
                  </Link>
                )
              })}
            </nav>

            {/* Footer */}
            <div className="px-5 py-4" style={{ borderTop: '1px solid rgba(255,255,255,0.25)' }}>
              <p className="text-white/40 text-[10px]">Billing &amp; Activation Tracker</p>
            </div>
          </aside>
        </div>
      )}
    </>
  )
}
