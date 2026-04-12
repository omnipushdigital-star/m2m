'use client'

import { useRouter } from 'next/navigation'
import { getSupabaseBrowser } from '@/lib/supabase-browser'

export function HeaderUser({ email, role }: { email: string; role: string }) {
  const router = useRouter()

  async function handleLogout() {
    const supabase = getSupabaseBrowser()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <div className="flex items-center gap-2">
      {/* Email hidden on small screens, role badge always visible */}
      <div className="text-right leading-none hidden sm:block">
        <p className="text-white text-xs font-semibold truncate max-w-[140px]">{email}</p>
        <p className="text-xs mt-0.5 font-bold uppercase tracking-wide"
          style={{ color: role === 'admin' ? '#ffd54f' : '#a5d6a7' }}>
          ● {role === 'admin' ? 'Admin' : 'Viewer'}
        </p>
      </div>
      {/* Role dot on mobile */}
      <span className="sm:hidden text-xs font-bold uppercase tracking-wide"
        style={{ color: role === 'admin' ? '#ffd54f' : '#a5d6a7' }}>
        ● {role === 'admin' ? 'Admin' : 'Viewer'}
      </span>
      <button
        onClick={handleLogout}
        className="px-2 md:px-3 py-1 rounded-full text-xs font-bold transition-colors whitespace-nowrap"
        style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}
      >
        Sign Out
      </button>
    </div>
  )
}
