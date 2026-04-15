import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Nav, MobileNav } from '@/components/nav'
import { HeaderUser } from '@/components/header-user'
import { ChatWidget } from '@/components/chat-widget'
import { getSession, getRole } from '@/lib/supabase-server'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'M2M Inventory Dashboard',
  description: 'M2M SIM inventory and billing management',
  icons: {
    icon: '/bsnl-logo.png',
    apple: '/bsnl-logo.png',
  },
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession()
  const role    = await getRole()

  // Login page — plain full-screen layout, no nav/header
  if (!session) {
    return (
      <html lang="en">
        <body className={inter.className}>
          {children}
        </body>
      </html>
    )
  }

  return (
    <html lang="en">
      <body className={cn(inter.className, 'flex min-h-screen bg-[#f8f9fc]')}>

        {/* ── Sidebar ── */}
        <Nav isAdmin={role === 'admin'} />

        {/* ── Right panel ── */}
        <div className="flex flex-col flex-1 overflow-x-hidden">

          {/* ── Top header ── */}
          <header
            className="sticky top-0 z-10 h-14 flex items-center px-3 md:px-6 shadow-md shrink-0 gap-3"
            style={{ background: '#1565c0' }}
          >
            {/* Mobile hamburger */}
            <MobileNav isAdmin={role === 'admin'} />

            {/* Title */}
            <div className="flex flex-col leading-none min-w-0">
              <span className="text-white font-extrabold text-sm md:text-base tracking-wide leading-tight truncate">
                EB PLATINUM GURGAON
              </span>
              <span className="text-xs md:text-sm font-semibold tracking-widest mt-0.5" style={{ color: '#43a047' }}>
                CNTx- N
              </span>
            </div>

            <div className="ml-auto flex items-center gap-2 md:gap-4 shrink-0">
              <span
                className="hidden sm:inline-block px-3 py-1 rounded-full text-xs font-bold text-white whitespace-nowrap"
                style={{ background: '#f57c00' }}
              >
                BUSINESS ANALYTICS PORTAL
              </span>

              <HeaderUser
                email={session.user.email ?? ''}
                role={role ?? 'viewer'}
              />
            </div>
          </header>

          {/* ── Page content ── */}
          <main className="flex-1 px-3 md:px-6 py-4 md:py-6">{children}</main>

          {/* ── Footer ── */}
          <footer className="px-6 py-3 text-center text-xs text-slate-400 border-t border-slate-200">
            Developed by <span className="font-semibold text-slate-500">Naveen Saini</span>
            {' · '}NAM EB Platinum Unit Gurgaon
          </footer>
        </div>

        {/* ── AI Chat Widget (floating, visible on all pages) ── */}
        <ChatWidget />

      </body>
    </html>
  )
}

function cn(...classes: (string | false | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}
