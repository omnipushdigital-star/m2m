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
    <div className="flex items-center gap-3">
      <div className="text-right leading-none">
        <p className="text-white text-xs font-semibold">{email}</p>
        <p className="text-xs mt-0.5 font-bold uppercase tracking-wide"
          style={{ color: role === 'admin' ? '#ffd54f' : '#a5d6a7' }}>
          {role === 'admin' ? '● Admin' : '● Viewer'}
        </p>
      </div>
      <button
        onClick={handleLogout}
        className="px-3 py-1 rounded-full text-xs font-bold transition-colors"
        style={{ background: 'rgba(255,255,255,0.15)', color: 'white' }}
      >
        Sign Out
      </button>
    </div>
  )
}
