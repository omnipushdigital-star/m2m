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

    // Mark any active SIM not seen in this upload as deleted
    const { data, error } = await supabase
      .from('sim_inventory')
      .update({
        status: 'deleted',
        deleted_month: uploadMonth,
        updated_at: new Date().toISOString(),
      })
      .eq('status', 'active')
      .neq('last_seen_month', uploadMonth)
      .select('imsi')

    if (error) throw error

    const deleted = data?.length ?? 0

    // Insert deactivation history records in batches
    if (deleted > 0 && data) {
      const historyRows = data.map(r => ({
        imsi: r.imsi,
        change_type: 'deactivated',
        change_month: uploadMonth,
      }))

      // Insert in batches of 500
      for (let i = 0; i < historyRows.length; i += 500) {
        await supabase.from('sim_history').insert(historyRows.slice(i, i + 500))
      }
    }

    return NextResponse.json({ deleted })
  } catch (e) {
    console.error('SIM finalize error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
