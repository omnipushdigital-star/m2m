import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const { imsi, customerId, cafNo, customerNameRaw, saveMapping } = await req.json() as {
      imsi: string
      customerId: string
      cafNo?: string
      customerNameRaw?: string
      saveMapping?: boolean  // persist to customer_caf_mapping so future uploads auto-match
    }

    if (!imsi || !customerId) {
      return NextResponse.json({ error: 'Missing imsi or customerId' }, { status: 400 })
    }

    const supabase = getSupabase()

    // Update the SIM inventory record
    const { error: updateError } = await supabase
      .from('sim_inventory')
      .update({
        customer_id: customerId,
        match_status: 'matched',
        updated_at: new Date().toISOString(),
      })
      .eq('imsi', imsi)

    if (updateError) throw updateError

    // Optionally persist the CAF mapping so future uploads auto-match
    if (saveMapping && cafNo && customerNameRaw) {
      const { error: mappingError } = await supabase
        .from('customer_caf_mapping')
        .upsert(
          { caf_no: cafNo, customer_name_raw: customerNameRaw, customer_id: customerId },
          { onConflict: 'caf_no,customer_name_raw' }
        )
      if (mappingError) console.error('CAF mapping save error:', mappingError)
    }

    return NextResponse.json({ ok: true })
  } catch (e) {
    console.error('Resolve match error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
