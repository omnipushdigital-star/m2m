import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export function getSupabaseServer() {
  const cookieStore = cookies()
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(toSet) {
          try { toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) }
          catch { /* Server Component — ignore */ }
        },
      },
    }
  )
}

export async function getSession() {
  const supabase = getSupabaseServer()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

export async function getRole(): Promise<'admin' | 'viewer' | null> {
  const session = await getSession()
  if (!session) return null
  return (session.user.user_metadata?.role as 'admin' | 'viewer') ?? 'viewer'
}
