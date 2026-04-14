import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export const runtime = 'nodejs'
export const maxDuration = 30

type CustomerSummary = {
  customer_name_raw: string
  customer_id:       string | null
  match_status:      'matched' | 'pending'
  total_sims:        number
  by_plan:           Record<string, number>
  by_apn:            Record<string, number>
  by_service_center: Record<string, number>
}

export async function POST(req: NextRequest) {
  try {
    const { summaries, uploadMonth } = await req.json() as {
      summaries:   CustomerSummary[]
      uploadMonth: string
    }

    if (!summaries?.length || !uploadMonth) {
      return NextResponse.json({ error: 'Missing summaries or uploadMonth' }, { status: 400 })
    }

    const supabase = getSupabase()

    // Fetch previous month summaries for change detection
    const d = new Date(`${uploadMonth}-01`)
    d.setMonth(d.getMonth() - 1)
    const prevMonth = d.toISOString().slice(0, 7)

    const { data: prevData } = await supabase
      .from('sim_customer_summary')
      .select('customer_name_raw, total_sims')
      .eq('upload_month', prevMonth)

    const prevMap = new Map((prevData ?? []).map(r => [r.customer_name_raw, r.total_sims as number]))

    // Upsert summaries
    const summaryRows = summaries.map(s => ({
      customer_name_raw:  s.customer_name_raw,
      customer_id:        s.customer_id,
      match_status:       s.match_status,
      upload_month:       uploadMonth,
      total_sims:         s.total_sims,
      by_plan:            s.by_plan,
      by_apn:             s.by_apn,
      by_service_center:  s.by_service_center,
      updated_at:         new Date().toISOString(),
    }))

    const { error: summaryError } = await supabase
      .from('sim_customer_summary')
      .upsert(summaryRows, { onConflict: 'customer_name_raw,upload_month' })

    if (summaryError) throw summaryError

    // Build change log rows
    const changeRows = summaries.map(s => {
      const prev = prevMap.get(s.customer_name_raw) ?? null
      return {
        upload_month:      uploadMonth,
        customer_name_raw: s.customer_name_raw,
        customer_id:       s.customer_id,
        total_sims:        s.total_sims,
        prev_total_sims:   prev,
        net_change:        prev !== null ? s.total_sims - prev : null,
        new_activations:   prev !== null ? Math.max(0, s.total_sims - prev) : s.total_sims,
        deactivations:     prev !== null ? Math.max(0, prev - s.total_sims) : 0,
        plan_changes:      0,  // net plan changes not detectable without per-IMSI storage
      }
    })

    const { error: changeError } = await supabase
      .from('sim_change_log')
      .upsert(changeRows, { onConflict: 'customer_name_raw,upload_month' })

    if (changeError) throw changeError

    const totalSims    = summaries.reduce((s, r) => s + r.total_sims, 0)
    const pendingCount = summaries.filter(s => s.match_status === 'pending').length

    return NextResponse.json({ ok: true, customers: summaries.length, totalSims, pending: pendingCount })
  } catch (e) {
    console.error('SIM summary upload error:', e)
    return NextResponse.json({ error: String(e) }, { status: 500 })
  }
}
