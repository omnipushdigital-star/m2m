import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: NextRequest) {
  try {
    const { uploadMonth } = await req.json() as { uploadMonth: string }

    if (!uploadMonth) {
      return NextResponse.json({ error: 'Missing uploadMonth' }, { status: 400 })
    }

    const supabase = getSupabase()

    // Mark any SIM not seen in this upload as deleted (single SQL update, fast)
    const { data, error } = await supabase
      .from('sim_inventory')
      .update({ status: 'deleted', updated_at: new Date().toISOString() })
      .eq('status', 'active')
      .neq('last_seen_month', uploadMonth)
      .select('imsi')

    if (error) throw error

    return NextResponse.json({ deleted: data?.length ?? 0 })
  } catch (e) {
    console.error('SIM finalize error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
