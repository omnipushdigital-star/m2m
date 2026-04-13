import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function GET() {
  try {
    const supabase = getSupabase()

    const { data, error } = await supabase
      .from('sim_inventory')
      .select('imsi, caf_no, customer_name_raw, customer_id')
      .eq('match_status', 'pending')
      .eq('status', 'active')
      .order('customer_name_raw')
      .limit(500)

    if (error) throw error

    return NextResponse.json(data ?? [])
  } catch (e) {
    console.error('Pending matches error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
