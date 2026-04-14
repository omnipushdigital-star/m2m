import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { customerNameRaw, customerId } = await req.json() as {
      customerNameRaw: string
      customerId:      string
    }

    if (!customerNameRaw || !customerId) {
      return NextResponse.json({ error: 'Missing customerNameRaw or customerId' }, { status: 400 })
    }

    const supabase = getSupabase()

    // Update all summary rows for this raw name to matched
    const { error } = await supabase
      .from('sim_customer_summary')
      .update({ customer_id: customerId, match_status: 'matched', updated_at: new Date().toISOString() })
      .eq('customer_name_raw', customerNameRaw)

    if (error) throw error

    // Also update change log
    await supabase
      .from('sim_change_log')
      .update({ customer_id: customerId })
      .eq('customer_name_raw', customerNameRaw)

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Resolve match error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
